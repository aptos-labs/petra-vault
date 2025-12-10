'use client';

import { useEffect } from 'react';
import { synchronizeTime } from '@/lib/serverTime';

export default function TimeService() {
  useEffect(() => {
    synchronizeTime();
  }, []);

  return null;
}
