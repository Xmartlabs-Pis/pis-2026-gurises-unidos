import { beforeEach, describe, expect, it, vi } from 'vitest';
import prisma from '@/lib/prisma';
import { getProjectHistory } from '@/lib/projects/history';

vi.mock('@/lib/prisma', () => ({
  default: {
    projectBeneficiary: { findMany: vi.fn() },
    auditLog: { findMany: vi.fn() },
  },
}));

function auditLogWhere() {
  return vi.mocked(prisma.auditLog.findMany).mock.calls[0][0]?.where;
}

describe('getProjectHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);
  });

  it('uses the given beneficiary ids without querying them again', async () => {
    await getProjectHistory(42, [7, 8]);

    expect(prisma.projectBeneficiary.findMany).not.toHaveBeenCalled();
    expect(auditLogWhere()).toEqual({
      OR: [
        { entity: 'project', entityId: 42 },
        { entity: 'beneficiary', entityId: { in: [7, 8] } },
      ],
    });
  });

  it('looks up the beneficiary ids of the project when they are not given', async () => {
    vi.mocked(prisma.projectBeneficiary.findMany).mockResolvedValue([
      { id: 3 },
      { id: 5 },
    ] as Awaited<ReturnType<typeof prisma.projectBeneficiary.findMany>>);

    await getProjectHistory(42);

    expect(prisma.projectBeneficiary.findMany).toHaveBeenCalledWith({
      where: { projectId: 42 },
      select: { id: true },
    });
    expect(auditLogWhere()).toEqual({
      OR: [
        { entity: 'project', entityId: 42 },
        { entity: 'beneficiary', entityId: { in: [3, 5] } },
      ],
    });
  });
});
