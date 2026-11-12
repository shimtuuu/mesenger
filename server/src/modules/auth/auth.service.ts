import prisma from '../../config/database';
import { hashPassword, comparePassword } from '../../utils/hash';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { AppError } from '../../middleware/errorHandler';
import { RegisterInput } from './auth.validation';
import { createAuditLog } from '../../services/audit.service';

export class AuthService {
  static async register(data: RegisterInput, ipAddress?: string) {
    const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingEmail) {
      throw new AppError('Email already in use', 400);
    }

    const existingUsername = await prisma.user.findUnique({ where: { username: data.username } });
    if (existingUsername) {
      throw new AppError('Username already taken', 400);
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash,
        displayName: data.displayName,
      },
    });

    // Auto-join #general room
    const generalRoom = await prisma.room.findUnique({ where: { name: 'general' } });
    if (generalRoom) {
      await prisma.roomMember.create({
        data: {
          userId: user.id,
          roomId: generalRoom.id,
          role: 'member',
        },
      });
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Save refresh token with 7-day expiry
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    await createAuditLog(user.id, 'user.register', 'user', user.id, undefined, ipAddress);
    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  static async login(email: string, password: string, ipAddress?: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!user.isActive) {
      throw new AppError('Account is deactivated', 403);
    }

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Update presence to online
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { presence: 'online', lastSeenAt: new Date() },
    });

    const { passwordHash: _, ...userWithoutPassword } = updatedUser;
    await createAuditLog(user.id, 'user.login', 'user', user.id, undefined, ipAddress);
    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  static async refresh(token: string) {
    // Verify JWT signature
    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new AppError('Invalid refresh token', 401);
    }

    // Check token exists in DB
    const storedToken = await prisma.refreshToken.findUnique({ where: { token } });
    if (!storedToken) {
      throw new AppError('Refresh token not found', 401);
    }

    // Check expiry
    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new AppError('Refresh token expired', 401);
    }

    // Delete old token
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      throw new AppError('User not found or deactivated', 401);
    }

    // Generate new pair
    const accessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  static async logout(token?: string) {
    if (!token) return;
    await prisma.refreshToken.deleteMany({ where: { token } });
  }
}
