import prisma from '../config/database';

export async function createAuditLog(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : '{}',
      ipAddress: ipAddress || null,
    },
  });
}
