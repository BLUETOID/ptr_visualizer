/**
 * Comprehensive C++ Pointer & Data Structure Algorithm Catalog
 */

function buildListHelper(arr) {
  const localHeap = {};
  let counter = 0;
  let prevId = null, headId = null;
  const ids = [];
  arr.forEach((v, idx) => {
    const id = 'n' + (counter++);
    localHeap[id] = { id, structType: 'ListNode', val: v, next: null, col: idx, stackAllocated: false, freed: false };
    ids.push(id);
    if (prevId !== null) localHeap[prevId].next = id;
    else headId = id;
    prevId = id;
  });
  return { heap: localHeap, ids, headId, heapCounter: counter };
}

function buildDoublyListHelper(arr) {
  const localHeap = {};
  let counter = 0;
  let prevId = null, headId = null;
  const ids = [];
  arr.forEach((v, idx) => {
    const id = 'n' + (counter++);
    localHeap[id] = {
      id,
      structType: 'DoublyListNode',
      val: v,
      prev: prevId,
      next: null,
      col: idx,
      stackAllocated: false,
      freed: false
    };
    ids.push(id);
    if (prevId !== null) localHeap[prevId].next = id;
    else headId = id;
    prevId = id;
  });
  return { heap: localHeap, ids, headId, heapCounter: counter };
}

function buildTreeHelper(arr) {
  const localHeap = {};
  let counter = 0;
  if (!arr.length || arr[0] === null || arr[0] === undefined) {
    return { heap: localHeap, rootId: null, heapCounter: 0 };
  }
  const makeNode = (v) => {
    const id = 'n' + (counter++);
    localHeap[id] = { id, structType: 'TreeNode', val: v, left: null, right: null, freed: false };
    return id;
  };
  const rootId = makeNode(arr[0]);
  const queue = [rootId];
  let i = 1;
  while (i < arr.length && queue.length) {
    const curId = queue.shift();
    if (i < arr.length) {
      const lv = arr[i++];
      if (lv !== null && lv !== undefined) {
        const lid = makeNode(lv);
        localHeap[curId].left = lid;
        queue.push(lid);
      }
    }
    if (i < arr.length) {
      const rv = arr[i++];
      if (rv !== null && rv !== undefined) {
        const rid = makeNode(rv);
        localHeap[curId].right = rid;
        queue.push(rid);
      }
    }
  }
  return { heap: localHeap, rootId, heapCounter: counter };
}

