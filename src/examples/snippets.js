/**
 * C++ Quick Snippets Toolbar
 */

export const POINTER_SNIPPETS = [
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
    id: 'dll_prepend',
    label: '+ Prepend DLL',
    description: 'Insert new node at DLL head and update prev/next',
    code: `    DoublyListNode* newHead = new DoublyListNode(10);\n    newHead->next = head;\n    if (head != nullptr) head->prev = newHead;\n    head = newHead;\n`
  },
  {
    id: 'dll_delete',
    label: '+ Delete DLL Node',
    description: 'Bypass node links in both directions and delete',
    code: `    if (curr->prev != nullptr) curr->prev->next = curr->next;\n    if (curr->next != nullptr) curr->next->prev = curr->prev;\n    delete curr;\n`
  },
  {
    id: 'dll_reverse_step',
    label: '+ Reverse DLL Step',
    description: 'Swap prev and next pointers of a doubly linked node',
    code: `    DoublyListNode* temp = curr->prev;\n    curr->prev = curr->next;\n    curr->next = temp;\n    curr = curr->prev;\n`
  },
  {
    id: 'tree_base',
    label: '+ Tree Base Case',
    description: 'Null check base case for recursive tree functions',
    code: `    if (root == nullptr) {\n        return nullptr;\n    }\n`
  }
];

export const ARRAY_STL_SNIPPETS = [
  {
    id: 'vector_init',
    label: '+ Vector Push',
    description: 'std::vector declaration and push_back',
    code: `    vector<int> nums = {1, 2, 3};\n    nums.push_back(4);\n`
  },
  {
    id: 'stl_sort',
    label: '+ std::sort',
    description: 'Sort vector range in non-decreasing order',
    code: `    sort(nums.begin(), nums.end());\n`
  },
  {
    id: 'stl_reverse',
    label: '+ std::reverse',
    description: 'Reverse vector sequence in-place',
    code: `    reverse(nums.begin(), nums.end());\n`
  },
  {
    id: 'stl_stack',
    label: '+ Stack (LIFO)',
    description: 'std::stack push, pop, and top',
    code: `    stack<int> s;\n    s.push(10);\n    s.push(20);\n    int topVal = s.top();\n    s.pop();\n`
  },
  {
    id: 'stl_queue',
    label: '+ Queue (FIFO)',
    description: 'std::queue push, pop, and front',
    code: `    queue<int> q;\n    q.push(10);\n    q.push(20);\n    int frontVal = q.front();\n    q.pop();\n`
  },
  {
    id: 'stl_pair',
    label: '+ std::pair',
    description: 'std::pair and make_pair initialization',
    code: `    pair<int, int> p = {10, 20};\n    p.first = 50;\n`
  },
  {
    id: 'two_pointers_lr',
    label: '+ Two Pointers (L/R)',
    description: 'Left and Right pointers moving towards center',
    code: `    int left = 0, right = 4;\n    while (left < right) {\n        // do work\n        left++;\n        right--;\n    }\n`
  },
  {
    id: 'swap_elements',
    label: '+ Swap arr[i], arr[j]',
    description: 'In-place swap of two array elements',
    code: `    swap(arr[left], arr[right]);\n`
  },
  {
    id: 'binary_search_mid',
    label: '+ Binary Search Mid',
    description: 'Compute middle index preventing integer overflow',
    code: `    int mid = left + (right - left) / 2;\n`
  },
  {
    id: 'new_array',
    label: '+ New Array',
    description: 'Declare and initialize integer array',
    code: `    int arr[] = {10, 20, 30, 40, 50};\n    int n = 5;\n`
  }
];

// Aliases for backwards compatibility
export const DSA_SNIPPETS = ARRAY_STL_SNIPPETS;
export const SNIPPETS = POINTER_SNIPPETS;
