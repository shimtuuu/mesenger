interface CursorData {
  id: string;
  createdAt: string;
}

export function parseCursor(cursor?: string): CursorData | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const data = JSON.parse(decoded) as CursorData;
    if (typeof data.id === 'string' && typeof data.createdAt === 'string') {
      const parsedDate = new Date(data.createdAt);
      if (!Number.isNaN(parsedDate.getTime())) {
        return data;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function createCursorFromMessage(message: { id: string; createdAt: Date }): string {
  return Buffer.from(
    JSON.stringify({ id: message.id, createdAt: message.createdAt.toISOString() })
  ).toString('base64');
}

export function getCursorPaginationArgs(cursor?: string, limit: number = 50) {
  const cursorData = parseCursor(cursor);

  const orderBy = [{ createdAt: 'desc' as const }, { id: 'desc' as const }];

  if (!cursorData) {
    return { where: {}, orderBy, take: limit };
  }

  const cursorDate = new Date(cursorData.createdAt);

  return {
    where: {
      OR: [
        { createdAt: { lt: cursorDate } },
        {
          createdAt: cursorDate,
          id: { lt: cursorData.id },
        },
      ],
    },
    orderBy,
    take: limit,
  };
}
