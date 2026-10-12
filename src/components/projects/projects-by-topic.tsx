import { getPublicProjectsPage } from '@/lib/projects/public-projects';
import { TopicCarousel } from '@/components/projects/topic-carousel';
import { listProjectFilterOptions } from '@/lib/projects/list';

export async function ProjectsByTopic({ year }: { year: number }) {
  const { topics } = await listProjectFilterOptions();
  const topicPages = await Promise.all(
    topics.map(async (topic) => ({
      topic,
      page: await getPublicProjectsPage(year, topic.id, '1'),
    }))
  );

  return topicPages
    .filter(({ page }) => page.items.length > 0)
    .map(({ topic, page }) => (
      <TopicCarousel
        key={topic.id}
        year={year}
        topicId={topic.id}
        topic={topic.name}
        initialPage={page}
      />
    ));
}
