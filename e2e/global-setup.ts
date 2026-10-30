import { execSync } from 'node:child_process';

export default function seedE2eDatabase() {
  execSync('npx tsx prisma/seed-e2e.ts', { stdio: 'inherit' });
}
