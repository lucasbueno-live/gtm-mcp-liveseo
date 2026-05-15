export interface PaginatedResult<T> {
  items: T[];
  page: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
}

export function paginateArray<T>(
  arr: T[],
  page: number,
  itemsPerPage: number,
): PaginatedResult<T> {
  const totalItems = arr.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * itemsPerPage;
  const items = arr.slice(start, start + itemsPerPage);
  return {
    items,
    page: safePage,
    itemsPerPage,
    totalItems,
    totalPages,
    hasNextPage: safePage < totalPages,
  };
}
