export interface HistoryViewStateInput {
  hasData: boolean;
  eventCount: number;
  hasNextPage: boolean;
  isError: boolean;
  isFetchNextPageError: boolean;
}

export type HistoryViewState =
  /** First load failed and there is nothing cached to show. */
  | 'error'
  /** Confirmed (successfully fetched) empty history. */
  | 'empty'
  /**
   * Cached rows (possibly none) are shown, but the latest refresh failed.
   * Empty cached data in this state is NOT confirmed empty.
   */
  | 'stale'
  | 'list';

/**
 * Decides how to present the history query. A failed background refresh must
 * keep cached rows visible with an error + Retry, and must never degrade a
 * cached empty result into "No transactions found".
 */
export function getHistoryViewState({
  hasData,
  eventCount,
  hasNextPage,
  isError,
  isFetchNextPageError
}: HistoryViewStateInput): HistoryViewState {
  const refreshFailed = isError && !isFetchNextPageError;

  if (refreshFailed && !hasData) return 'error';
  if (refreshFailed) return 'stale';
  if (hasData && eventCount === 0 && !hasNextPage) return 'empty';
  return 'list';
}
