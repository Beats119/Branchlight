import type {
  PersistedState,
  Branch,
  BranchId,
  Content,
  ContentId,
  Message,
  SelectionAnchor,
  BranchPathNode,
} from './types';
import { newId } from './ids';
import { validateAnchor } from './anchoring';

export interface CreateBranchInput {
  parentContentId: ContentId;
  start: number;
  end: number;
  exactText: string;
  before: string;
  after: string;
  question: string;
  answerText: string;
  now?: number;
  mock?: boolean;
}

export type CreateBranchError =
  'empty-question' | 'bad-range' | 'parent-not-found' | 'invalid-anchor';

export type CreateBranchResult =
  | { ok: true; state: PersistedState; branch: Branch; branchId: BranchId }
  | { ok: false; error: CreateBranchError };

/** Deep clone used for immutable state transitions. Small data; clarity over micro-optimization. */
function clone(state: PersistedState): PersistedState {
  return structuredClone(state);
}

interface MessageContainer {
  kind: 'message';
  message: Message;
}
interface BranchContainer {
  kind: 'branch';
  branch: Branch;
}
type Container = MessageContainer | BranchContainer;

/**
 * Resolve which container owns a given Content id. A Content is either a
 * message body or a branch answer — both are anchorable.
 */
export function findContainer(state: PersistedState, contentId: ContentId): Container | null {
  for (const message of state.workspace.conversation.messages) {
    if (message.content.id === contentId) {
      return { kind: 'message', message };
    }
  }
  for (const id of Object.keys(state.branches)) {
    const branch = state.branches[id];
    if (branch.answer.id === contentId) {
      return { kind: 'branch', branch };
    }
  }
  return null;
}

export function getContentById(state: PersistedState, contentId: ContentId): Content | null {
  const container = findContainer(state, contentId);
  if (!container) return null;
  return container.kind === 'message' ? container.message.content : container.branch.answer;
}

/**
 * Create a branch anchored to a selection inside `parentContentId`.
 * Pure: returns a new state and never mutates the input. Rejects invalid input
 * with a typed error so the UI can react precisely.
 */
export function createBranch(state: PersistedState, input: CreateBranchInput): CreateBranchResult {
  const question = (input.question ?? '').trim();
  if (!question) return { ok: false, error: 'empty-question' };
  if (
    !Number.isInteger(input.start) ||
    !Number.isInteger(input.end) ||
    input.start < 0 ||
    input.end <= input.start
  ) {
    return { ok: false, error: 'bad-range' };
  }

  const parent = getContentById(state, input.parentContentId);
  if (!parent) return { ok: false, error: 'parent-not-found' };

  const anchor: SelectionAnchor = {
    parentContentId: input.parentContentId,
    parentVersion: parent.version,
    start: input.start,
    end: input.end,
    exactText: input.exactText,
    before: input.before,
    after: input.after,
    status: 'valid',
  };

  if (validateAnchor(parent.text, anchor) !== 'valid') {
    return { ok: false, error: 'invalid-anchor' };
  }

  const now = input.now ?? Date.now();
  const answer: Content = { id: newId('c'), version: 1, text: input.answerText };
  const branch: Branch = {
    id: newId('b'),
    parentContentId: input.parentContentId,
    anchor,
    question,
    answer,
    childBranchIds: [],
    collapsed: false,
    createdAt: now,
    mock: input.mock ?? true,
  };

  const next = clone(state);
  next.branches[branch.id] = branch;

  const container = findContainer(next, input.parentContentId);
  if (!container) return { ok: false, error: 'parent-not-found' };
  if (container.kind === 'message') container.message.branchIds.push(branch.id);
  else container.branch.childBranchIds.push(branch.id);

  return { ok: true, state: next, branch, branchId: branch.id };
}

export function toggleCollapse(state: PersistedState, branchId: BranchId): PersistedState {
  const next = clone(state);
  const branch = next.branches[branchId];
  if (branch) branch.collapsed = !branch.collapsed;
  return next;
}

export function setFocus(state: PersistedState, branchId: BranchId | null): PersistedState {
  const next = clone(state);
  next.ui.focusedBranchId = branchId;
  return next;
}

/** Breadcrumb path from the root message down to (and including) `branchId`. */
export function getBranchPath(state: PersistedState, branchId: BranchId): BranchPathNode[] {
  const path: BranchPathNode[] = [];
  let current: Branch | undefined = state.branches[branchId];
  let guard = 0;
  while (current && guard < 1000) {
    guard += 1;
    path.unshift({ branchId: current.id, question: current.question });
    const container = findContainer(state, current.parentContentId);
    if (!container || container.kind === 'message') break;
    current = container.branch;
  }
  return path;
}

/** Number of branch ancestors (depth in the tree). 0 == attached directly to a message. */
export function getBranchDepth(state: PersistedState, branchId: BranchId): number {
  return Math.max(0, getBranchPath(state, branchId).length - 1);
}

/**
 * Validate every branch anchor against its (current) parent text.
 * Mutates anchor.status in place on a clone; returns the cleaned state plus the
 * list of branch ids whose anchor became unavailable.
 */
export function validateAllAnchors(state: PersistedState): {
  state: PersistedState;
  brokeIds: BranchId[];
} {
  const next = clone(state);
  const brokeIds: BranchId[] = [];
  for (const id of Object.keys(next.branches)) {
    const branch = next.branches[id];
    const parent = getContentById(next, branch.parentContentId);
    if (
      !parent ||
      parent.id !== branch.anchor.parentContentId ||
      parent.version !== branch.anchor.parentVersion
    ) {
      branch.anchor.status = 'unavailable';
      brokeIds.push(id);
      continue;
    }
    const owner = findContainer(next, branch.parentContentId);
    const links =
      owner?.kind === 'message' ? owner.message.branchIds : owner?.branch.childBranchIds;
    const otherOwners = [
      ...next.workspace.conversation.messages
        .filter((m) => m.content.id !== branch.parentContentId)
        .flatMap((m) => m.branchIds),
      ...Object.values(next.branches)
        .filter((b) => b.answer.id !== branch.parentContentId)
        .flatMap((b) => b.childBranchIds),
    ];
    const status =
      links?.includes(id) && !otherOwners.includes(id)
        ? validateAnchor(parent.text, branch.anchor)
        : 'unavailable';
    branch.anchor.status = status;
    if (status === 'unavailable') brokeIds.push(id);
  }
  return { state: next, brokeIds };
}
