/**
 * Security Regression Tests — Verify XSS mitigations
 */

// Test escapeHtml behavior inline (same function used in controls.js and memoryInspector.js)
function escapeHtml(text) {
  if (typeof text !== 'string') return String(text ?? '');
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passed++;
  } else {
    console.log(`  [FAIL] ${label}`);
    failed++;
  }
}

console.log('[START] Security Regression Tests...\n');

// Test 1: escapeHtml neutralizes script tags
assert(escapeHtml('<script>alert(1)</script>') === '&lt;script&gt;alert(1)&lt;/script&gt;', 
  'escapeHtml neutralizes <script> tags');

// Test 2: escapeHtml neutralizes img onerror
assert(escapeHtml('<img src=x onerror=alert(1)>') === '&lt;img src=x onerror=alert(1)&gt;',
  'escapeHtml neutralizes <img onerror> payloads');

// Test 3: escapeHtml preserves normal text
assert(escapeHtml('curr = head->next') === 'curr = head-&gt;next',
  'escapeHtml escapes > in normal C++ explanation text');

// Test 4: escapeHtml handles non-string values
assert(escapeHtml(42) === '42', 'escapeHtml handles numbers');
assert(escapeHtml(null) === '', 'escapeHtml handles null');
assert(escapeHtml(undefined) === '', 'escapeHtml handles undefined');

// Test 5: Parser depth limit
import { parseProgram } from '../src/core/parser.js';
import { tokenize } from '../src/core/lexer.js';

try {
  // Create deeply nested expression: (((((...))))))
  const deepNest = '(' .repeat(250) + '1' + ')'.repeat(250);
  const code = `int x = ${deepNest};`;
  const tokens = tokenize(code);
  parseProgram(tokens);
  assert(false, 'Parser should reject deeply nested expressions');
} catch (e) {
  assert(e.message.includes('deeply nested'), 
    `Parser correctly rejects deep nesting: "${e.message}"`);
}

// Test 6: Normal expressions still parse fine
try {
  const code = 'int x = ((1 + 2) * (3 + 4));';
  const tokens = tokenize(code);
  const result = parseProgram(tokens);
  assert(result.functions && result.functions.main, 'Normal nested expressions still parse correctly');
} catch (e) {
  assert(false, `Normal expressions should not fail: ${e.message}`);
}

// Test 7: localStorage schema validation
function testLoadSavedState(raw) {
  try {
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (typeof state !== 'object' || state === null) return null;
    if (typeof state.presetId !== 'string' || !state.presetId) return null;
    if (state.code !== undefined && typeof state.code !== 'string') return null;
    if (state.arrayInput !== undefined && typeof state.arrayInput !== 'string') return null;
    if (state.visualizerMode !== undefined &&
        !['pointer', 'array_stl', 'unified'].includes(state.visualizerMode)) {
      state.visualizerMode = 'pointer';
    }
    return state;
  } catch (e) {
    return null;
  }
}

assert(testLoadSavedState('{"presetId":"lc206","code":"int x = 1;"}') !== null,
  'Valid localStorage data accepted');
assert(testLoadSavedState('{"presetId":123}') === null,
  'Non-string presetId rejected');
assert(testLoadSavedState('[1,2,3]') === null,
  'Array instead of object rejected');
assert(testLoadSavedState('not json') === null,
  'Invalid JSON rejected');
assert(testLoadSavedState('{"presetId":"lc206","code":42}') === null,
  'Non-string code rejected');
const badMode = testLoadSavedState('{"presetId":"lc206","visualizerMode":"evil_mode"}');
assert(badMode !== null && badMode.visualizerMode === 'pointer',
  'Invalid visualizerMode falls back to pointer');

console.log(`\n[DONE] Security Regression Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
