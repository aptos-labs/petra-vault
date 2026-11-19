import { describe, expect, it } from 'vitest';
import {
  getHistoryViewState,
  HistoryViewStateInput
} from '@/lib/historyViewState';

const base: HistoryViewStateInput = {
  hasData: true,
  eventCount: 3,
  hasNextPage: false,
  isError: false,
  isFetchNextPageError: false
};

describe('getHistoryViewState', () => {
  it('shows the list when healthy', () => {
    expect(getHistoryViewState(base)).toBe('list');
  });

  it('shows confirmed empty only when the fetch succeeded', () => {
    expect(getHistoryViewState({ ...base, eventCount: 0 })).toBe('empty');
  });

  it('shows a full error when the first load fails', () => {
    expect(
      getHistoryViewState({
        ...base,
        hasData: false,
        eventCount: 0,
        isError: true
      })
    ).toBe('error');
  });

  it('keeps cached rows with an error when a refresh fails', () => {
    expect(getHistoryViewState({ ...base, isError: true })).toBe('stale');
  });

  it('does not present cached empty as confirmed empty on refresh failure', () => {
    expect(getHistoryViewState({ ...base, eventCount: 0, isError: true })).toBe(
      'stale'
    );
  });

  it('treats a next-page failure as a normal list', () => {
    expect(
      getHistoryViewState({
        ...base,
        hasNextPage: true,
        isError: true,
        isFetchNextPageError: true
      })
    ).toBe('list');
  });
});
