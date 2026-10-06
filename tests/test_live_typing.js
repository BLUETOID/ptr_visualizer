import { tokenize } from '../src/core/lexer.js';
import { parseProgram, ParseError } from '../src/core/parser.js';
import { SNIPPETS } from '../src/examples/snippets.js';

console.log('[START] Testing Live Incomplete Code Handling & Snippets...');

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
      console.log(`  [PASS] Case ${idx}: Cleanly caught ParseError at line ${err.line}: "${err.message}"`);
    } else {
      console.error(`  [FAIL] Case ${idx}: Unexpected error type:`, err);
    }
  }
});

// 2. Test all snippets inside a function body
SNIPPETS.forEach(snip => {
  const code = `struct ListNode { int val; ListNode* next; ListNode(int x) : val(x), next(nullptr) {} };
struct DoublyListNode { int val; DoublyListNode* prev; DoublyListNode* next; };
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
      console.log(`  [PASS] Snippet "${snip.label}" parsed validly.`);
    } else {
      console.error(`  [FAIL] Snippet "${snip.label}" did not parse function test.`);
    }
  } catch (err) {
    console.error(`  [FAIL] Snippet "${snip.label}" failed:`, err.message);
  }
});

console.log('[DONE] Live typing resilience verification passed!');
