import type { PersistedState } from '../types';
import { buildAnchor } from '../anchoring';
import { getContentById } from '../branching';
import type { CreateBranchInput } from '../branching';

/** Build a valid CreateBranchInput for a [start,end) slice of a parent Content. */
export function makeInput(
  state: PersistedState,
  parentContentId: string,
  start: number,
  end: number,
  question: string,
  answerText = 'Demo answer.',
): CreateBranchInput {
  const parent = getContentById(state, parentContentId);
  if (!parent) throw new Error(`no content for ${parentContentId}`);
  const anchor = buildAnchor(parent, start, end);
  return {
    parentContentId,
    start: anchor.start,
    end: anchor.end,
    exactText: anchor.exactText,
    before: anchor.before,
    after: anchor.after,
    question,
    answerText,
    now: 100,
  };
}

export const ASSISTANT_CONTENT_ID = 'c_ai_1';
