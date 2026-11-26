import { it, expect } from 'vitest';
import { mockAnswer } from '../mockAi';
it('the Explain this simply suggestion uses the plain-language response', () => {
  expect(mockAnswer('memory cells', 'Explain this simply')).toContain('In plain terms');
});
it('does not inflate the answer by repeating an entire selected document', () => {
  expect(mockAnswer('memory cells '.repeat(1000), 'What are these?').length).toBeLessThan(1200);
});
it('offers a specific scripted explanation of memory cells', () => {
  expect(mockAnswer('memory cells', 'What exactly are memory cells?')).toContain(
    'B cells and T cells',
  );
});
