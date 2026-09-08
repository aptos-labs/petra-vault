'use client';

import { useEffect } from 'react';
import { synchronizeTime } from '@/lib/serverTime';

// Re-synchronize periodically so a delta that was wrong (or never fetched) at
// startup gets corrected without a reload. Every transaction expiration is
// derived from this clock, so drift here surfaces as TRANSACTION_EXPIRED.
const RESYNC_INTERVAL_MS = 5 * 60 * 1000;

export default function TimeService() {
  useEffect(() => {
    synchronizeTime();

    const interval = setInterval(synchronizeTime, RESYNC_INTERVAL_MS);

    // A backgrounded tab's timers are throttled and its clock can drift across
    // sleep/wake, so re-sync when it becomes visible again — right before the
    // user is likely to act.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') synchronizeTime();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return null;
}
