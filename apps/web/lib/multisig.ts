/**
 * A pending multisig proposal reduced to just what bulk execute / remove need:
 * the owner-filtered vote tallies and whether Petra Vault has a runnable payload
 * for it (hashed or unsupported payloads can't be executed from the UI).
 */
export interface ResolvableProposal {
  /** Number of approvals cast by current owners. */
  approvals: number;
  /** Number of rejections cast by current owners. */
  rejections: number;
  /** Whether the proposal has a payload we can reconstruct and execute. */
  executable: boolean;
}

/**
 * Multisig transactions resolve strictly in sequence order — only the proposal
 * at `last_resolved_sequence_number + 1` can execute or be removed next. So bulk
 * execute / remove can only ever act on a contiguous run starting at the front
 * of the queue.
 *
 * Given the pending queue in sequence order, returns how many proposals from the
 * front are ready to **execute** (enough approvals and a runnable payload) and
 * how many are ready to **remove** (enough rejections but not enough approvals).
 * Each stops at the first proposal that doesn't qualify, since anything behind it
 * is blocked.
 *
 * A proposal can meet both thresholds at once (e.g. a 1-of-N vault with one
 * approval and one rejection). Approvals take precedence — it's executed, not
 * removed — mirroring the single-proposal page, so Remove is never offered for a
 * ready-to-execute proposal.
 *
 * @param queue - Pending proposals in ascending sequence-number order.
 * @param signaturesRequired - Approvals/rejections needed to resolve a proposal.
 */
export const getResolvablePrefix = (
  queue: ResolvableProposal[],
  signaturesRequired: number
): { executable: number; removable: number } => {
  if (signaturesRequired <= 0) return { executable: 0, removable: 0 };

  let executable = 0;
  for (const proposal of queue) {
    if (proposal.approvals >= signaturesRequired && proposal.executable) {
      executable += 1;
    } else {
      break;
    }
  }

  let removable = 0;
  for (const proposal of queue) {
    if (
      proposal.rejections >= signaturesRequired &&
      proposal.approvals < signaturesRequired
    ) {
      removable += 1;
    } else {
      break;
    }
  }

  return { executable, removable };
};
