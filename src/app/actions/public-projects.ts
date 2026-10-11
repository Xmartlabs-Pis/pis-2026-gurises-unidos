'use server';

import { getPublicProjectsPage } from '@/lib/projects/public-projects';

export async function loadPublicProjectsPage(year: number, topicId: number, page: number) {
  return getPublicProjectsPage(year, String(page), topicId);
}
