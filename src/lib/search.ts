const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Free-text search term from the query string: collapsed whitespace, capped length. */
export function searchTerm(raw: string | string[] | undefined): string {
  return (first(raw) ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
}

/** ILIKE pattern that matches `term` literally: LIKE wildcards in user input are escaped. */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}
