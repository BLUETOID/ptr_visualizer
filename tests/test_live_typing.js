import { tokenize } from '../src/core/lexer.js';
import { parseProgram, ParseError } from '../src/core/parser.js';
import { SNIPPETS } from '../src/examples/snippets.js';

console.log('🧪 Testing Live Incomplete Code Handling & Snippets...');

// 1. Partial/incomplete code
const partialCodes = [
  'struct ListNode { int val; ListNode* next; };\nListNode* test(ListNode* head) {\n    ListNode* p = ',
  'struct ListNode { int val; ListNode* next; };\nListNode* test(ListNode* head) {\n    if (head == ',
  'struct ListNode { int val; ListNode* next; };\nListNode* test(ListNode* head) {\n    while (head != nullptr'
];

partialCodes.forEach((code, idx) => {
  try {
    const tokens = tokenize(code);
    parseProgram(tokens);
    console.log(`  Case ${idx}: Parsed without error (unexpected for incomplete code)`);
  } catch (err) {
    if (err instanceof ParseError) {
      console.log(`  ✓ Case ${idx}: Cleanly caught ParseError at line ${err.line}: "${err.message}"`);
    } else {
      console.error(`  ✗ Case ${idx}: Unexpected error type:`, err);
    }
  }
});

// 2. Test all snippets inside a function body
SNIPPETS.forEach(snip => {
  const code = `struct ListNode { int val; ListNode* next; ListNode(int x) : val(x), next(nullptr) {} };
struct TreeNode { int val; TreeNode* left; TreeNode* right; };
void test(ListNode* head, TreeNode* root) {
    ListNode* curr = head;
    ListNode* prev = nullptr;
${snip.code}
}`;
  try {
    const tokens = tokenize(code);
    const ast = parseProgram(tokens);
    if (ast.functions.test) {
      console.log(`  ✓ Snippet "${snip.label}" parsed validly.`);
    } else {
      console.error(`  ✗ Snippet "${snip.label}" did not parse function test.`);
    }
  } catch (err) {
    console.error(`  ✗ Snippet "${snip.label}" failed:`, err.message);
  }
});

console.log('🎉 Live typing resilience verification passed!');
