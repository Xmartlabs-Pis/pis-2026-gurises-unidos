import { getPublicTopics } from '@/lib/projects/public-projects';
import { TopicCarousel } from '@/components/projects/topic-carousel';

export async function ProjectsByTopic({ year }: { year: number }) {
  const topics = await getPublicTopics(year);

  if (topics.length === 0) {
    return (
      <p className="text-muted-foreground py-12 text-center">
        No hay proyectos publicados para {year}.
      </p>
    );
  }

  return topics.map((topic) => (
    <section
      key={`${year}-${topic.id}`}
      id={`topic-${topic.id}`}
      aria-label={topic.name}
      className="min-w-0 scroll-mt-20"
    >
      <TopicCarousel
        year={year}
        topicId={topic.id}
        topic={topic.name}
        total={topic.total}
        initialPage={topic.initialPage}
      />
    </section>
  ));
}
