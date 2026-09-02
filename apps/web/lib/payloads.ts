import {
  AccountAddress,
  generateTransactionPayloadWithABI,
  InputGenerateTransactionPayloadData,
  InputEntryFunctionDataWithABI,
  Hex,
  Deserializer,
  MultiSigTransactionPayload,
  U64,
  EntryFunction,
  EntryFunctionABI,
  EntryFunctionArgument,
  TypeTag,
  U8,
  U16,
  U32,
  U128,
  U256,
  Bool,
  MoveVector,
  SimpleEntryFunctionArgumentTypes
} from '@aptos-labs/ts-sdk';
import {
  deserializerToHex,
  formatMoveVectorU8,
  getTypeTagDeserializerCls
} from './bcs';

export const createMultisigTransactionPayloadData = (args: {
  vaultAddress: string;
  payload: InputEntryFunctionDataWithABI;
}): InputGenerateTransactionPayloadData => {
  const payload = generateTransactionPayloadWithABI({
    ...args.payload,
    multisigAddress: AccountAddress.from(args.vaultAddress)
  });

  if (!payload.multiSig.transaction_payload) {
    throw new Error(
      '`createMultisigTransactionPayloadData` could not find transaction payload.'
    );
  }

  return {
    function: '0x1::multisig_account::create_transaction',
    functionArguments: [
      args.vaultAddress,
      payload.multiSig.transaction_payload.bcsToBytes()
    ]
  };
};

export const createMultisigVoteTransactionPayloadData = (args: {
  vaultAddress: string;
  sequenceNumber: number;
  approve: boolean;
}): InputGenerateTransactionPayloadData => {
  if (args.approve) {
    return {
      function: '0x1::multisig_account::approve_transaction',
      functionArguments: [args.vaultAddress, args.sequenceNumber]
    };
  } else {
    return {
      function: '0x1::multisig_account::reject_transaction',
      functionArguments: [args.vaultAddress, args.sequenceNumber]
    };
  }
};

/**
 * Collapse a list of sequence numbers into maximal contiguous runs. The input is
 * sorted and de-duplicated first, so `[3, 1, 2, 5]` becomes `[[1, 3], [5, 5]]`.
 *
 * @param sequenceNumbers - The sequence numbers to group.
 * @returns An array of `[start, end]` inclusive ranges.
 */
export const getContiguousRanges = (
  sequenceNumbers: number[]
): Array<[number, number]> => {
  const sorted = [...new Set(sequenceNumbers)].sort((a, b) => a - b);

  const ranges: Array<[number, number]> = [];
  for (const sequenceNumber of sorted) {
    const last = ranges[ranges.length - 1];
    if (last && sequenceNumber === last[1] + 1) {
      last[1] = sequenceNumber;
    } else {
      ranges.push([sequenceNumber, sequenceNumber]);
    }
  }

  return ranges;
};

/**
 * Build the vote payload for a single contiguous run of proposals. A run of one
 * reuses the individual `approve_transaction` / `reject_transaction` entry
 * functions (which do not require the multisig v2 enhancement feature); a longer
 * run collapses into a single `vote_transactions` call over the inclusive range.
 *
 * Callers submit one payload per run so partial progress can be tracked when a
 * later run fails — see `useBulkVoteProposals`.
 */
export const createRangeVoteTransactionPayloadData = (args: {
  vaultAddress: string;
  startSequenceNumber: number;
  endSequenceNumber: number;
  approve: boolean;
}): InputGenerateTransactionPayloadData => {
  const { vaultAddress, startSequenceNumber, endSequenceNumber, approve } =
    args;

  if (startSequenceNumber === endSequenceNumber) {
    return createMultisigVoteTransactionPayloadData({
      vaultAddress,
      sequenceNumber: startSequenceNumber,
      approve
    });
  }

  return {
    function: '0x1::multisig_account::vote_transactions',
    functionArguments: [
      vaultAddress,
      startSequenceNumber,
      endSequenceNumber,
      approve
    ]
  };
};

