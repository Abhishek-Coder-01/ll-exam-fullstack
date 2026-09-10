export interface Pagination {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(pageInput?: string | number, limitInput?: string | number): Pagination {
  const pageValue = Number(pageInput ?? 1);
  const limitValue = Number(limitInput ?? 20);
  const page = Number.isFinite(pageValue) ? Math.max(1, Math.floor(pageValue)) : 1;
  const limit = Number.isFinite(limitValue) ? Math.min(100, Math.max(1, Math.floor(limitValue))) : 20;
  return { page, limit, skip: (page - 1) * limit };
}
