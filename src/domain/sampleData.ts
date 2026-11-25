import type { PersistedState } from './types';

/**
 * Deterministic seed data for the prototype. Ids are FIXED (not random) so that
 * anchors created against this content remain valid across reloads. The assistant
 * answer is realistic, multi-paragraph, and deliberately contains several
 * distinct selectable concepts so the branching interaction has something to grab.
 */

export const SEED_VERSION = 1;

const USER_QUESTION_ID = 'msg_user_1';
const ASSISTANT_MESSAGE_ID = 'msg_ai_1';
const ASSISTANT_CONTENT_ID = 'c_ai_1';

const USER_QUESTION_TEXT =
  'Can you explain how vaccines help the immune system build memory, and why that matters?';

const ASSISTANT_ANSWER_TEXT = [
  'A vaccine teaches your immune system without making you sick. It introduces a harmless piece of a pathogen — often a weakened virus, a single protein, or a snippet of its genetic code — so the body can study the shape of the threat in advance.',
  'When immune cells encounter this material, some of them become memory cells. These cells persist for years and "remember" the specific pathogen. If the real pathogen ever appears, those memory cells trigger a fast, targeted response before the infection spreads.',
  'This is the core idea behind immune memory: the first encounter is slow and exploratory, but later encounters are quick and precise. Vaccines compress that first encounter into a safe rehearsal, so the dangerous version never gets a head start.',
  'Why does it matter? Because the difference between a controlled infection and a severe one is often just how fast the immune system recognises the invader. A population with high immunity also protects people who cannot be vaccinated, through a buffer effect sometimes called herd protection.',
  'In short, a vaccine is not a shield you wear — it is a rehearsal your body keeps. The memory it builds is the reason a second exposure is far less dangerous than the first.',
].join('\n\n');

export function seedState(): PersistedState {
  const sampleConversation: import('./types').Conversation = {
    id: 'conv_1',
    title: 'How vaccines build immune memory',
    messages: [
      {
        id: USER_QUESTION_ID,
        role: 'user',
        content: { id: USER_QUESTION_ID + '_c', version: 1, text: USER_QUESTION_TEXT },
        branchIds: [],
        createdAt: 1,
      },
      {
        id: ASSISTANT_MESSAGE_ID,
        role: 'assistant',
        content: { id: ASSISTANT_CONTENT_ID, version: 1, text: ASSISTANT_ANSWER_TEXT },
        branchIds: [],
        createdAt: 2,
      },
    ],
  };

  return {
    version: SEED_VERSION,
    workspace: {
      id: 'ws_1',
      conversation: sampleConversation,
      conversations: { conv_1: sampleConversation },
      activeConversationId: 'conv_1',
    },
    branches: {},
    ui: { focusedBranchId: null },
  };
}
