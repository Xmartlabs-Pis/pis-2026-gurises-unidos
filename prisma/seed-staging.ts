import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';
import { METRIC_DEFINITIONS } from '../src/lib/metrics/constants';
import { PROJECT_PLACEHOLDERS } from '../src/lib/projects/project-placeholders';
import { ADMIN, BENEFICIARY_CATEGORIES, STRATEGIC_LINES } from './fixtures';
import {
  formCategoryValuesWhere,
  SYSTEM_BENEFICIARY_KEYS,
  toBeneficiaryValuesCreate,
} from '../src/lib/project-display';

import { CounterpartyType } from '../src/generated/prisma/enums';

const prisma = new PrismaClient();

const DEPARTMENTS = [
  'Artigas',
  'Canelones',
  'Cerro Largo',
  'Colonia',
  'Durazno',
  'Flores',
  'Florida',
  'Lavalleja',
  'Maldonado',
  'Montevideo',
  'Paysandú',
  'Río Negro',
  'Rivera',
  'Rocha',
  'Salto',
  'San José',
  'Soriano',
  'Tacuarembó',
  'Treinta y Tres',
];

const COUNTERPARTY_TYPES = Object.values(CounterpartyType);

const TOPICS = ['Educación', 'Salud', 'Protección', 'Comunidad', 'Empleo'];

const COORDINATORS = [
  { firstName: 'Carlos', lastName: 'Pérez', documentId: '22222222', status: 'active' },
  { firstName: 'Diana', lastName: 'Gómez', documentId: '44444444', status: 'active' },
  { firstName: 'Elena', lastName: 'Fernández', documentId: '55555555', status: 'disabled' },
  {
    firstName: 'Federico',
    lastName: 'Martínez',
    documentId: '66666666',
    status: 'pendingInvitation',
  },
] as const;

const PROJECT_BASE_NAMES = [
  'Centro comunitario',
  'Apoyo a escuelas rurales',
  'Laboratorio de empleo juvenil',
  'Salud familiar en territorio',
  'Red de protección infantil',
];

const PROJECT_DEPARTMENTS = ['Montevideo', 'Canelones', 'Salto', 'Rivera', 'Maldonado'];

const STATUSES = ['active', 'inactive'] as const;
const INTENSITIES = ['high', 'medium', 'low'] as const;
const ZONES = ['city', 'inland', 'border', 'rural'] as const;

const LATEST_BENEFICIARY_YEAR = 2025;

const STAGING_ADMIN = { ...ADMIN, lastName: 'Rodríguez' };

function beneficiaryCounts(seed: number) {
  const at = (offset: number) => (seed * 7 + offset * 13) % 40;

  return {
    directChildrenAdolescents: 20 + at(1),
    indirectChildrenAdolescents: at(2),
    youth18To29: at(3),
    families: at(4),
    coordinatedInstitutions: at(5) % 8,
    communityLeaders: at(6) % 12,
    basicServiceStaff: at(7) % 10,
  };
}

