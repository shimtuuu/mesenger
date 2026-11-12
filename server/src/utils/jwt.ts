import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config';

interface AccessTokenPayload {
  userId: string;
  role: string;
}

interface RefreshTokenPayload {
  userId: string;
  type: 'refresh';
  jti?: string;
}

export function generateAccessToken(userId: string, role: string): string {
  return jwt.sign({ userId, role } as AccessTokenPayload, config.jwtAccessSecret, {
    expiresIn: config.jwtAccessExpiry as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh', jti: crypto.randomUUID() } as RefreshTokenPayload,
    config.jwtRefreshSecret,
    {
      expiresIn: config.jwtRefreshExpiry as jwt.SignOptions['expiresIn'],
      algorithm: 'HS256',
    }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwtAccessSecret, { algorithms: ['HS256'] }) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.jwtRefreshSecret, { algorithms: ['HS256'] }) as RefreshTokenPayload;
}