/**
 * Build the payload to remove one or more fully-rejected proposals from the
 * front of the queue in a single transaction. Rejected transactions are removed
 * strictly in order starting at `last_resolved_sequence_number + 1`, so `count`
 * proposals are removed up to `finalSequenceNumber`.
 *
 * A single removal reuses `execute_rejected_transaction` (no multisig v2
 * enhancement feature required); removing several collapses into one
 * `execute_rejected_transactions` call over the range.
 */
export const createRemoveRejectedTransactionPayloadData = (args: {
  vaultAddress: string;
  finalSequenceNumber: number;
  count: number;
}): InputGenerateTransactionPayloadData => {
  if (args.count <= 1) {
    return {
      function: '0x1::multisig_account::execute_rejected_transaction',
      functionArguments: [args.vaultAddress]
    };
  }

  return {
    function: '0x1::multisig_account::execute_rejected_transactions',
    functionArguments: [args.vaultAddress, args.finalSequenceNumber]
  };
};

/**
 * Attempt to deserialize a multisig transaction payload. If the payload is not a valid multisig transaction payload, return undefined.
 *
 * @param payload - The payload to deserialize.
 * @returns The deserialized transaction payload or undefined if the payload is not a valid multisig transaction payload.
 */
export const deserializeMultisigTransactionPayload = (payload: string) => {
  try {
    const multisigPayload = MultiSigTransactionPayload.deserialize(
      new Deserializer(Hex.fromHexInput(payload).toUint8Array())
    );

    const { transaction_payload: transactionPayload } = multisigPayload;

    // Multisig transaction payloads are always entry functions on-chain; in
    // ts-sdk v7 `transaction_payload` widened to `EntryFunction | Script`.
    if (!(transactionPayload instanceof EntryFunction)) return undefined;

    return {
      function: `${transactionPayload.module_name.address.toString()}::${transactionPayload.module_name.name.identifier}::${transactionPayload.function_name.identifier}`,
      functionArguments: transactionPayload.args,
      typeArguments: transactionPayload.type_args
    };
  } catch {
    return undefined;
  }
};

const formatFunctionArgument = (
  arg: EntryFunctionArgument | Deserializer,
  type: TypeTag
): SimpleEntryFunctionArgumentTypes => {
  const deserializer =
    arg instanceof Deserializer ? arg : new Deserializer(arg.bcsToBytes());

  if (type?.isU8()) return U8.deserialize(deserializer).value.toString();
  if (type?.isU16()) return U16.deserialize(deserializer).value.toString();
  if (type?.isU32()) return U32.deserialize(deserializer).value.toString();
  if (type?.isU64()) return U64.deserialize(deserializer).value.toString();
  if (type?.isU128()) return U128.deserialize(deserializer).value.toString();
  if (type?.isU256()) return U256.deserialize(deserializer).value.toString();
  if (type?.isBool()) return Bool.deserialize(deserializer).value.toString();
  if (type?.isAddress())
    return AccountAddress.deserialize(deserializer).toString();

  if (type?.isVector()) {
    if (type.value.isVector()) {
      const length = deserializer.deserializeUleb128AsU32();
      const values = [];
      for (let i = 0; i < length; i += 1) {
        values.push(formatFunctionArgument(deserializer, type.value));
      }
      return values;
    }

    const typeValue = getTypeTagDeserializerCls(type.value);

    if (!typeValue) return deserializerToHex(deserializer).toString();

    const vector = MoveVector.deserialize(deserializer, typeValue);

    return type.value.isU8()
      ? formatMoveVectorU8(vector as MoveVector<U8>)
      : vector.values.map((v) => formatFunctionArgument(v, type.value));
  }

  return deserializerToHex(deserializer).toString();
};

export const formatPayloadWithAbi = (
  payload: {
    function: string;
    functionArguments: EntryFunctionArgument[];
    typeArguments: TypeTag[];
  },
  abi: EntryFunctionABI
) => {
  return {
    function: payload.function,
    functionArguments: payload.functionArguments.map((arg, index) => {
      const type = abi.parameters[index];
      return type
        ? formatFunctionArgument(arg, type)
        : arg.bcsToHex().toString();
    }),
    typeArguments: payload.typeArguments.map((type) => type?.toString())
  };
};
