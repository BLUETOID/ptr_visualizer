import assert from 'assert';
import { computeEnterIndent, computeBackspaceIndent, computeTabIndent } from '../src/ui/editor.js';

console.log('[START] Testing Smart Code Editor Indentation Engine...');

// Test 1: Enter on line ending with { indents by +4 spaces
{
  const code = 'void solve() {';
  const res = computeEnterIndent(code, code.length, code.length);
  assert.strictEqual(res.val, 'void solve() {\n    ');
  assert.strictEqual(res.start, 'void solve() {\n    '.length);
  console.log('  [PASS] Enter after "{" indents by +4 spaces');
}

// Test 2: Enter preserving existing indentation
{
  const code = '    int x = 10;';
  const res = computeEnterIndent(code, code.length, code.length);
  assert.strictEqual(res.val, '    int x = 10;\n    ');
  assert.strictEqual(res.start, '    int x = 10;\n    '.length);
  console.log('  [PASS] Enter preserves existing line indentation');
}

// Test 3: Enter with existing indentation + opening brace
{
  const code = '    if (x > 0) {';
  const res = computeEnterIndent(code, code.length, code.length);
  assert.strictEqual(res.val, '    if (x > 0) {\n        ');
  assert.strictEqual(res.start, '    if (x > 0) {\n        '.length);
  console.log('  [PASS] Enter after nested "{" adds +4 spaces to current indentation');
}

// Test 4: Enter directly between { and } expands into 3-line block
{
  const code = 'void solve() {}';
  // Cursor is between { and } at index 14
  const res = computeEnterIndent(code, 14, 14);
  const expected = 'void solve() {\n    \n}';
  assert.strictEqual(res.val, expected);
  // Cursor must be on the middle line with 4 spaces
  assert.strictEqual(res.start, 'void solve() {\n    '.length);
  console.log('  [PASS] Enter between "{}" expands into 3-line block with cursor centered');
}

// Test 5: Enter directly between nested { and }
{
  const code = '    if (true) {}';
  const pos = code.indexOf('{') + 1;
  const res = computeEnterIndent(code, pos, pos);
  const expected = '    if (true) {\n        \n    }';
  assert.strictEqual(res.val, expected);
  assert.strictEqual(res.start, '    if (true) {\n        '.length);
  console.log('  [PASS] Nested "{}" expands into indented 3-line block');
}

// Test 6: Smart Backspace deletes 4 spaces at indent boundary
{
  const code = '        '; // 8 spaces
  const res = computeBackspaceIndent(code, 8, 8);
  assert.strictEqual(res.val, '    ');
  assert.strictEqual(res.start, 4);
  console.log('  [PASS] Smart Backspace removes 4 spaces at indentation boundary');
}

// Test 7: Smart Backspace does nothing if not at 4-space boundary
{
  const code = '   '; // 3 spaces
  const res = computeBackspaceIndent(code, 3, 3);
  assert.strictEqual(res, null);
  console.log('  [PASS] Smart Backspace passes through non-boundary backspaces to browser');
}

// Test 8: Tab inserts 4 spaces
{
  const code = 'int a = 0;';
  const res = computeTabIndent(code, 0, 0, false);
  assert.strictEqual(res.val, '    int a = 0;');
  assert.strictEqual(res.start, 4);
  console.log('  [PASS] Tab inserts 4 spaces at cursor');
}

// Test 9: Multi-line selection block Tab indents all lines
{
  const code = 'int a = 1;\nint b = 2;\nint c = 3;';
  const res = computeTabIndent(code, 0, code.length, false);
  assert.strictEqual(res.val, '    int a = 1;\n    int b = 2;\n    int c = 3;');
  console.log('  [PASS] Multi-line selection Tab indents all selected lines');
}

// Test 10: Multi-line selection block Shift+Tab unindents all lines
{
  const code = '    int a = 1;\n    int b = 2;\n    int c = 3;';
  const res = computeTabIndent(code, 0, code.length, true);
  assert.strictEqual(res.val, 'int a = 1;\nint b = 2;\nint c = 3;');
  console.log('  [PASS] Multi-line selection Shift+Tab unindents all selected lines');
}

console.log('[DONE] All Smart Editor Indentation tests passed with 100% success!\n');
