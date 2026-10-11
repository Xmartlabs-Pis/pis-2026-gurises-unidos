import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';
import { METRIC_DEFINITIONS } from '../src/lib/metrics/constants';
import { PROJECT_PLACEHOLDERS } from '../src/lib/projects/project-placeholders';
import {
  formCategoryValuesWhere,
  SYSTEM_BENEFICIARY_KEYS,
  toBeneficiaryValuesCreate,
  type BeneficiaryCounts,
} from '../src/lib/project-display';
import { ADMIN, BENEFICIARY_CATEGORIES, STRATEGIC_LINES } from './fixtures';
import { CounterpartyType } from '../src/generated/prisma/enums';

const prisma = new PrismaClient();

const REFERENCE_YEAR = 2025;

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

const TOPICS = ['Education', 'Health', 'Protection', 'Community'];

type BeneficiaryRecord = { year: number } & Partial<BeneficiaryCounts>;

type SeedProject = {
  name: string;
  status: 'active' | 'closed';
  intensity: 'high' | 'medium' | 'low';
  startYear: number;
  endYear?: number;
  department: string;
  topic: string;
  zone: 'city' | 'inland' | 'rural';
  localityNeighborhood: string;
  publicDescription: string;
  beneficiaries: BeneficiaryRecord[];
};