export const EXAMPLES_CATALOG = {
  // ==========================================
  // SCRATCHPAD (BLANK PLAYGROUND)
  // ==========================================
  scratchpad: {
    id: 'scratchpad',
    category: 'Scratchpad',
    label: 'Scratchpad · Blank Slate',
    badge: 'Playground',
    info: 'Freeform C++ pointer sandbox. Create nodes with new or on stack and see them appear live.',
    structureType: 'list',
    entryFn: 'main',
    defaultArray: '[]',
    extra: [],
    code: `struct ListNode {
    int val;
    ListNode* next;
};

void main() {
    ListNode* a = new ListNode(1);
    ListNode* b = new ListNode(2);
    ListNode* c = new ListNode(3);

    a->next = b;
    b->next = c;
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  // ==========================================
  // SINGLY LINKED LISTS
  // ==========================================
  lc206: {
    id: 'lc206',
    category: 'Singly Linked List',
    label: 'LC 206 · Reverse Linked List',
    badge: 'Essential',
    info: 'Iteratively rewires each node\'s next pointer to point to its predecessor.',
    structureType: 'list',
    entryFn: 'reverseList',
    defaultArray: '[1, 2, 3, 4, 5]',
    extra: [],
    code: `struct ListNode {
    int val;
    ListNode* next;
};

ListNode* reverseList(ListNode* head) {
    ListNode* prev = nullptr;
    ListNode* curr = head;

    while (curr != nullptr) {
        ListNode* next = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}` ,
    buildInitial(arr) {
      const b = buildListHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId] };
    }
  },

  lc141: {
    id: 'lc141',
    category: 'Singly Linked List',
    label: 'LC 141 · Linked List Cycle',
    badge: 'Two Pointers',
    info: 'Floyd\'s Cycle Finding Algorithm (Tortoise & Hare) using slow & fast pointers.',
    structureType: 'list',
    entryFn: 'hasCycle',
    defaultArray: '[3, 2, 0, -4]',
    extra: [{ id: 'cyclePos', label: 'Cycle To Index', type: 'number', value: 1 }],
    code: `struct ListNode {
    int val;
    ListNode* next;
};

bool hasCycle(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;

    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {
            return true;
        }
    }
    return false;
}`,
    buildInitial(arr, extra) {
      const b = buildListHelper(arr);
      const pos = extra.cyclePos;
      if (Number.isInteger(pos) && pos >= 0 && pos < b.ids.length && b.ids.length > 0) {
        b.heap[b.ids[b.ids.length - 1]].next = b.ids[pos];
      }
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId] };
    }
  },

  lc876: {
    id: 'lc876',
    category: 'Singly Linked List',
    label: 'LC 876 · Middle of Linked List',
    badge: 'Two Pointers',
    info: 'Slow advances 1 step while fast advances 2 steps. When fast hits the end, slow is at the middle.',
    structureType: 'list',
    entryFn: 'middleNode',
    defaultArray: '[1, 2, 3, 4, 5]',
    extra: [],
    code: `struct ListNode {
    int val;
    ListNode* next;
};

ListNode* middleNode(ListNode* head) {
    ListNode* slow = head;
    ListNode* fast = head;

    while (fast != nullptr && fast->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;
}`,
    buildInitial(arr) {
      const b = buildListHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId] };
    }
  },

  lc24: {
    id: 'lc24',
    category: 'Singly Linked List',
    label: 'LC 24 · Swap Nodes in Pairs',
    badge: 'Dummy Head',
    info: 'Swaps every two adjacent nodes in the list using a stack-allocated dummy node.',
    structureType: 'list',
    entryFn: 'swapPairs',
    defaultArray: '[1, 2, 3, 4]',
    extra: [],
    code: `struct ListNode {
    int val;
    ListNode* next;
};

ListNode* swapPairs(ListNode* head) {
    ListNode dummy(0);
    dummy.next = head;
    ListNode* prev = &dummy;

    while (prev->next != nullptr && prev->next->next != nullptr) {
        ListNode* first = prev->next;
        ListNode* second = first->next;

        first->next = second->next;
        second->next = first;
        prev->next = second;
        prev = first;
    }
    return dummy.next;
}`,
    buildInitial(arr) {
      const b = buildListHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId] };
    }
  },

  lc19: {
    id: 'lc19',
    category: 'Singly Linked List',
    label: 'LC 19 · Remove N-th Node From End',
    badge: 'Two Pointers',
    info: 'Two pointers spaced n apart. When the leader hits end, the follower deletes the target.',
    structureType: 'list',
    entryFn: 'removeNthFromEnd',
    defaultArray: '[1, 2, 3, 4, 5]',
    extra: [{ id: 'n', label: 'n', type: 'number', value: 2 }],
    code: `struct ListNode {
    int val;
    ListNode* next;
};

ListNode* removeNthFromEnd(ListNode* head, int n) {
    ListNode dummy(0);
    dummy.next = head;
    ListNode* fast = &dummy;
    ListNode* slow = &dummy;

    for (int i = 0; i < n; i++) {
        fast = fast->next;
    }

    while (fast->next != nullptr) {
        fast = fast->next;
        slow = slow->next;
    }

    ListNode* toDelete = slow->next;
    slow->next = slow->next->next;
    delete toDelete;

    return dummy.next;
}`,
    buildInitial(arr, extra) {
      const b = buildListHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId, extra.n || 2] };
    }
  },

  // ==========================================
  // DOUBLY LINKED LISTS
  // ==========================================
  dll_insert: {
    id: 'dll_insert',
    category: 'Doubly Linked List',
    label: 'DLL · Insert & Link Nodes',
    badge: 'Bidirectional',
    info: 'Inserts a new heap node between two existing nodes in a doubly linked list.',
    structureType: 'list',
    entryFn: 'insertAfter',
    defaultArray: '[10, 20, 30]',
    extra: [{ id: 'newVal', label: 'New Value', type: 'number', value: 25 }],
    code: `struct DoublyListNode {
    int val;
    DoublyListNode* prev;
    DoublyListNode* next;
};

DoublyListNode* insertAfter(DoublyListNode* head, int newVal) {
    DoublyListNode* curr = head;

    // Advance to 2nd node
    if (curr != nullptr && curr->next != nullptr) {
        curr = curr->next;
    }

    DoublyListNode* newNode = new DoublyListNode(newVal);
    newNode->next = curr->next;
    newNode->prev = curr;

    if (curr->next != nullptr) {
        curr->next->prev = newNode;
    }
    curr->next = newNode;

    return head;
}`,
    buildInitial(arr, extra) {
      const b = buildDoublyListHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId, extra.newVal || 25] };
    }
  },

  // ==========================================
  // BINARY TREES
  // ==========================================
  lc226: {
    id: 'lc226',
    category: 'Binary Tree',
    label: 'LC 226 · Invert Binary Tree',
    badge: 'Recursion',
    info: 'Recursively inverts a binary tree by swapping the left and right child pointers of each node.',
    structureType: 'tree',
    entryFn: 'invertTree',
    defaultArray: '[4, 2, 7, 1, 3, 6, 9]',
    extra: [],
    code: `struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

TreeNode* invertTree(TreeNode* root) {
    if (root == nullptr) {
        return root;
    }

    TreeNode* temp = root->left;
    root->left = root->right;
    root->right = temp;

    invertTree(root->left);
    invertTree(root->right);

    return root;
}`,
    buildInitial(arr) {
      const b = buildTreeHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: 0, args: [b.rootId] };
    }
  },

  lc104: {
    id: 'lc104',
    category: 'Binary Tree',
    label: 'LC 104 · Maximum Depth of Tree',
    badge: 'Recursion',
    info: 'Finds the maximum depth from root to furthest leaf by traversing left and right subtrees.',
    structureType: 'tree',
    entryFn: 'maxDepth',
    defaultArray: '[3, 9, 20, null, null, 15, 7]',
    extra: [],
    code: `struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

int maxDepth(TreeNode* root) {
    if (root == nullptr) {
        return 0;
    }

    int leftDepth = maxDepth(root->left);
    int rightDepth = maxDepth(root->right);

    if (leftDepth > rightDepth) {
        return leftDepth + 1;
    } else {
        return rightDepth + 1;
    }
}`,
    buildInitial(arr) {
      const b = buildTreeHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: 0, args: [b.rootId] };
    }
  },

  lc700: {
    id: 'lc700',
    category: 'Binary Tree',
    label: 'LC 700 · Search in BST',
    badge: 'BST',
    info: 'Navigates left or right in a Binary Search Tree depending on the target value.',
    structureType: 'tree',
    entryFn: 'searchBST',
    defaultArray: '[4, 2, 7, 1, 3]',
    extra: [{ id: 'target', label: 'Target Val', type: 'number', value: 2 }],
    code: `struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

TreeNode* searchBST(TreeNode* root, int val) {
    TreeNode* curr = root;

    while (curr != nullptr) {
        if (curr->val == val) {
            return curr;
        }
        if (val < curr->val) {
            curr = curr->left;
        } else {
            curr = curr->right;
        }
    }
    return nullptr;
}`,
    buildInitial(arr, extra) {
      const b = buildTreeHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: 0, args: [b.rootId, extra.target || 2] };
    }
  },

  // ==========================================
  // C++ MEMORY & POINTERS
  // ==========================================
  dynamic_alloc: {
    id: 'dynamic_alloc',
    category: 'Pointers & Dynamic Memory',
    label: 'C++ · new & delete Lifecycle',
    badge: 'Memory Mgmt',
    info: 'Demonstrates dynamic heap allocation with new, linking pointers, and safe deallocation with delete.',
    structureType: 'list',
    entryFn: 'memoryLifecycle',
    defaultArray: '[10, 20]',
    extra: [],
    code: `struct ListNode {
    int val;
    ListNode* next;
};

ListNode* memoryLifecycle(ListNode* head) {
    // 1. Dynamically allocate a new node on the heap
    ListNode* newNode = new ListNode(99);

    // 2. Insert newNode at head
    newNode->next = head;
    head = newNode;

    // 3. Delete the last node safely
    ListNode* curr = head;
    while (curr->next != nullptr && curr->next->next != nullptr) {
        curr = curr->next;
    }

    ListNode* oldTail = curr->next;
    curr->next = nullptr;
    delete oldTail;

    return head;
}`,
    buildInitial(arr) {
      const b = buildListHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId] };
    }
  },

  leak_demo: {
    id: 'leak_demo',
    category: 'Pointers & Dynamic Memory',
    label: 'C++ · Memory Leak Warning',
    badge: 'Bug Visualizer',
    info: 'Shows what happens when a node is orphaned without calling delete (visual leak detector flags it in amber).',
    structureType: 'list',
    entryFn: 'leakDemo',
    defaultArray: '[1, 2, 3]',
    extra: [],
    code: `struct ListNode {
    int val;
    ListNode* next;
};

ListNode* leakDemo(ListNode* head) {
    // Unlink 2nd node without freeing it -> MEMORY LEAK!
    head->next = head->next->next;
    return head;
}`,
    buildInitial(arr) {
      const b = buildListHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId] };
    }
  },

  // ==========================================
  // MORE SINGLY LINKED LIST ALGORITHMS
  // ==========================================
  lc234: {
    id: 'lc234',
    category: 'Singly Linked List',
    label: 'LC 234 · Palindrome Linked List',
    badge: 'Fast & Slow',
    info: 'Finds the middle with two pointers, reverses the second half, and verifies symmetry node-by-node.',
    structureType: 'list',
    entryFn: 'isPalindrome',
    defaultArray: '[1, 2, 2, 1]',
    extra: [],
    code: `struct ListNode {
    int val;
    ListNode* next;
};

bool isPalindrome(ListNode* head) {
    if (head == nullptr || head->next == nullptr) {
        return true;
    }

    // 1. Find the middle node
    ListNode* slow = head;
    ListNode* fast = head;
    while (fast->next != nullptr && fast->next->next != nullptr) {
        slow = slow->next;
        fast = fast->next->next;
    }

    // 2. Reverse second half
    ListNode* prev = nullptr;
    ListNode* curr = slow->next;
    while (curr != nullptr) {
        ListNode* next = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next;
    }

    // 3. Compare first half and reversed second half
    ListNode* p1 = head;
    ListNode* p2 = prev;
    while (p2 != nullptr) {
        if (p1->val != p2->val) {
            return false;
        }
        p1 = p1->next;
        p2 = p2->next;
    }
    return true;
}`,
    buildInitial(arr) {
      const b = buildListHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId] };
    }
  },

  // ==========================================
  // MORE BINARY TREE ALGORITHMS
  // ==========================================
  lc701: {
    id: 'lc701',
    category: 'Binary Tree',
    label: 'LC 701 · Insert into BST',
    badge: 'BST Insert',
    info: 'Navigates the binary search tree, locates the target leaf spot, dynamically allocates new TreeNode, and links it.',
    structureType: 'tree',
    entryFn: 'insertIntoBST',
    defaultArray: '[4, 2, 7, 1, 3]',
    extra: [{ id: 'val', label: 'Insert Val', type: 'number', value: 5 }],
    code: `struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

TreeNode* insertIntoBST(TreeNode* root, int val) {
    if (root == nullptr) {
        return new TreeNode(val);
    }

    TreeNode* curr = root;
    while (curr != nullptr) {
        if (val < curr->val) {
            if (curr->left == nullptr) {
                curr->left = new TreeNode(val);
                break;
            }
            curr = curr->left;
        } else {
            if (curr->right == nullptr) {
                curr->right = new TreeNode(val);
                break;
            }
            curr = curr->right;
        }
    }
    return root;
}`,
    buildInitial(arr, extra) {
      const b = buildTreeHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: 0, args: [b.rootId, extra.val !== undefined ? extra.val : 5] };
    }
  },

  tree_max: {
    id: 'tree_max',
    category: 'Binary Tree',
    label: 'Tree · Maximum Value (Recursion & ? :)',
    badge: 'Ternary Recursion',
    info: 'Recursively finds maximum node value in binary tree using nested ternary operators (? :).',
    structureType: 'tree',
    entryFn: 'findMax',
    defaultArray: '[3, 9, 20, null, null, 15, 7]',
    extra: [],
    code: `struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
};

int findMax(TreeNode* root) {
    if (root == nullptr) {
        return 0;
    }

    int leftMax = findMax(root->left);
    int rightMax = findMax(root->right);

    int subMax = (leftMax > rightMax) ? leftMax : rightMax;
    return (root->val > subMax) ? root->val : subMax;
}`,
    buildInitial(arr) {
      const b = buildTreeHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: 0, args: [b.rootId] };
    }
  },

  // ==========================================
  // DATA STRUCTURES & DYNAMIC MEMORY
  // ==========================================
  stack_ll: {
    id: 'stack_ll',
    category: 'Pointers & Dynamic Memory',
    label: 'Stack (LIFO) · Dynamic Push & Pop',
    badge: 'Data Structure',
    info: 'Simulates a dynamic stack on the heap: push allocates new nodes at the top, and pop detaches and frees them with delete.',
    structureType: 'list',
    entryFn: 'runStackDemo',
    defaultArray: '[10, 20]',
    extra: [{ id: 'pushVal', label: 'Push Val', type: 'number', value: 30 }],
    code: `struct ListNode {
    int val;
    ListNode* next;
};

ListNode* runStackDemo(ListNode* head, int pushVal) {
    ListNode* top = head;

    // Push new node onto the stack
    ListNode* newNode = new ListNode(pushVal);
    newNode->next = top;
    top = newNode;

    // Pop the top node safely
    ListNode* popped = top;
    top = top->next;
    delete popped;

    return top;
}`,
    buildInitial(arr, extra) {
      const b = buildListHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId, extra.pushVal !== undefined ? extra.pushVal : 30] };
    }
  },

  queue_ll: {
    id: 'queue_ll',
    category: 'Pointers & Dynamic Memory',
    label: 'Queue (FIFO) · Enqueue & Dequeue',
    badge: 'Data Structure',
    info: 'Simulates a FIFO queue using head and tail pointers: enqueue appends at tail, dequeue removes from head and frees it.',
    structureType: 'list',
    entryFn: 'runQueueDemo',
    defaultArray: '[10, 20, 30]',
    extra: [{ id: 'newVal', label: 'Enqueue Val', type: 'number', value: 40 }],
    code: `struct ListNode {
    int val;
    ListNode* next;
};

ListNode* runQueueDemo(ListNode* head, int newVal) {
    ListNode* tail = head;
    while (tail->next != nullptr) {
        tail = tail->next;
    }

    // Enqueue at tail
    ListNode* newNode = new ListNode(newVal);
    tail->next = newNode;
    tail = newNode;

    // Dequeue from head
    ListNode* oldHead = head;
    head = head->next;
    delete oldHead;

    return head;
}`,
    buildInitial(arr, extra) {
      const b = buildListHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId, extra.newVal !== undefined ? extra.newVal : 40] };
    }
  },

  // ==========================================
  // MODERN LANGUAGE FEATURES
  // ==========================================
  list_partition: {
    id: 'list_partition',
    category: 'Modern Language Features',
    label: 'Partition Demo · do...while & Ternary',
    badge: 'do-while & ? :',
    info: 'Demonstrates do-while loops and ternary operator: traverses nodes and counts partitions by pivot.',
    structureType: 'list',
    entryFn: 'partitionDemo',
    defaultArray: '[1, 4, 3, 2, 5]',
    extra: [{ id: 'pivot', label: 'Pivot', type: 'number', value: 3 }],
    code: `struct ListNode {
    int val;
    ListNode* next;
};

ListNode* partitionDemo(ListNode* head, int pivot) {
    if (head == nullptr) return nullptr;

    ListNode* curr = head;
    int lessCount = 0;
    int greaterCount = 0;

    // Post-condition traversal using do...while
    do {
        // Ternary conditional expression
        lessCount += (curr->val < pivot) ? 1 : 0;
        greaterCount += (curr->val >= pivot) ? 1 : 0;
        curr = curr->next;
    } while (curr != nullptr);

    return head;
}`,
    buildInitial(arr, extra) {
      const b = buildListHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId, extra.pivot !== undefined ? extra.pivot : 3] };
    }
  }
};
