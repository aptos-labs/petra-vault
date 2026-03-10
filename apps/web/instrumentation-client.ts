// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

const isProduction = process.env.NODE_ENV === 'production';

const extensionFramePatterns = [
  /^(chrome|moz)-extension:\/\//i,
  /^safari-web-extension:\/\//i,
  /^app:\/\/\/injected\//i,
  /^app:\/\/\/inpage(?:[-\w]*)?\.js/i,
  /^app:\/\/\/extensionPageScript(?:[-\w]*)?\.js/i
];

type ExtensionNoiseRule = {
  id: string;
  framePatterns?: RegExp[];
  messagePatterns?: RegExp[];
  matchMode?: 'any' | 'all';
};

const extensionNoiseRules: ExtensionNoiseRule[] = [
  {
    id: 'extension-stack-frame',
    framePatterns: extensionFramePatterns
  },
  {
    id: 'wallet-provider-noise-messages',
    messagePatterns: [
      /Cannot set property ethereum of #<Window> which has only a getter/i,
      /Attempting to use a disconnected port object/i,
      /Failed to connect to MetaMask/i,
      /The request by this Web3 provider is timeout\./i,
      /Cannot read properties of undefined \(reading 'removeListener'\)/i,
      /Cannot assign to read only property '[^']+' of object '#<Window>'/i
    ]
  },
  {
    id: 'injected-provider-null-params',
    matchMode: 'all',
    framePatterns: [/^app:\/\/\/injected\//i],
    messagePatterns: [
      /Cannot read properties of null \(reading '[^']*Params'\)/i
    ]
  }
];

Sentry.init({
  dsn: 'https://c9faceb5eaeb797f558c1e3190cea940@o1162451.ingest.us.sentry.io/4509154315468800',

  // Add optional integrations for additional features
  integrations: [...(isProduction ? [Sentry.replayIntegration()] : [])],

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Ignore noise from browser extensions and injected wallet scripts.
  beforeSend(event, hint) {
    const frameFilenames =
      event.exception?.values
        ?.flatMap((exception) => exception.stacktrace?.frames ?? [])
        .map((frame) => frame.filename ?? '') ?? [];

    const eventMessages = [
      event.message,
      ...(event.exception?.values?.map((exception) => exception.value ?? '') ??
        []),
      hint?.originalException instanceof Error
        ? hint.originalException.message
        : ''
    ].filter((message): message is string => Boolean(message));

    const matchesRule = (rule: ExtensionNoiseRule) => {
      const hasFramePatterns = Boolean(rule.framePatterns?.length);
      const hasMessagePatterns = Boolean(rule.messagePatterns?.length);
      const hasMatchingFrame = hasFramePatterns
        ? frameFilenames.some((filename) =>
            rule.framePatterns!.some((pattern) => pattern.test(filename))
          )
        : false;
      const hasMatchingMessage = hasMessagePatterns
        ? eventMessages.some((message) =>
            rule.messagePatterns!.some((pattern) => pattern.test(message))
          )
        : false;

      if (rule.matchMode === 'all') {
        return (
          (!hasFramePatterns || hasMatchingFrame) &&
          (!hasMessagePatterns || hasMatchingMessage)
        );
      }

      return hasMatchingFrame || hasMatchingMessage;
    };

    if (extensionNoiseRules.some(matchesRule)) {
      return null;
    }

    return event;
  }
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
