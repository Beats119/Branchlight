import { describe, it, expect } from 'vitest';
import { seedState } from '../sampleData';
import {
  createDocumentConversation,
  setActiveConversation,
  createBranch,
  findContainer,
  getBranchPath,
} from '../branching';
import { makeInput, ASSISTANT_CONTENT_ID } from './helpers';

describe('documents (multi-conversation workspace)', () => {
  it('creates a document conversation and makes it active', () => {
    const next = createDocumentConversation(seedState(), 'notes.txt', ['Page one text.', 'Page two text.']);
    expect(Object.keys(next.workspace.conversations)).toContain('conv_1'); // sample preserved
    const docId = next.workspace.activeConversationId;
    expect(docId).not.toBe('conv_1');
    expect(next.workspace.conversation.id).toBe(docId);
    expect(next.workspace.conversation.title).toBe('notes.txt');
    // Two pages become assistant messages.
    const pages = next.workspace.conversation.messages.filter((m) => m.role === 'assistant');
    expect(pages).toHaveLength(2);
    expect(pages[0].content.text).toBe('Page one text.');
  });

  it('switches the active conversation without losing the others', () => {
    const withDoc = createDocumentConversation(seedState(), 'notes.txt', ['Hello world.']);
    const back = setActiveConversation(withDoc, 'conv_1');
    expect(back.workspace.activeConversationId).toBe('conv_1');
    expect(back.workspace.conversation.title).toContain('immune memory');
    // The document is still present in the workspace.
    expect(Object.keys(back.workspace.conversations).length).toBe(2);
  });

  it('allows branching directly from a document page', () => {
    const withDoc = createDocumentConversation(seedState(), 'notes.txt', ['Alpha beta gamma.']);
    const docMsg = withDoc.workspace.conversation.messages.find((m) => m.role === 'assistant')!;
    const res = createBranch(withDoc, makeInput(withDoc, docMsg.content.id, 0, 5, 'What is this?'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // The branch is attached to the document page, not to the sample chat.
    const docMsgAfter = res.state.workspace.conversation.messages.find(
      (m) => m.content.id === docMsg.content.id,
    )!;
    expect(docMsgAfter.branchIds).toContain(res.branchId);
    const container = findContainer(res.state, docMsg.content.id);
    expect(container?.kind).toBe('message');
  });

  it('keeps the sample chat branchable after a document was added', () => {
    const withDoc = createDocumentConversation(seedState(), 'notes.txt', ['Page one.']);
    const res = createBranch(withDoc, makeInput(withDoc, ASSISTANT_CONTENT_ID, 0, 9, 'From sample?'));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(getBranchPath(res.state, res.branchId)).toHaveLength(1);
  });
});