async function main() {
  const seedPassword = process.env.SEED_USER_PASSWORD;
  if (!seedPassword) {
    throw new Error('SEED_USER_PASSWORD environment variable is required');
  }

  const passwordHash = await bcrypt.hash(seedPassword, 10);

  await prisma.$transaction(
    async (tx) => {
      await tx.beneficiaryCategory.createMany({
        data: BENEFICIARY_CATEGORIES,
        skipDuplicates: true,
      });

      const departments = new Map<string, number>();
      for (const name of DEPARTMENTS) {
        const department = await tx.department.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        departments.set(name, department.id);
      }

      const topicIds: number[] = [];
      for (const name of TOPICS) {
        const topic = await tx.topic.upsert({ where: { name }, update: {}, create: { name } });
        topicIds.push(topic.id);
      }

      for (const name of STRATEGIC_LINES) {
        await tx.strategicLine.upsert({ where: { name }, update: {}, create: { name } });
      }

      const admin = await tx.user.upsert({
        where: { documentId: STAGING_ADMIN.documentId },
        update: { ...STAGING_ADMIN, passwordHash, deletedAt: null },
        create: { ...STAGING_ADMIN, passwordHash },
      });

      const secondAdmin = {
        firstName: 'Bruno',
        lastName: 'Silva',
        documentId: '33333333',
        email: 'admin2@gurisesunidos.test',
        role: 'admin',
        status: 'pendingInvitation',
        passwordHash,
        createdBy: admin.id,
      } satisfies Prisma.UserUncheckedCreateInput;

      await tx.user.upsert({
        where: { documentId: secondAdmin.documentId },
        update: { ...secondAdmin, deletedAt: null },
        create: secondAdmin,
      });

      const coordinatorIds: number[] = [];
      for (const coordinator of COORDINATORS) {
        const data = {
          ...coordinator,
          email: `${coordinator.firstName.toLowerCase()}@gurisesunidos.test`,
          role: 'coordinator',
          passwordHash,
          createdBy: admin.id,
        } satisfies Prisma.UserUncheckedCreateInput;

        const user = await tx.user.upsert({
          where: { documentId: coordinator.documentId },
          update: { ...data, deletedAt: null },
          create: data,
        });
        coordinatorIds.push(user.id);
      }

      const projectFixtures = PROJECT_BASE_NAMES.flatMap((base) =>
        PROJECT_DEPARTMENTS.map((departmentName) => ({ base, departmentName }))
      );

      for (const [index, { base, departmentName }] of projectFixtures.entries()) {
        const name = `${base} - ${departmentName}`;
        const startYear = 2018 + (index % 8);

        const status = STATUSES[index % STATUSES.length];

        const data = {
          name,
          status,
          intensity: INTENSITIES[index % INTENSITIES.length],
          counterpartyType: COUNTERPARTY_TYPES[index % COUNTERPARTY_TYPES.length],
          startYear,
          endYear:
            status === 'inactive'
              ? Math.min(startYear + 1 + (index % 3), new Date().getFullYear())
              : null,
          leadCoordinatorId: coordinatorIds[index % coordinatorIds.length],
          zone: ZONES[index % ZONES.length],
          cities: [`Ciudad ${index + 1}`],
          neighborhoods: index % 3 === 1 ? [`Barrio ${index + 1}`] : [],
          generalObjective: null,
          publicDescription: null,
          coverPhoto: PROJECT_PLACEHOLDERS[index % PROJECT_PLACEHOLDERS.length],
          internalNotes: null,
          createdBy: admin.id,
        };

        const existing = await tx.project.findFirst({
          where: { name, startYear, deletedAt: null },
          select: { id: true },
        });
        const projectDepartments = [{ id: departments.get(departmentName)! }];
        const topics = [topicIds[index % topicIds.length]];
        if (index % 4 === 0) topics.push(topicIds[(index + 1) % topicIds.length]);
        const topicRefs = topics.map((id) => ({ id }));
        const project = existing
          ? await tx.project.update({
              where: { id: existing.id },
              data: {
                ...data,
                departments: { set: projectDepartments },
                topics: { set: topicRefs },
              },
            })
          : await tx.project.create({
              data: {
                ...data,
                departments: { connect: projectDepartments },
                topics: { connect: topicRefs },
              },
            });

        const yearCount = index % 7 === 0 ? 0 : 1 + (index % 4);

        for (let offset = 0; offset < yearCount; offset += 1) {
          const year = LATEST_BENEFICIARY_YEAR - offset;
          const values = toBeneficiaryValuesCreate(beneficiaryCounts(index + offset));

          await tx.projectBeneficiaryValue.deleteMany({
            where: formCategoryValuesWhere(project.id, year, SYSTEM_BENEFICIARY_KEYS),
          });
          await tx.projectBeneficiary.upsert({
            where: { projectId_year: { projectId: project.id, year } },
            update: { authorId: coordinatorIds[0], values: { create: values } },
            create: {
              projectId: project.id,
              year,
              authorId: coordinatorIds[0],
              values: { create: values },
            },
          });
        }
      }

      for (const [index, metric] of METRIC_DEFINITIONS.entries()) {
        await tx.metric.upsert({
          where: { key: metric.key },
          update: {},
          create: {
            key: metric.key,
            name: metric.name,
            showPublicly: metric.showPublicly,
            showPubliclyDraft: metric.showPublicly,
            sortOrder: index + 1,
            updatedBy: admin.id,
          },
        });
      }
    },
    { maxWait: 20_000, timeout: 120_000 }
  );

  console.log('Staging seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
