import { cosineSimilarity } from '../similarity';

describe('similarity utils', () => {
  // Test Case ID: TC-CHAT-UTIL-001
  test('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });

  // Test Case ID: TC-CHAT-UTIL-002
  test('returns 0 for mismatched length or zero vector', () => {
    expect(cosineSimilarity([1, 2], [1])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });
});
