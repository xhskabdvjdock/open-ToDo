import { taskQuerySchema, type TaskQuery } from "./validations";

type RawParams = Record<string, string | string[] | undefined>;

/** Validate URL search params into a TaskQuery (server-side, safe defaults). */
export function parseTaskQuery(params: RawParams, defaults?: Partial<TaskQuery>): TaskQuery {
  const pick = (key: string): string | undefined => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const parsed = taskQuerySchema.safeParse({
    q: pick("q") ?? defaults?.q ?? "",
    status: pick("status") ?? defaults?.status ?? "ALL",
    priority: pick("priority") ?? defaults?.priority ?? "ALL",
    projectId: pick("projectId") ?? defaults?.projectId ?? "ALL",
    tagId: pick("tagId") ?? defaults?.tagId ?? "ALL",
    due: pick("due") ?? defaults?.due ?? "ALL",
    sort: pick("sort") ?? defaults?.sort ?? "MANUAL",
    direction: pick("direction") ?? defaults?.direction ?? "ASC",
  });
  if (!parsed.success) {
    return taskQuerySchema.parse({});
  }
  return parsed.data;
}
