/**
 * Rough max-gas estimate for previews where only the inner payload can be
 * simulated (as the vault), not the multisig execute wrapper — e.g. while
 * creating a proposal, before it exists on-chain. The inner simulation
 * under-reports what the wrapper (approval prologue, event emission, dispatch)
 * will spend, so pad it generously.
 */
export const padEstimatedGas = (gas: number) => gas * 10;

/**
 * Safety margin for a max-gas value that already came from simulating the exact
 * transaction being submitted. It only needs to absorb minor state drift
 * between simulation and execution, so keep the buffer small — unlike
 * {@link padEstimatedGas}, it isn't compensating for an inner→wrapper gap.
 */
export const bufferEstimatedGas = (gas: number) => Math.ceil(gas * 1.5);
