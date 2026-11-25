/**
 * Branchlight domain model.
 *
 * This module is intentionally free of React and DOM concerns. The UI renders
 * from this model; the model never depends on the UI. That separation is what
 * lets the same branching engine run inside a web view, an Electron shell, or
 * a future backend.
 *
 * Anchoring convention (read this before touching offsets):
 *  - Offsets are UTF-16 code-unit indices into an immutable text string,
 *    exactly as JavaScript `String.prototype.slice` expects.
 *  - Every anchorable piece of text is a `Content` with a stable `id` and a
 *    `version`. A message's body and a branch's answer are both `Content`.
 *  - A branch records the parent `Content.id` plus start/end offsets and the
 *    exact selected text. The offsets are validated against the immutable
 *    parent text on load, so a branch can never silently point at the wrong
 *    passage.
 */

export type ContentId = string;
export type BranchId = string;
export type MessageId = string;
export type ConversationId = string;
export type WorkspaceId = string;

export type Role = 'user' | 'assistant';

/** A stable, immutable-after-branching piece of text that can be anchored to. */
export interface Content {
  id: ContentId;
  version: number;
  text: string;
}

export type AnchorStatus = 'valid' | 'unavailable';

/** Where, exactly, a branch is attached inside its parent content. */
export interface SelectionAnchor {
  parentContentId: ContentId;
  parentVersion: number;
  /** UTF-16 inclusive start offset into the parent text. */
  start: number;
  /** UTF-16 exclusive end offset into the parent text. */
  end: number;
  /** The selected substring; the source of truth for validation. */
  exactText: string;
  /** Surrounding context kept for human-readable recovery / display. */
  before: string;
  after: string;
  status: AnchorStatus;
}

export interface Branch {
  id: BranchId;
  /** The Content this branch is anchored to (a message body or another branch's answer). */
  parentContentId: ContentId;
  anchor: SelectionAnchor;
  question: string;
  /** The branch answer is itself anchorable Content. */
  answer: Content;
  childBranchIds: BranchId[];
  collapsed: boolean;
  createdAt: number;
  /** True for prototype mock responses. Real LLM answers will set this false. */
  mock: boolean;
}

export interface Message {
  id: MessageId;
  role: Role;
  content: Content;
  branchIds: BranchId[];
  createdAt: number;
}

export interface Conversation {
  id: ConversationId;
  title: string;
  messages: Message[];
}

export interface Workspace {
  id: WorkspaceId;
  /** The currently displayed conversation (a reference into `conversations`). */
  conversation: Conversation;
  /** All conversations: the sample chat plus any uploaded documents. */
  conversations: Record<ConversationId, Conversation>;
  activeConversationId: ConversationId;
}

export interface UiState {
  /** When set, the reading view focuses this single branch (full-width, breadcrumbed). */
  focusedBranchId: BranchId | null;
}

/** The complete, serializable application state for the first milestone. */
export interface PersistedState {
  /** Schema version for future migrations. */
  version: number;
  workspace: Workspace;
  /** All branches by id. The tree is derived from parent/child id references. */
  branches: Record<BranchId, Branch>;
  ui: UiState;
}

/** A node in the breadcrumb path from a root message down to a branch. */
export interface BranchPathNode {
  branchId: BranchId;
  question: string;
}
