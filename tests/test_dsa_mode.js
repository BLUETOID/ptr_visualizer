/**
 * Automated Verification for DSA & Array Mode
 */

import { tokenize } from '../src/core/lexer.js';
import { parseProgram } from '../src/core/parser.js';
import { resetEngineState, runProgram } from '../src/core/interpreter.js';
import { DSA_SNIPPETS } from '../src/examples/snippets.js';
import { EXAMPLES_CATALOG } from '../src/examples/catalog.js';

console.log('[START] Starting Array & STL Visualizer Mode Automated Verification...');

let passed = 0;
let total = 0;

function assert(cond, msg) {
  total++;
  if (!cond) {
    console.error(`  [FAIL] ${msg}`);
    process.exit(1);
  }
  passed++;
  console.log(`  [PASS] ${msg}`);
}

// 1. Test Array Declaration & Indexing
{
  const code = `void main() {
    int arr[4] = {10, 20, 30, 40};
    int x = arr[2];
    arr[1] = 99;
  }`;
  const ast = parseProgram(tokenize(code));
  resetEngineState();
  const timeline = runProgram(ast.functions.main, []);

  assert(timeline.length >= 3, 'Array declaration and indexing generated timeline steps');
  
  // Find step with read access
  const readStep = timeline.find(s => s.meta && s.meta.dsaAccess && s.meta.dsaAccess.type === 'read');
  assert(readStep && readStep.meta.dsaAccess.index === 2, 'Array read access recorded index 2');

  // Find step with write access
  const writeStep = timeline.find(s => s.meta && s.meta.dsaAccess && s.meta.dsaAccess.type === 'write');
  assert(writeStep && writeStep.meta.dsaAccess.index === 1 && writeStep.meta.dsaAccess.value === 99, 'Array write access recorded index 1 with value 99');
}

// 2. Test swap(arr[i], arr[j])
{
  const code = `void main() {
    int arr[3] = {1, 2, 3};
    swap(arr[0], arr[2]);
  }`;
  const ast = parseProgram(tokenize(code));
  resetEngineState();
  const timeline = runProgram(ast.functions.main, []);

  const swapStep = timeline.find(s => s.meta && s.meta.dsaAccess && s.meta.dsaAccess.type === 'swap');
  assert(swapStep !== undefined, 'swap(arr[0], arr[2]) recorded swap event');
  assert(swapStep.meta.dsaAccess.indices[0] === 0 && swapStep.meta.dsaAccess.indices[1] === 2, 'Swap event indices are [0, 2]');
}

// 3. Test vector<int> & methods (.push_back, .size, .pop_back)
{
  const code = `void main() {
    vector<int> nums = {5, 10};
    nums.push_back(15);
    int len = nums.size();
    int back = nums.pop_back();
  }`;
  const ast = parseProgram(tokenize(code));
  resetEngineState();
  const timeline = runProgram(ast.functions.main, []);

  assert(timeline.length >= 4, 'vector methods executed in timeline');
  const finalFrame = timeline[timeline.length - 1].frames[0];
  assert(finalFrame.vars.len && finalFrame.vars.len.value === 3, 'nums.size() correctly evaluated to 3');
  assert(finalFrame.vars.back && finalFrame.vars.back.value === 15, 'nums.pop_back() correctly returned 15');
}

// 4. Test all DSA Snippets
DSA_SNIPPETS.forEach(snip => {
  const code = `void main() {
${snip.code}
}`;
  try {
    const ast = parseProgram(tokenize(code));
    assert(ast.functions.main !== undefined, `DSA Snippet "${snip.label}" parsed validly`);
  } catch (e) {
    assert(false, `DSA Snippet "${snip.label}" threw: ${e.message}`);
  }
});

// 5. Test all DSA presets in catalog
const dsaPresets = Object.values(EXAMPLES_CATALOG).filter(ex => ex.structureType === 'dsa');
assert(dsaPresets.length >= 8, `Found ${dsaPresets.length} DSA presets in catalog`);

dsaPresets.forEach(preset => {
  try {
    const ast = parseProgram(tokenize(preset.code));
    const fn = ast.functions[preset.entryFn] || ast.functions.main;
    resetEngineState();
    const timeline = runProgram(fn, []);
    assert(timeline.length >= 3, `Preset "${preset.label}" executed successfully (${timeline.length} steps)`);
  } catch (err) {
    assert(false, `Preset "${preset.label}" failed: ${err.message}`);
  }
});

console.log(`\n[DONE] Array & STL Mode Automated Verification: ${passed}/${total} checks passed!`);
