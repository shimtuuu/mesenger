import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@corp.com' },
    update: {},
    create: {
      email: 'admin@corp.com',
      username: 'admin',
      passwordHash,
      displayName: 'Administrator',
      role: 'admin',
      presence: 'offline',
      isActive: true,
    },
  });

  const generalRoom = await prisma.room.upsert({
    where: { name: 'general' },
    update: {},
    create: {
      name: 'general',
      description: 'Общий канал компании',
      type: 'public',
      createdById: admin.id,
    },
  });

  await prisma.roomMember.upsert({
    where: {
      userId_roomId: {
        userId: admin.id,
        roomId: generalRoom.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roomId: generalRoom.id,
      role: 'admin',
    },
  });

  console.log('Database seeded successfully:', {
    adminEmail: admin.email,
    roomName: generalRoom.name,
  });
}

main()
  .catch((err) => {
    console.error('Error seeding database:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
