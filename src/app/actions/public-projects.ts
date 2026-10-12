'use server';

import { getPublicProjectsPage } from '@/lib/projects/public-projects';

export async function loadPublicProjectsPage(year: number, topicId: number, page: number) {
  return getPublicProjectsPage(year, topicId, String(page));
}
