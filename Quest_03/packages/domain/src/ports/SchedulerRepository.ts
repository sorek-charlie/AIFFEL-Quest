/** All mutations must serialize under one owner scheduling transaction. */
export interface SchedulerRepository {
  transaction<T>(operation: () => T): T;
  getOwner(id: string): unknown;
  list(owner: string, kind: 'task' | 'event' | 'booking' | 'project'): unknown[];
  get(owner: string, kind: string, id: string): unknown;
  save(owner: string, kind: string, entity: unknown): void;
  remove(owner: string, kind: string, id: string): void;
}
