import {
  AccountAddress,
  generateTransactionPayloadWithABI,
  InputGenerateTransactionPayloadData,
  InputEntryFunctionDataWithABI,
  Hex,
  Deserializer,
  MultiSigTransactionPayload,
  U64,
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
