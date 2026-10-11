import { getPublicProjectsPage } from '@/lib/projects/public-projects';
import { TopicCarousel } from '@/components/projects/public-topic-list';
import { listProjectFilterOptions } from '@/lib/projects/list';

export async function TopicCarousels({ year }: { year: number }) {
  const { topics } = await listProjectFilterOptions();
  const topicPages = await Promise.all(
    topics.map(async (topic) => ({
      topic,
      page: await getPublicProjectsPage(year, '1', topic.id),
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
