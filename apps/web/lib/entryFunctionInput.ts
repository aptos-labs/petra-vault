/**
 * Pure helpers for the entry-function autocomplete.
 *
 * The Create Proposal entry-function field is free text in the shape
 * `0x{address}::{module}::{function}`. As the user types we want to suggest the
 * modules published under `address`, then the functions exposed by the chosen
 * module. This turns the raw input into a "mode" describing what to suggest.
 */

const LIKELY_ADDRESS_REGEX = /^0x[0-9a-fA-F]{1,64}$/;

export type EntryFunctionInputState =
  | { mode: 'idle' }
  | { mode: 'modules'; address: string; query: string }
  | { mode: 'functions'; address: string; module: string; query: string };

/**
 * A syntactically plausible account address (`0x` + 1-64 hex chars). Used to
 * gate module fetching so we never issue a request for partial/garbage input.
 */
export function isLikelyAddress(value: string): boolean {
  return LIKELY_ADDRESS_REGEX.test(value);
}

/**
 * Parse the raw field value into a suggestion mode based on how many `::`
 * separators are present:
 * - `address` / `address::partialModule`  -> suggest modules
 * - `address::module::partialFunction`     -> suggest functions
 * - anything else (or an implausible address) -> no suggestions
 *
 * A bare, valid address (no `::` yet) already suggests its modules so the user
 * doesn't have to type the separator first.
 */
export function parseEntryFunctionInput(
  value: string
): EntryFunctionInputState {
  const segments = value.split('::');
  const address = segments[0];

  if (!address || !isLikelyAddress(address)) return { mode: 'idle' };

  if (segments.length === 1 || segments.length === 2) {
    return { mode: 'modules', address, query: segments[1] ?? '' };
  }

  if (segments.length === 3) {
    return {
      mode: 'functions',
      address,
      module: segments[1] ?? '',
      query: segments[2] ?? ''
    };
  }

  return { mode: 'idle' };
}