const SEED_PROJECTS: SeedProject[] = [
  {
    name: 'Playground',
    status: 'active',
    intensity: 'high',
    startYear: 2022,
    department: 'Montevideo',
    topic: 'Community',
    zone: 'city',
    localityNeighborhood: 'Cerro Norte',
    publicDescription:
      'Espacios lúdicos seguros para el desarrollo integral de niños y niñas en zonas vulnerables.',
    beneficiaries: [
      {
        year: 2024,
        directChildrenAdolescents: 420,
        indirectChildrenAdolescents: 300,
        families: 150,
        communityLeaders: 8,
      },
      {
        year: 2025,
        directChildrenAdolescents: 610,
        indirectChildrenAdolescents: 420,
        families: 210,
        communityLeaders: 12,
      },
      {
        year: 2026,
        directChildrenAdolescents: 380,
        indirectChildrenAdolescents: 250,
        families: 130,
        communityLeaders: 9,
      },
    ],
  },
  {
    name: 'Apoyo Escolar',
    status: 'active',
    intensity: 'medium',
    startYear: 2023,
    department: 'Canelones',
    topic: 'Education',
    zone: 'inland',
    localityNeighborhood: 'Las Piedras',
    publicDescription:
      'Acompañamiento educativo para fortalecer el vínculo con la escuela y mejorar trayectorias.',
    beneficiaries: [
      {
        year: 2024,
        directChildrenAdolescents: 260,
        families: 90,
        coordinatedInstitutions: 6,
        basicServiceStaff: 18,
      },
      {
        year: 2025,
        directChildrenAdolescents: 340,
        families: 120,
        coordinatedInstitutions: 9,
        basicServiceStaff: 25,
      },
      {
        year: 2026,
        directChildrenAdolescents: 210,
        families: 80,
        coordinatedInstitutions: 7,
        basicServiceStaff: 20,
      },
    ],
  },
  {
    name: 'Arte Joven',
    status: 'active',
    intensity: 'low',
    startYear: 2024,
    department: 'Montevideo',
    topic: 'Education',
    zone: 'city',
    localityNeighborhood: 'Casavalle',
    publicDescription:
      'Talleres de expresión artística que fortalecen identidad y habilidades socioemocionales.',
    beneficiaries: [
      { year: 2024, directChildrenAdolescents: 90, youth18To29: 40, families: 30 },
      {
        year: 2025,
        directChildrenAdolescents: 140,
        youth18To29: 75,
        families: 55,
        communityLeaders: 4,
      },
      {
        year: 2026,
        directChildrenAdolescents: 110,
        youth18To29: 60,
        families: 40,
        communityLeaders: 3,
      },
    ],
  },
  {
    name: 'Salud en Territorio',
    status: 'active',
    intensity: 'high',
    startYear: 2023,
    department: 'Salto',
    topic: 'Health',
    zone: 'inland',
    localityNeighborhood: 'Barrio Artigas',
    publicDescription:
      'Promoción de la salud integral con equipos barriales y centros de salud de referencia.',
    beneficiaries: [
      {
        year: 2025,
        directChildrenAdolescents: 280,
        indirectChildrenAdolescents: 190,
        families: 140,
        coordinatedInstitutions: 5,
        basicServiceStaff: 22,
      },
      {
        year: 2026,
        directChildrenAdolescents: 240,
        indirectChildrenAdolescents: 160,
        families: 115,
        coordinatedInstitutions: 4,
        basicServiceStaff: 18,
      },
    ],
  },
  {
    name: 'Red de Cuidados',
    status: 'active',
    intensity: 'medium',
    startYear: 2024,
    department: 'Maldonado',
    topic: 'Protection',
    zone: 'city',
    localityNeighborhood: 'Maldonado Nuevo',
    publicDescription:
      'Fortalecimiento de entornos protectores con familias, escuelas e instituciones locales.',
    beneficiaries: [
      {
        year: 2025,
        directChildrenAdolescents: 190,
        indirectChildrenAdolescents: 120,
        families: 95,
        coordinatedInstitutions: 8,
        communityLeaders: 6,
      },
    ],
  },
  {
    name: 'Jóvenes al Frente',
    status: 'active',
    intensity: 'medium',
    startYear: 2025,
    department: 'Paysandú',
    topic: 'Community',
    zone: 'city',
    localityNeighborhood: 'Barrio Obrero',
    publicDescription:
      'Liderazgo juvenil y participación comunitaria a través de proyectos impulsados por jóvenes.',
    beneficiaries: [
      {
        year: 2025,
        directChildrenAdolescents: 120,
        youth18To29: 85,
        families: 40,
        communityLeaders: 10,
      },
    ],
  },
  {
    name: 'Escuela Abierta',
    status: 'active',
    intensity: 'low',
    startYear: 2023,
    department: 'Rivera',
    topic: 'Education',
    zone: 'rural',
    localityNeighborhood: 'Paraje Cerros Blancos',
    publicDescription:
      'Propuestas educativas en escuelas rurales para reducir la desvinculación escolar.',
    beneficiaries: [
      {
        year: 2024,
        directChildrenAdolescents: 75,
        families: 35,
        basicServiceStaff: 9,
      },
      {
        year: 2025,
        directChildrenAdolescents: 60,
        families: 28,
        basicServiceStaff: 7,
      },
    ],
  },
  {
    name: 'Nutrición Comunitaria',
    status: 'active',
    intensity: 'medium',
    startYear: 2022,
    department: 'Tacuarembó',
    topic: 'Health',
    zone: 'inland',
    localityNeighborhood: 'Barrio Ferrocarril',
    publicDescription:
      'Huertas y espacios de alimentación saludable con participación de familias del barrio.',
    beneficiaries: [
      { year: 2024, directChildrenAdolescents: 110, families: 70, communityLeaders: 5 },
    ],
  },
  {
    name: 'Primera Infancia',
    status: 'active',
    intensity: 'high',
    startYear: 2024,
    department: 'Colonia',
    topic: 'Protection',
    zone: 'city',
    localityNeighborhood: 'Barrio Sur',
    publicDescription:
      'Acompañamiento a familias con niños y niñas de 0 a 3 años en situación de vulnerabilidad.',
    beneficiaries: [],
  },
  {
    name: 'Mirada Joven',
    status: 'closed',
    intensity: 'low',
    startYear: 2021,
    endYear: 2023,
    department: 'Montevideo',
    topic: 'Education',
    zone: 'city',
    localityNeighborhood: 'Malvín Norte',
    publicDescription:
      'Talleres de comunicación audiovisual para adolescentes, finalizados en 2023.',
    beneficiaries: [
      { year: 2022, directChildrenAdolescents: 130, youth18To29: 45, families: 25 },
      { year: 2023, directChildrenAdolescents: 100, youth18To29: 30, families: 20 },
    ],
  },
  {
    name: 'Puentes Rurales',
    status: 'closed',
    intensity: 'medium',
    startYear: 2020,
    endYear: 2024,
    department: 'Tacuarembó',
    topic: 'Community',
    zone: 'rural',
    localityNeighborhood: 'Paso de los Toros',
    publicDescription:
      'Articulación de instituciones y referentes comunitarios en zonas rurales aisladas.',
    beneficiaries: [
      {
        year: 2023,
        directChildrenAdolescents: 85,
        families: 50,
        coordinatedInstitutions: 6,
        communityLeaders: 7,
      },
      {
        year: 2024,
        directChildrenAdolescents: 70,
        families: 42,
        coordinatedInstitutions: 5,
        communityLeaders: 6,
      },
    ],
  },
  {
    name: 'Semillero Deportivo',
    status: 'closed',
    intensity: 'low',
    startYear: 2022,
    endYear: 2025,
    department: 'Canelones',
    topic: 'Health',
    zone: 'inland',
    localityNeighborhood: 'Barros Blancos',
    publicDescription:
      'Actividad física y deporte comunitario como herramienta de inclusión para adolescentes.',
    beneficiaries: [
      { year: 2024, directChildrenAdolescents: 160, families: 60, communityLeaders: 4 },
      { year: 2025, directChildrenAdolescents: 145, families: 52, communityLeaders: 4 },
    ],
  },
];

