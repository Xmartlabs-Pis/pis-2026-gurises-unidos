'use server';

import { getPublicProjectsPage, type PublicProjectsPage } from '@/lib/projects/public-projects';
import { parseId } from '@/lib/validation/ids';

const EMPTY_PAGE: PublicProjectsPage = { items: [], page: 1, hasMore: false };

export async function loadPublicProjectsPage(year: number, topicId: number, page: number) {
  const validYear = parseId(year);
  const validTopicId = parseId(topicId);
  const validPage = parseId(page);
  if (validYear === null || validTopicId === null || validPage === null) return EMPTY_PAGE;

  return getPublicProjectsPage(validYear, validTopicId, validPage);
}
