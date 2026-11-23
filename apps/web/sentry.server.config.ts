// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: 'https://c9faceb5eaeb797f558c1e3190cea940@o1162451.ingest.us.sentry.io/4509154315468800',

  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: {
      deny: ['x-forwarded-', '-user']
    },
    httpBodies: []
  },

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false
});
