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

/**
 * Narrow a front-of-queue prefix to the user's selection. Execute/remove act
 * strictly in sequence order, so a selection can only shrink the action to the
 * leading run of selected proposals — walking from the front and stopping at the
 * first unselected one (a gap blocks everything behind it).
 *
 * Narrowing only kicks in when the **front** of the prefix is selected. The
 * selection set is shared with approve/reject, so a selection that targets only
 * later proposals to vote on — or holds stale ids after the queue moved — must
 * not hide execute/remove while the front is still ready; in that case (and when
 * nothing is selected) the full prefix length is returned.
 *
 * @param prefixSequenceNumbers - Sequence numbers of the prefix, front first.
 * @param selected - Currently selected sequence numbers.
 */
export const capPrefixToSelection = (
  prefixSequenceNumbers: number[],
  selected: Set<number>
): number => {
  const front = prefixSequenceNumbers[0];
  if (front === undefined || !selected.has(front)) {
    return prefixSequenceNumbers.length;
  }

  let count = 0;
  for (const sequenceNumber of prefixSequenceNumbers) {
    if (selected.has(sequenceNumber)) {
      count += 1;
    } else {
      break;
    }
  }

  return count;
};
