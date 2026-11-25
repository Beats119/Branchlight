/**
 * Mock AI responder for the first milestone.
 *
 * No network, no API key, no model. The answer is generated locally and is
 * clearly a DEMO response (the UI also badges it). The output tries to feel
 * responsive to the selected passage and the question so the branching
 * interaction is pleasant to explore.
 */

export function mockAnswer(selectedText: string, question: string): string {
  const q = question.trim().toLowerCase();
  const snippet = selectedText.trim();

  if (q.includes('simple') || q.includes('eli5') || q.includes('explain like')) {
    return (
      `In plain terms: "${snippet}" means the body keeps a record of invaders it has ` +
      `met before, so the next time it recognises them quickly and reacts faster. ` +
      `Think of it like a library that files away a "wanted" poster after the first ` +
      `encounter. (Demo answer — generated locally, not by a real model.)`
    );
  }

  if (q.includes('example')) {
    return (
      `A concrete example of "${snippet}": imagine you recover from a cold caused by ` +
      `virus X. Weeks later, the same virus X appears again; your body already has the ` +
      `right tools ready, so you either don't get sick or recover much faster. ` +
      `(Demo answer — generated locally, not by a real model.)`
    );
  }

  if (q.includes('why') || q.includes('important')) {
    return (
      `Why "${snippet}" matters: without it, the body would start from scratch every ` +
      `single time it met the same threat, which is slower and riskier. The ability to ` +
      `respond from memory is what makes vaccines and natural immunity protective. ` +
      `(Demo answer — generated locally, not by a real model.)`
    );
  }

  if (q.includes('difference') || q.includes('versus') || q.includes('compare')) {
    return (
      `Comparing ideas around "${snippet}": the key distinction is between a first-time ` +
      `response (slow, general) and a remembered response (fast, specific). The selected ` +
      `passage sits on the "remembered" side of that line. ` +
      `(Demo answer — generated locally, not by a real model.)`
    );
  }

  return (
    `Good question about "${snippet}". In short: this passage describes one step in how ` +
    `the immune system learns from exposure and prepares a faster response next time. ` +
    `The surrounding explanation builds the fuller picture. ` +
    `(Demo answer — generated locally, not by a real model.)`
  );
}
