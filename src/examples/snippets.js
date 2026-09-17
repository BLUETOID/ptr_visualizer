/**
 * C++ Quick Snippets Toolbar
 */

export const SNIPPETS = [
  {
    id: 'dummy',
    label: '+ Dummy Node',
    description: 'Stack-allocated dummy head pattern for edge-case safety',
    code: `    ListNode dummy(0);\n    dummy.next = head;\n    ListNode* prev = &dummy;\n`
  },
  {
    id: 'two_pointers',
    label: '+ Two Pointers',
    description: 'Fast and slow pointer setup for middle or cycle detection',
    code: `    ListNode* slow = head;\n    ListNode* fast = head;\n`
  },
  {
    id: 'traverse',
    label: '+ Traversal Loop',
    description: 'Standard while loop advancing pointer through linked list',
    code: `    while (curr != nullptr) {\n        // do work\n        curr = curr->next;\n    }\n`
  },
  {
    id: 'swap_step',
    label: '+ Reverse Step',
    description: 'Core 4-line pointer reversal step',
    code: `        ListNode* next = curr->next;\n        curr->next = prev;\n        prev = curr;\n        curr = next;\n`
  },
  {
    id: 'safe_delete',
    label: '+ Safe Delete',
    description: 'Unlink and deallocate memory safely with delete',
    code: `    ListNode* toDelete = curr->next;\n    curr->next = curr->next->next;\n    delete toDelete;\n`
  },
  {
    id: 'new_node',
    label: '+ New Heap Node',
    description: 'Allocate dynamic node on heap using new',
    code: `    ListNode* newNode = new ListNode(100);\n    newNode->next = head;\n    head = newNode;\n`
  },
  {
    id: 'tree_base',
    label: '+ Tree Base Case',
    description: 'Null check base case for recursive tree functions',
    code: `    if (root == nullptr) {\n        return nullptr;\n    }\n`
  }
];