type ProjectFixture = Required<
  Omit<
    Prisma.ProjectUncheckedCreateInput,
    | 'id'
    | 'createdAt'
    | 'updatedAt'
    | 'projectCoordinators'
    | 'projectBeneficiaries'
    | 'strategicLines'
  >
>;

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

      const departmentIds = new Map<string, number>();
      for (const name of DEPARTMENTS) {
        const department = await tx.department.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        departmentIds.set(name, department.id);
      }

      const topicIds = new Map<string, number>();
      for (const name of TOPICS) {
        const topic = await tx.topic.upsert({ where: { name }, update: {}, create: { name } });
        topicIds.set(name, topic.id);
      }

      for (const name of STRATEGIC_LINES) {
        await tx.strategicLine.upsert({ where: { name }, update: {}, create: { name } });
      }

      const admin = await tx.user.upsert({
        where: { documentId: ADMIN.documentId },
        update: { passwordHash },
        create: { ...ADMIN, passwordHash },
      });

      await tx.user.upsert({
        where: { documentId: '33333333' },
        update: { passwordHash },
        create: {
          firstName: 'Bruno',
          lastName: 'Admin',
          documentId: '33333333',
          email: 'admin2@gurisesunidos.test',
          role: 'admin',
          status: 'active',
          passwordHash,
          createdBy: admin.id,
        },
      });

      const coordinator = await tx.user.upsert({
        where: { documentId: '22222222' },
        update: { passwordHash },
        create: {
          firstName: 'Carlos',
          lastName: 'Coordinator',
          documentId: '22222222',
          email: 'coordinator@gurisesunidos.test',
          role: 'coordinator',
          status: 'active',
          passwordHash,
          createdBy: admin.id,
        },
      });

      await tx.user.upsert({
        where: { documentId: '44444444' },
        update: { passwordHash },
        create: {
          firstName: 'Diana',
          lastName: 'Coordinator',
          documentId: '44444444',
          email: 'coordinator2@gurisesunidos.test',
          role: 'coordinator',
          status: 'disabled',
          passwordHash,
          createdBy: admin.id,
        },
      });

      for (const [index, project] of SEED_PROJECTS.entries()) {
        const { department, topic, beneficiaries, endYear, ...fields } = project;
        const fixture: ProjectFixture = {
          ...fields,
          counterpartyType: COUNTERPARTY_TYPES[index % COUNTERPARTY_TYPES.length],
          endYear: endYear ?? null,
          leadCoordinatorId: coordinator.id,
          departmentId: departmentIds.get(department)!,
          topicId: topicIds.get(topic)!,
          generalObjective: null,
          coverPhoto: PROJECT_PLACEHOLDERS[index % PROJECT_PLACEHOLDERS.length],
          internalNotes: null,
          createdBy: admin.id,
          deletedAt: null,
          deletedBy: null,
        };

        const existing = await tx.project.findFirst({
          where: { name: fixture.name, startYear: fixture.startYear, deletedAt: null },
          select: { id: true },
        });
        const saved = existing
          ? await tx.project.update({ where: { id: existing.id }, data: fixture })
          : await tx.project.create({ data: fixture });

        for (const { year, ...counts } of beneficiaries) {
          await tx.projectBeneficiaryValue.deleteMany({
            where: formCategoryValuesWhere(saved.id, year, SYSTEM_BENEFICIARY_KEYS),
          });
          await tx.projectBeneficiary.upsert({
            where: { projectId_year: { projectId: saved.id, year } },
            update: {
              authorId: coordinator.id,
              values: { create: toBeneficiaryValuesCreate(counts) },
            },
            create: {
              projectId: saved.id,
              year,
              authorId: coordinator.id,
              values: { create: toBeneficiaryValuesCreate(counts) },
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

      await tx.publicSettings.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, referenceYear: REFERENCE_YEAR, updatedBy: admin.id },
      });
    },
    { maxWait: 10_000, timeout: 30_000 }
  );

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
