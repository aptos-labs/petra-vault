/* eslint-disable @typescript-eslint/no-explicit-any */

import { Hex } from '@aptos-labs/ts-sdk';
import type { EntryFunctionPayloadResponse } from '@aptos-labs/ts-sdk';
import {
  EntryFunctionJsonTransactionPayload,
  JsonTransactionPayload
} from '../types/transactions';

interface SerializedUint8ArrayArg {
  type: 'Uint8Array';
  value: string;
}

function isSerializedUint8Array(arg: any): arg is SerializedUint8ArrayArg {
  return arg?.type === 'Uint8Array' && typeof arg?.value === 'string';
}

function serializeEntryFunctionArg(arg: any): any {
  if (arg instanceof Uint8Array) {
    return {
      type: 'Uint8Array',
      value: Hex.fromHexInput(arg).toString()
    };
  }
  if (Array.isArray(arg)) {
    return arg.map(serializeEntryFunctionArg);
  }
  return arg;
}

function deserializeEntryFunctionArg(arg: any): any {
  if (isSerializedUint8Array(arg)) {
    return Hex.fromHexInput(arg.value).toUint8Array();
  }
  if (Array.isArray(arg)) {
    return arg.map(deserializeEntryFunctionArg);
  }
  return arg;
}

function serializeEntryFunctionPayload(
  payload: EntryFunctionPayloadResponse
): EntryFunctionJsonTransactionPayload {
  const normalizedArgs = payload.arguments.map(serializeEntryFunctionArg);
  return {
    ...payload,
    arguments: normalizedArgs,
    type: 'entry_function_payload'
  };
}

function deserializeEntryFunctionPayload(
  payload: EntryFunctionPayloadResponse
): EntryFunctionJsonTransactionPayload {
  const deserializedArgs = payload.arguments.map(deserializeEntryFunctionArg);
  return {
    ...payload,
    arguments: deserializedArgs,
    type: 'entry_function_payload'
  };
}

export function serializeJsonTransactionPayload(
  payload: JsonTransactionPayload
): JsonTransactionPayload {
  if (payload.type === 'entry_function_payload' || payload.type === undefined) {
    return serializeEntryFunctionPayload(payload);
  }
  if (payload.type === 'multisig_payload') {
    const innerPayload =
      payload.transaction_payload !== undefined
        ? serializeEntryFunctionPayload(payload.transaction_payload)
        : undefined;
    return { ...payload, transaction_payload: innerPayload };
  }
  
  throw new Error('Unexpected transaction payload type');
}

export function deserializeJsonTransactionPayload(
  payload: JsonTransactionPayload
): JsonTransactionPayload {
  if (payload.type === 'entry_function_payload' || payload.type === undefined) {
    return deserializeEntryFunctionPayload(payload);
  }
  if (payload.type === 'multisig_payload') {
    const innerPayload =
      payload.transaction_payload !== undefined
        ? deserializeEntryFunctionPayload(payload.transaction_payload)
        : undefined;
    return { ...payload, transaction_payload: innerPayload };
  }
  throw new Error('Unexpected transaction payload type');
}
