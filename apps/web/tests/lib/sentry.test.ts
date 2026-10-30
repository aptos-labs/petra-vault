import { describe, expect, it, vi } from 'vitest';
import * as Sentry from '@sentry/nextjs';
import '../../instrumentation-client';

vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  captureRouterTransitionStart: vi.fn()
}));

const beforeSend = vi.mocked(Sentry.init).mock.calls[0]?.[0]?.beforeSend;
if (!beforeSend) throw new Error('Sentry beforeSend is not configured');

const message = "Cannot read properties of undefined (reading 'deserialize')";

describe('Sentry extension noise filter', () => {
  it.each([
    'chrome-extension://petra/background.js',
    'moz-extension://petra/background.js',
    'safari-web-extension://petra/background.js',
    'app:///injected/petra.js',
    'app:///inpage.js',
    'app:///extensionPageScript.js'
  ])('keeps reported mutation errors from %s', (filename) => {
    const event: Sentry.ErrorEvent = {
      type: undefined,
      tags: { 'petra.source': 'mutation' },
      exception: {
        values: [{ value: message, stacktrace: { frames: [{ filename }] } }]
      }
    };

    expect(beforeSend(event, {})).toBe(event);
    expect(beforeSend({ ...event, tags: undefined }, {})).toBeNull();
  });

  it.each([
    'Failed to connect to MetaMask',
    "Cannot read properties of null (reading 'requestParams')"
  ])('still filters known provider noise from mutations: %s', (message) => {
    const event: Sentry.ErrorEvent = {
      type: undefined,
      tags: { 'petra.source': 'mutation' },
      exception: {
        values: [
          {
            value: message,
            stacktrace: { frames: [{ filename: 'app:///injected/petra.js' }] }
          }
        ]
      }
    };

    expect(beforeSend(event, {})).toBeNull();
  });

  it('keeps ordinary application errors', () => {
    const event: Sentry.ErrorEvent = { type: undefined, message };
    expect(beforeSend(event, {})).toBe(event);
  });
});
