import { describe, it, expect } from 'vitest';
import {
  isLikelyAddress,
  parseEntryFunctionInput
} from '../../lib/entryFunctionInput';

describe('isLikelyAddress', () => {
  it('accepts special and full-length addresses', () => {
    expect(isLikelyAddress('0x1')).toBe(true);
    expect(isLikelyAddress('0xA')).toBe(true);
    expect(
      isLikelyAddress(
        '0x867ed1f6bf916171b1de3ee92849b8978b7d1b9e0a8cc982a3d19d535dfd9c0c'
      )
    ).toBe(true);
  });

  it('rejects empty, non-0x, and non-hex input', () => {
    expect(isLikelyAddress('')).toBe(false);
    expect(isLikelyAddress('0x')).toBe(false);
    expect(isLikelyAddress('1')).toBe(false);
    expect(isLikelyAddress('0xZZ')).toBe(false);
    expect(isLikelyAddress('0x1 ')).toBe(false);
  });
});

describe('parseEntryFunctionInput', () => {
  it('is idle for empty or non-address input', () => {
    expect(parseEntryFunctionInput('')).toEqual({ mode: 'idle' });
    // A single colon is not a separator, so this is not a valid address.
    expect(parseEntryFunctionInput('0x1:')).toEqual({ mode: 'idle' });
  });

  it('suggests modules for a bare valid address (no `::` needed)', () => {
    expect(parseEntryFunctionInput('0x1')).toEqual({
      mode: 'modules',
      address: '0x1',
      query: ''
    });
  });

  it('suggests modules once the first `::` is typed', () => {
    expect(parseEntryFunctionInput('0x1::')).toEqual({
      mode: 'modules',
      address: '0x1',
      query: ''
    });
    expect(parseEntryFunctionInput('0x1::ac')).toEqual({
      mode: 'modules',
      address: '0x1',
      query: 'ac'
    });
  });

  it('suggests functions once the second `::` is typed', () => {
    expect(parseEntryFunctionInput('0x1::account::')).toEqual({
      mode: 'functions',
      address: '0x1',
      module: 'account',
      query: ''
    });
    expect(parseEntryFunctionInput('0x1::account::set')).toEqual({
      mode: 'functions',
      address: '0x1',
      module: 'account',
      query: 'set'
    });
  });

  it('works with a full-length non-framework address', () => {
    const address =
      '0x867ed1f6bf916171b1de3ee92849b8978b7d1b9e0a8cc982a3d19d535dfd9c0c';
    expect(parseEntryFunctionInput(`${address}::router`)).toEqual({
      mode: 'modules',
      address,
      query: 'router'
    });
    expect(
      parseEntryFunctionInput(`${address}::router::register_domain`)
    ).toEqual({
      mode: 'functions',
      address,
      module: 'router',
      query: 'register_domain'
    });
  });

  it('is idle when there are too many segments or the address is invalid', () => {
    expect(parseEntryFunctionInput('0x1::account::set::extra')).toEqual({
      mode: 'idle'
    });
    expect(parseEntryFunctionInput('notanaddress::module')).toEqual({
      mode: 'idle'
    });
  });
});
