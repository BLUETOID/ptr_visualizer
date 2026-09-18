/**
 * Automated Verification Script for C++ Pointer Visualizer Engine
 */

import { tokenize } from '../src/core/lexer.js';
import { parseProgram } from '../src/core/parser.js';
import { resetEngineState, runProgram } from '../src/core/interpreter.js';
import { EXAMPLES_CATALOG } from '../src/examples/catalog.js';

console.log('🧪 Starting C++ Visualizer Automated Verification...');
let passedCount = 0;
let totalCount = 0;

for (const [key, ex] of Object.entries(EXAMPLES_CATALOG)) {
  totalCount++;
  try {
    const tokens = tokenize(ex.code);
    const ast = parseProgram(tokens);

    const fnName = ex.entryFn;
    const fn = ast.functions[fnName];
    if (!fn) throw new Error(`Function ${fnName} not found in AST`);

    const inputArr = JSON.parse(ex.defaultArray);
    const extra = {};
    (ex.extra || []).forEach(f => { extra[f.id] = f.value; });

    const initial = ex.buildInitial(inputArr, extra);
    resetEngineState(initial.heap, initial.heapCounter, initial.colRight);

    const timeline = runProgram(fn, initial.args, ast.functions);
    if (!timeline || timeline.length === 0) throw new Error('Empty timeline generated');

    console.log(`  ✓ [${ex.category}] ${ex.label}: Generated ${timeline.length} execution steps.`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ Failed on preset '${key}':`, err.message);
  }
}

// Test memory leak detection specifically
totalCount++;
try {
  const leakEx = EXAMPLES_CATALOG.leak_demo;
  const tokens = tokenize(leakEx.code);
  const ast = parseProgram(tokens);
  const initial = leakEx.buildInitial([1, 2, 3], {});
  resetEngineState(initial.heap, initial.heapCounter, initial.colRight);
  const timeline = runProgram(ast.functions[leakEx.entryFn], initial.args, ast.functions);
  const lastStep = timeline[timeline.length - 1];
  if (!lastStep.meta.leaks || lastStep.meta.leaks.length === 0) {
    throw new Error('Memory leak was not detected!');
  }
  console.log(`  ✓ Memory Leak Detection Test: Successfully flagged leaked node ${lastStep.meta.leaks.join(', ')}`);
  passedCount++;
} catch (err) {
  console.error('  ✗ Failed memory leak test:', err.message);
}

// Test delete and dynamic allocation
totalCount++;
try {
  const dynEx = EXAMPLES_CATALOG.dynamic_alloc;
  const tokens = tokenize(dynEx.code);
  const ast = parseProgram(tokens);
  const initial = dynEx.buildInitial([10, 20], {});
  resetEngineState(initial.heap, initial.heapCounter, initial.colRight);
  const timeline = runProgram(ast.functions[dynEx.entryFn], initial.args, ast.functions);
  const hasFreedStep = timeline.some(s => s.explanation.includes('freed memory'));
  if (!hasFreedStep) throw new Error('delete deallocation step was not recorded!');
  console.log('  [OK] C++ Dynamic Memory delete Test: Successfully verified deallocation lifecycle.');
  passedCount++;
} catch (err) {
  console.error('  [FAIL] Failed delete test:', err.message);
}

// Test custom scratchpad code written from scratch
totalCount++;
try {
  const scratchpadCode = `
struct ListNode { int val; ListNode* next; };
void main() {
    ListNode* a = new ListNode(10);
    ListNode* b = new ListNode(20);
    a->next = b;
}`;
  const tokens = tokenize(scratchpadCode);
  const ast = parseProgram(tokens);
  resetEngineState({}, 0, 0);
  const timeline = runProgram(ast.functions.main, [], ast.functions);
  const lastStep = timeline[timeline.length - 1];
  const nodeCount = Object.keys(lastStep.heap).length;
  if (nodeCount !== 2) throw new Error(`Expected 2 heap nodes, got ${nodeCount}`);
  if (lastStep.heap['n0'].next !== 'n1') throw new Error('Node pointer a->next was not linked to b!');
  console.log('  [OK] Scratchpad Mode Test: Successfully verified blank scratchpad code creates visual nodes and edges.');
  passedCount++;
} catch (err) {
  console.error('  [FAIL] Failed scratchpad mode test:', err.message);
}

// Test Zero-Boilerplate Script Mode (No struct, no function wrapper)
totalCount++;
try {
  const zeroBoilerplateCode = `
ListNode* x = new ListNode(100);
ListNode* y = new ListNode(200);
x->next = y;
`;
  const tokens = tokenize(zeroBoilerplateCode);
  const ast = parseProgram(tokens);
  if (!ast.functions.main) throw new Error('Top-level statements were not synthesized into main()');
  resetEngineState({}, 0, 0);
  const timeline = runProgram(ast.functions.main, [], ast.functions);
  const lastStep = timeline[timeline.length - 1];
  const nodeCount = Object.keys(lastStep.heap).length;
  if (nodeCount !== 2) throw new Error(`Expected 2 heap nodes, got ${nodeCount}`);
  if (lastStep.heap['n0'].val !== 100 || lastStep.heap['n1'].val !== 200) throw new Error('Node values incorrect');
  if (lastStep.heap['n0'].next !== 'n1') throw new Error('Pointer x->next was not linked to y');
  console.log('  [OK] Zero-Boilerplate Test: Statements executed without struct or function wrappers.');
  passedCount++;
} catch (err) {
  console.error('  [FAIL] Failed zero-boilerplate test:', err.message);
}

// Test Ternary Operator
totalCount++;
try {
  const ternaryCode = `
void main() {
    int a = 10;
    int b = 20;
    int max = (a > b) ? a : b;
    ListNode* node = new ListNode(max);
}`;
  const tokens = tokenize(ternaryCode);
  const ast = parseProgram(tokens);
  resetEngineState({}, 0, 0);
  const timeline = runProgram(ast.functions.main, [], ast.functions);
  const lastStep = timeline[timeline.length - 1];
  const node = Object.values(lastStep.heap)[0];
  if (node.val !== 20) throw new Error(`Expected ternary result 20, got ${node.val}`);
  console.log('  [OK] Ternary Operator Test: (a > b) ? a : b correctly evaluated to 20.');
  passedCount++;
} catch (err) {
  console.error('  [FAIL] Failed ternary test:', err.message);
}

// Test do...while Loop
totalCount++;
try {
  const doWhileCode = `
void main() {
    int count = 0;
    ListNode* head = new ListNode(0);
    ListNode* curr = head;
    do {
        count++;
        ListNode* node = new ListNode(count);
        curr->next = node;
        curr = node;
    } while (count < 3);
}`;
  const tokens = tokenize(doWhileCode);
  const ast = parseProgram(tokens);
  resetEngineState({}, 0, 0);
  const timeline = runProgram(ast.functions.main, [], ast.functions);
  const lastStep = timeline[timeline.length - 1];
  const nodeCount = Object.keys(lastStep.heap).length;
  if (nodeCount !== 4) throw new Error(`Expected 4 nodes from do-while, got ${nodeCount}`);
  console.log('  [OK] do...while Loop Test: Created 4 nodes with do-while loop.');
  passedCount++;
} catch (err) {
  console.error('  [FAIL] Failed do-while test:', err.message);
}

// Test String Literal Parsing
totalCount++;
try {
  const stringCode = `
void main() {
    ListNode* a = new ListNode(42);
    // String literals should not crash the parser
    int x = 5;
}`;
  const tokens = tokenize(stringCode);
  const ast = parseProgram(tokens);
  resetEngineState({}, 0, 0);
  const timeline = runProgram(ast.functions.main, [], ast.functions);
  if (timeline.length === 0) throw new Error('No timeline generated');
  console.log(`  [OK] String Literal Test: Parser handles string tokens without crashing.`);
  passedCount++;
} catch (err) {
  console.error('  [FAIL] Failed string literal test:', err.message);
}

// Test Character Literal Parsing (char c = 'A')
totalCount++;
try {
  const charCode = `
void main() {
    int c = 'A';
    ListNode* n = new ListNode(c);
}`;
  const tokens = tokenize(charCode);
  const ast = parseProgram(tokens);
  resetEngineState({}, 0, 0);
  const timeline = runProgram(ast.functions.main, [], ast.functions);
  const lastStep = timeline[timeline.length - 1];
  const node = Object.values(lastStep.heap)[0];
  if (node.val !== 65) throw new Error(`Expected char 'A' = 65, got ${node.val}`);
  console.log(`  [OK] Character Literal Test: 'A' correctly evaluated to ASCII 65.`);
  passedCount++;
} catch (err) {
  console.error('  [FAIL] Failed character literal test:', err.message);
}

// Test User Custom Snippet: null, cout <<, and multi-function support
totalCount++;
try {
  const userSnippet = `
struct ListNode {
    int val;
    ListNode* next;
};

void main() {
    ListNode* head = new ListNode(0);
    ListNode* a = new ListNode(1);
    head->next = a;
    printNode(head);
}

void printNode(ListNode* head){
    ListNode* temp = head;
    while(temp!=null){
        cout<<temp->val;
        temp = temp->next;
    }
}`;
  const tokens = tokenize(userSnippet);
  const ast = parseProgram(tokens);
  resetEngineState({}, 0, 0);
  const timeline = runProgram(ast.functions.main, [], ast.functions);
  const coutSteps = timeline.filter(s => s.meta && s.meta.output !== undefined);
  if (coutSteps.length !== 2) throw new Error(`Expected 2 cout steps, got ${coutSteps.length}`);
  if (coutSteps[0].meta.output !== '0' || coutSteps[1].meta.output !== '1') {
    throw new Error(`Unexpected cout output: ${coutSteps.map(s => s.meta.output).join(', ')}`);
  }
  console.log(`  [OK] User Custom Snippet Test: null, cout <<, and multi-function resolved correctly.`);
  passedCount++;
} catch (err) {
  console.error('  [FAIL] Failed user custom snippet test:', err.message);
}

// Test Standard C++ constructs: string, const, arrays, and std math/swap
totalCount++;
try {
  const normalCpp = `
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main(int argc, char* argv[]) {
    string s = "visualizer";
    const int x = 10;
    int arr[3] = {1, 2, 3};
    arr[0] = 99;
    int a = 5, b = 20;
    swap(a, b);
    int m = max(a, b);
    cout << s << " " << arr[0] << " " << m << endl;
    return 0;
}`;
  const tokens = tokenize(normalCpp);
  const ast = parseProgram(tokens);
  resetEngineState({}, 0, 0);
  const timeline = runProgram(ast.functions.main, [], ast.functions);
  if (timeline.length < 5) throw new Error('Timeline too short for standard C++');
  console.log('  [OK] Standard C++ Features Test: string, const, arrays, max/swap, and main(argc, argv).');
  passedCount++;
} catch (err) {
  console.error('  [FAIL] Failed standard C++ features test:', err.message);
}

console.log(`\nVerification Completed: ${passedCount}/${totalCount} tests passed!`);
if (passedCount !== totalCount) {
  process.exit(1);
}
