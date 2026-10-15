import prisma from '@/lib/prisma';
import { sumBeneficiaries, type BeneficiaryCounts } from '@/lib/project-display';
import { BENEFICIARY_VALUES_SELECT, toBeneficiaryCounts } from '@/lib/projects/beneficiary-values';

export async function getDepartmentBeneficiaries(year: number) {
  const records = await prisma.projectBeneficiary.findMany({
    where: { year },
    select: {
      ...BENEFICIARY_VALUES_SELECT,
      project: { select: { departments: { select: { name: true } } } },
    },
  });

  const totalsByDepartment = new Map<string, BeneficiaryCounts>();
  for (const { values, project } of records) {
    const counts = toBeneficiaryCounts(values);
    for (const { name: department } of project.departments) {
      const totals = totalsByDepartment.get(department) ?? toBeneficiaryCounts([]);
      for (const [key, value] of Object.entries(counts)) totals[key] = (totals[key] ?? 0) + value;
      totalsByDepartment.set(department, totals);
    }
  }

  return [...totalsByDepartment]
    .sort(([, a], [, b]) => sumBeneficiaries(b) - sumBeneficiaries(a))
    .map(([department, totals]) => ({ department, ...totals }));
}
