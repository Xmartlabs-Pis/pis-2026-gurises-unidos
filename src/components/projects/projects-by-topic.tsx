import { getPublicTopics } from '@/lib/projects/public-projects';
import { TopicCarousel } from '@/components/projects/topic-carousel';

export async function ProjectsByTopic({ year }: { year: number }) {
  const topics = await getPublicTopics(year);

  return topics.map((topic) => (
    <TopicCarousel
      key={topic.id}
      year={year}
      topicId={topic.id}
      topic={topic.name}
      total={topic.total}
      initialPage={topic.initialPage}
    />
  ));
}
