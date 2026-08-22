/**
 * Next hands a page's `searchParams` back as `string | string[]`: a query key
 * that appears more than once arrives as an ARRAY.
 *
 * Typing a page's searchParams as `{ class?: string }` does not make that
 * untrue, it just stops the compiler from mentioning it — and the array then
 * flows into a Prisma `where` clause, where `{ classId: ["a", "b"] }` is a
 * validation error and a 500 response. `?class=a&class=b` in a hand-edited or
 * mis-concatenated URL was enough to do it, on the pages most likely to be
 * passed between staff as links.
 *
 * So every page that reads a query param types it as `string | string[]` and
 * funnels it through here. Taking the first value matches how a browser form
 * submission behaves and is what the caller meant in every case in this app.
 */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
