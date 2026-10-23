export function projectNumber(position: number) {
  return String(position + 1).padStart(2, "0");
}

export function normalizeProjectIndexes<T extends { index: string }>(projects: T[]): T[] {
  return projects.map((project, position) => ({ ...project, index: projectNumber(position) }));
}
