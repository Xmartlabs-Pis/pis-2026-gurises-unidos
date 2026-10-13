export function getVisibleTopics<T extends { showPublicly: boolean; projectCount: number }>(
  topics: T[]
) {
  return topics
    .filter((topic) => topic.showPublicly && topic.projectCount > 0)
    .sort((first, second) => second.projectCount - first.projectCount);
}
