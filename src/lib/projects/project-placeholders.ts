export const PROJECT_PLACEHOLDERS = [
  '/images/project-placeholders/1.webp',
  '/images/project-placeholders/2.webp',
  '/images/project-placeholders/3.webp',
  '/images/project-placeholders/4.webp',
  '/images/project-placeholders/5.webp',
  '/images/project-placeholders/6.webp',
] as const;

export type ProjectPlaceholder = (typeof PROJECT_PLACEHOLDERS)[number];

export function isProjectPlaceholder(value: unknown): value is ProjectPlaceholder {
  return PROJECT_PLACEHOLDERS.some((placeholder) => placeholder === value);
}

export function getRandomProjectPlaceholder(): ProjectPlaceholder {
  return PROJECT_PLACEHOLDERS[Math.floor(Math.random() * PROJECT_PLACEHOLDERS.length)];
}
