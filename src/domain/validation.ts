import type { Content, PersistedState } from './types';

// Treat disk/browser storage as untrusted input. Reject structural corruption;
// passage mismatches are recoverable and are handled by validateAllAnchors.
export function isPersistedState(value: unknown): value is PersistedState {
  const obj = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === 'object' && !Array.isArray(v);
  const ids = (v: unknown): v is string[] =>
    Array.isArray(v) && v.every((x) => typeof x === 'string');
  const content = (v: unknown): v is Content =>
    obj(v) && typeof v.id === 'string' && Number.isInteger(v.version) && typeof v.text === 'string';
  if (
    !obj(value) ||
    value.version !== 1 ||
    !obj(value.workspace) ||
    typeof value.workspace.id !== 'string' ||
    !obj(value.workspace.conversation)
  )
    return false;
  const conv = value.workspace.conversation;
  if (
    typeof conv.id !== 'string' ||
    typeof conv.title !== 'string' ||
    !Array.isArray(conv.messages) ||
    !obj(value.branches) ||
    !obj(value.ui)
  )
    return false;
  if (value.ui.focusedBranchId !== null && typeof value.ui.focusedBranchId !== 'string')
    return false;
  const allContent = new Set<string>();
  const children = new Map<string, string[]>();
  for (const m of conv.messages) {
    if (
      !obj(m) ||
      typeof m.id !== 'string' ||
      (m.role !== 'user' && m.role !== 'assistant') ||
      !content(m.content) ||
      !ids(m.branchIds) ||
      typeof m.createdAt !== 'number'
    )
      return false;
    if (allContent.has(m.content.id)) return false;
    allContent.add(m.content.id);
  }
  for (const [id, b] of Object.entries(value.branches)) {
    if (
      !obj(b) ||
      b.id !== id ||
      typeof b.parentContentId !== 'string' ||
      !content(b.answer) ||
      !ids(b.childBranchIds) ||
      typeof b.question !== 'string' ||
      typeof b.collapsed !== 'boolean' ||
      typeof b.mock !== 'boolean' ||
      typeof b.createdAt !== 'number' ||
      !obj(b.anchor)
    )
      return false;
    children.set(id, b.childBranchIds);
    const a = b.anchor;
    if (
      typeof a.parentContentId !== 'string' ||
      !Number.isInteger(a.parentVersion) ||
      !Number.isInteger(a.start) ||
      !Number.isInteger(a.end) ||
      !['exactText', 'before', 'after'].every((k) => typeof a[k] === 'string')
    )
      return false;
    if (allContent.has(b.answer.id)) return false;
    allContent.add(b.answer.id);
  }
  // Every branch must be reachable exactly once: rejects dangling links, cycles,
  // duplicate ownership, and orphans before the recursive renderer sees them.
  const seen = new Set<string>();
  const queue = conv.messages.flatMap((m: { branchIds: string[] }) => m.branchIds);
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    if (seen.has(id) || !children.has(id)) return false;
    seen.add(id);
    queue.push(...children.get(id)!);
  }
  return seen.size === Object.keys(value.branches).length;
}
