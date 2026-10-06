/**
 * Comprehensive C++ Pointer & Data Structure Algorithm Catalog
 */

export function buildListHelper(arr) {
  if (Array.isArray(arr) && arr.length > 0 && Array.isArray(arr[0])) {
    const multi = buildMultiListHelper(arr);
    return {
      heap: multi.heap,
      ids: Object.keys(multi.heap),
      headId: multi.heads[0] || null,
      heads: multi.heads,
      heapCounter: multi.heapCounter,
      colRight: multi.maxCol
    };
  }
  const localHeap = {};
  let counter = 0;
  let prevId = null, headId = null;
  const ids = [];
  arr.forEach((v, idx) => {
    const id = 'n' + (counter++);
    localHeap[id] = { id, structType: 'ListNode', val: v, next: null, col: idx, row: 0, stackAllocated: false, freed: false };
    ids.push(id);
    if (prevId !== null) localHeap[prevId].next = id;
    else headId = id;
    prevId = id;
  });
  return { heap: localHeap, ids, headId, heads: [headId], heapCounter: counter, colRight: arr.length };
}

export function buildMultiListHelper(arrays, isDLL = false) {
  const localHeap = {};
  let counter = 0;
  const heads = [];
  let maxLen = 0;
  arrays.forEach((arr, rowIdx) => {
    if (!Array.isArray(arr)) return;
    if (arr.length > maxLen) maxLen = arr.length;
    let prevId = null, headId = null;
    arr.forEach((v, colIdx) => {
      const id = 'n' + (counter++);
      localHeap[id] = {
        id,
        structType: isDLL ? 'DoublyListNode' : 'ListNode',
        val: v,
        next: null,
        col: colIdx,
        row: rowIdx,
        stackAllocated: false,
        freed: false
      };
      if (isDLL) {
        localHeap[id].prev = prevId;
      }
      if (prevId !== null) localHeap[prevId].next = id;
      else headId = id;
      prevId = id;
    });
    heads.push(headId);
  });
  return { heap: localHeap, heads, heapCounter: counter, maxCol: maxLen };
}

export function buildDoublyListHelper(arr) {
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
      if (Array.isArray(arr) && arr.length > 0) {
        if (Array.isArray(arr[0])) {
          const m = buildMultiListHelper(arr);
          return { heap: m.heap, heapCounter: m.heapCounter, colRight: m.maxCol, args: m.heads };
        } else {
          const b = buildListHelper(arr);
          return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId] };
        }
      }
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  // ==========================================
  // SINGLY LINKED LISTS
  // ==========================================
  lc21: {
    id: 'lc21',
    category: 'Singly Linked List',
    label: 'LC 21 · Merge Two Sorted Lists',
    badge: 'Multi-List',
    info: 'Splices nodes of two sorted linked lists together into one sorted list.',
    structureType: 'list',
    entryFn: 'mergeTwoLists',
    defaultArray: '[[1, 2, 4], [1, 3, 4]]',
    extra: [],
    code: `struct ListNode {
    int val;
    ListNode* next;
};

ListNode* mergeTwoLists(ListNode* list1, ListNode* list2) {
    ListNode dummy(0);
    ListNode* tail = &dummy;

    while (list1 != nullptr && list2 != nullptr) {
        if (list1->val <= list2->val) {
            tail->next = list1;
            list1 = list1->next;
        } else {
            tail->next = list2;
            list2 = list2->next;
        }
        tail = tail->next;
    }
    tail->next = (list1 != nullptr) ? list1 : list2;
    return dummy.next;
}`,
    buildInitial(arr) {
      const lists = (Array.isArray(arr) && arr.length > 0 && Array.isArray(arr[0]))
        ? arr
        : [[1, 2, 4], [1, 3, 4]];
      const m = buildMultiListHelper(lists);
      return { heap: m.heap, heapCounter: m.heapCounter, colRight: m.maxCol, args: m.heads };
    }
  },

  lc160: {
    id: 'lc160',
    category: 'Singly Linked List',
    label: 'LC 160 · Intersection of Two Lists',
    badge: 'Multi-List',
    info: 'Two pointers traverse both lists with wrap-around to locate the intersection node.',
    structureType: 'list',
    entryFn: 'getIntersectionNode',
    defaultArray: '[[4, 1, 8, 4, 5], [5, 6, 1, 8, 4, 5]]',
    extra: [],
    code: `struct ListNode {
    int val;
    ListNode* next;
};

ListNode* getIntersectionNode(ListNode* headA, ListNode* headB) {
    ListNode* pA = headA;
    ListNode* pB = headB;

    while (pA != pB) {
        pA = (pA == nullptr) ? headB : pA->next;
        pB = (pB == nullptr) ? headA : pB->next;
    }
    return pA;
}`,
    buildInitial(arr) {
      const localHeap = {};
      let counter = 0;
      // Common nodes: [8, 4, 5]
      const cVals = [8, 4, 5];
      const commonIds = [];
      let cPrev = null;
      cVals.forEach((v, idx) => {
        const id = 'n' + (counter++);
        commonIds.push(id);
        localHeap[id] = { id, structType: 'ListNode', val: v, next: null, col: 3 + idx, row: 0, stackAllocated: false, freed: false };
        if (cPrev) localHeap[cPrev].next = id;
        cPrev = id;
      });

      // List A: [4, 1] -> common
      const aVals = [4, 1];
      let aHead = null, aPrev = null;
      aVals.forEach((v, idx) => {
        const id = 'n' + (counter++);
        if (!aHead) aHead = id;
        localHeap[id] = { id, structType: 'ListNode', val: v, next: null, col: idx, row: 0, stackAllocated: false, freed: false };
        if (aPrev) localHeap[aPrev].next = id;
        aPrev = id;
      });
      if (aPrev && commonIds.length) localHeap[aPrev].next = commonIds[0];

      // List B: [5, 6, 1] -> common
      const bVals = [5, 6, 1];
      let bHead = null, bPrev = null;
      bVals.forEach((v, idx) => {
        const id = 'n' + (counter++);
        if (!bHead) bHead = id;
        localHeap[id] = { id, structType: 'ListNode', val: v, next: null, col: idx, row: 1, stackAllocated: false, freed: false };
        if (bPrev) localHeap[bPrev].next = id;
        bPrev = id;
      });
      if (bPrev && commonIds.length) localHeap[bPrev].next = commonIds[0];

      return { heap: localHeap, heapCounter: counter, colRight: 6, args: [aHead, bHead] };
    }
  },
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
  dll_prepend: {
    id: 'dll_prepend',
    category: 'Doubly Linked List',
    label: 'DLL · Insert at Head (Prepend)',
    badge: 'Bidirectional',
    info: 'Allocates a new node and inserts it at the head of a doubly linked list, connecting prev to nullptr and head to the new node.',
    structureType: 'list',
    entryFn: 'prepend',
    defaultArray: '[10, 20, 30]',
    extra: [{ id: 'newVal', label: 'New Value', type: 'number', value: 5 }],
    code: `struct DoublyListNode {
    int val;
    DoublyListNode* prev;
    DoublyListNode* next;
};

DoublyListNode* prepend(DoublyListNode* head, int newVal) {
    DoublyListNode* newNode = new DoublyListNode(newVal);
    newNode->next = head;
    newNode->prev = nullptr;

    if (head != nullptr) {
        head->prev = newNode;
    }
    head = newNode;

    return head;
}`,
    buildInitial(arr, extra) {
      const b = buildDoublyListHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId, extra.newVal !== undefined ? extra.newVal : 5] };
    }
  },

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

  dll_delete: {
    id: 'dll_delete',
    category: 'Doubly Linked List',
    label: 'DLL · Delete Node & Free Memory',
    badge: 'Memory Management',
    info: 'Locates a target node in a doubly linked list, bypasses its pointers from both directions, and safely deletes the node.',
    structureType: 'list',
    entryFn: 'deleteNode',
    defaultArray: '[10, 20, 30, 40]',
    extra: [{ id: 'targetVal', label: 'Target Value', type: 'number', value: 20 }],
    code: `struct DoublyListNode {
    int val;
    DoublyListNode* prev;
    DoublyListNode* next;
};

DoublyListNode* deleteNode(DoublyListNode* head, int targetVal) {
    DoublyListNode* curr = head;

    while (curr != nullptr && curr->val != targetVal) {
        curr = curr->next;
    }

    if (curr == nullptr) {
        return head;
    }

    // Unlink from previous node
    if (curr->prev != nullptr) {
        curr->prev->next = curr->next;
    } else {
        head = curr->next;
    }

    // Unlink from next node
    if (curr->next != nullptr) {
        curr->next->prev = curr->prev;
    }

    delete curr;
    return head;
}`,
    buildInitial(arr, extra) {
      const b = buildDoublyListHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId, extra.targetVal !== undefined ? extra.targetVal : 20] };
    }
  },

  dll_reverse: {
    id: 'dll_reverse',
    category: 'Doubly Linked List',
    label: 'DLL · Reverse Doubly Linked List',
    badge: 'Pointer Swap',
    info: 'Reverses a doubly linked list in-place by swapping next and prev pointers for every node.',
    structureType: 'list',
    entryFn: 'reverseDLL',
    defaultArray: '[10, 20, 30, 40]',
    extra: [],
    code: `struct DoublyListNode {
    int val;
    DoublyListNode* prev;
    DoublyListNode* next;
};

DoublyListNode* reverseDLL(DoublyListNode* head) {
    DoublyListNode* curr = head;
    DoublyListNode* temp = nullptr;

    while (curr != nullptr) {
        temp = curr->prev;
        curr->prev = curr->next;
        curr->next = temp;
        curr = curr->prev;
    }

    if (temp != nullptr) {
        head = temp->prev;
    }

    return head;
}`,
    buildInitial(arr) {
      const b = buildDoublyListHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId] };
    }
  },

  dll_palindrome: {
    id: 'dll_palindrome',
    category: 'Doubly Linked List',
    label: 'DLL · Palindrome Check (Two Pointers)',
    badge: 'Two Pointers',
    info: 'Checks if a doubly linked list is a palindrome in O(1) extra space using inward-moving left and right pointers.',
    structureType: 'list',
    entryFn: 'isPalindrome',
    defaultArray: '[1, 2, 2, 1]',
    extra: [],
    code: `struct DoublyListNode {
    int val;
    DoublyListNode* prev;
    DoublyListNode* next;
};

bool isPalindrome(DoublyListNode* head) {
    if (head == nullptr || head->next == nullptr) {
        return true;
    }

    DoublyListNode* left = head;
    DoublyListNode* right = head;

    // Move right pointer to tail
    while (right->next != nullptr) {
        right = right->next;
    }

    // Traverse inward from both ends
    while (left != right && left->prev != right) {
        if (left->val != right->val) {
            return false;
        }
        left = left->next;
        right = right->prev;
    }

    return true;
}`,
    buildInitial(arr) {
      const b = buildDoublyListHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId] };
    }
  },

  dll_scratchpad: {
    id: 'dll_scratchpad',
    category: 'Doubly Linked List',
    label: 'DLL · Playground Scratchpad',
    badge: 'Interactive',
    info: 'Interactive Doubly Linked List template with nullptr anchors on both sides. Experiment with any custom DLL algorithm!',
    structureType: 'list',
    entryFn: 'run',
    defaultArray: '[10, 20, 30, 40]',
    extra: [],
    code: `struct DoublyListNode {
    int val;
    DoublyListNode* prev;
    DoublyListNode* next;
};

DoublyListNode* run(DoublyListNode* head) {
    DoublyListNode* curr = head;

    // Traverse forward to end
    while (curr != nullptr && curr->next != nullptr) {
        curr = curr->next;
    }

    // Traverse backward using prev
    while (curr != nullptr) {
        curr = curr->prev;
    }

    return head;
}`,
    buildInitial(arr) {
      const b = buildDoublyListHelper(arr);
      return { heap: b.heap, heapCounter: b.heapCounter, colRight: arr.length, args: [b.headId] };
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
  },

  // ==========================================
  // ARRAY & STL CONTAINERS SUITE
  // ==========================================
  dsa_scratchpad: {
    id: 'dsa_scratchpad',
    category: 'Array Algorithms',
    label: 'Array Scratchpad · Array Playground',
    badge: 'Arrays',
    info: 'Interactive array & algorithm sandbox. Create arrays, manipulate indices, and watch box animations live.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[10, 20, 30, 40, 50]',
    extra: [],
    code: `void main() {
    int arr[5] = {10, 20, 30, 40, 50};
    int left = 0;
    int right = 4;

    while (left < right) {
        swap(arr[left], arr[right]);
        left++;
        right--;
    }
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  dsa_two_sum: {
    id: 'dsa_two_sum',
    category: 'Array Algorithms',
    label: 'Two Sum · Sorted Array (Two Pointers)',
    badge: 'Two Pointers',
    info: 'Two pointers left and right move inward on a sorted array to find elements summing to target.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[2, 7, 11, 15, 20]',
    extra: [],
    code: `void main() {
    int nums[5] = {2, 7, 11, 15, 20};
    int target = 18;
    int left = 0;
    int right = 4;
    int found = 0;

    while (left < right) {
        int sum = nums[left] + nums[right];
        if (sum == target) {
            found = 1;
            break;
        } else if (sum < target) {
            left++;
        } else {
            right--;
        }
    }
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  dsa_binary_search: {
    id: 'dsa_binary_search',
    category: 'Array Algorithms',
    label: 'Binary Search · Divide & Conquer',
    badge: 'Binary Search',
    info: 'Efficient O(log n) search maintaining low, mid, and high pointers.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[3, 8, 14, 21, 35, 47, 59, 72]',
    extra: [],
    code: `void main() {
    int arr[8] = {3, 8, 14, 21, 35, 47, 59, 72};
    int target = 35;
    int low = 0;
    int high = 7;
    int foundIdx = -1;

    while (low <= high) {
        int mid = low + (high - low) / 2;
        if (arr[mid] == target) {
            foundIdx = mid;
            break;
        } else if (arr[mid] < target) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  dsa_reverse_array: {
    id: 'dsa_reverse_array',
    category: 'Array Algorithms',
    label: 'Reverse Array · In-Place Swap',
    badge: 'In-Place Swap',
    info: 'In-place array reversal using swap(arr[i], arr[j]) with animated swap arcs.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[1, 2, 3, 4, 5, 6]',
    extra: [],
    code: `void main() {
    int arr[6] = {1, 2, 3, 4, 5, 6};
    int i = 0;
    int j = 5;

    while (i < j) {
        swap(arr[i], arr[j]);
        i++;
        j--;
    }
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  dsa_bubble_sort: {
    id: 'dsa_bubble_sort',
    category: 'Array Algorithms',
    label: 'Bubble Sort · Animated Swaps',
    badge: 'Sorting',
    info: 'Sorts an array by repeatedly swapping adjacent out-of-order elements.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[5, 1, 4, 2, 8]',
    extra: [],
    code: `void main() {
    int arr[5] = {5, 1, 4, 2, 8};
    int n = 5;

    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
            }
        }
    }
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  dsa_sliding_window: {
    id: 'dsa_sliding_window',
    category: 'Array Algorithms',
    label: 'Sliding Window · Subarray Sum',
    badge: 'Sliding Window',
    info: 'Computes maximum sum of contiguous subarray of fixed size k=3.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[2, 1, 5, 1, 3, 2]',
    extra: [],
    code: `void main() {
    int arr[6] = {2, 1, 5, 1, 3, 2};
    int k = 3;
    int windowSum = 0;
    int maxSum = 0;

    for (int i = 0; i < k; i++) {
        windowSum += arr[i];
    }
    maxSum = windowSum;

    for (int i = k; i < 6; i++) {
        windowSum += arr[i] - arr[i - k];
        if (windowSum > maxSum) {
            maxSum = windowSum;
        }
    }
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  dsa_kadane: {
    id: 'dsa_kadane',
    category: 'Array Algorithms',
    label: "Kadane's Algorithm · Max Subarray",
    badge: 'Dynamic Prog',
    info: 'O(n) dynamic programming algorithm to find maximum contiguous subarray sum.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]',
    extra: [],
    code: `void main() {
    int nums[9] = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
    int maxSoFar = nums[0];
    int currentMax = nums[0];

    for (int i = 1; i < 9; i++) {
        int val = nums[i];
        currentMax = (val > currentMax + val) ? val : (currentMax + val);
        if (currentMax > maxSoFar) {
            maxSoFar = currentMax;
        }
    }
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  dsa_vector: {
    id: 'dsa_vector',
    category: 'C++ STL Containers',
    label: 'std::vector · push_back & size()',
    badge: 'std::vector',
    info: 'C++ vector initialization, dynamic push_back, and size() method calls.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[10, 20, 30]',
    extra: [],
    code: `void main() {
    vector<int> v = {10, 20, 30};
    v.push_back(40);
    v.push_back(50);

    int total = 0;
    int sz = v.size();
    for (int i = 0; i < sz; i++) {
        total += v[i];
    }
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  stl_sort: {
    id: 'stl_sort',
    category: 'C++ STL Algorithms',
    label: 'std::sort · Sequence Sorting',
    badge: 'std::sort',
    info: 'Sorts a vector in non-decreasing order using C++ std::sort.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[38, 27, 43, 3, 9, 82, 10]',
    extra: [],
    code: `void main() {
    vector<int> nums = {38, 27, 43, 3, 9, 82, 10};
    sort(nums.begin(), nums.end());
    int minVal = nums[0];
    int maxVal = nums[6];
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  stl_reverse: {
    id: 'stl_reverse',
    category: 'C++ STL Algorithms',
    label: 'std::reverse · Sequence Inversion',
    badge: 'std::reverse',
    info: 'Inverts the order of elements in a range using C++ std::reverse.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[1, 2, 3, 4, 5]',
    extra: [],
    code: `void main() {
    vector<int> v = {1, 2, 3, 4, 5};
    reverse(v.begin(), v.end());
    int first = v[0];
    int last = v[4];
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  stl_stack: {
    id: 'stl_stack',
    category: 'C++ STL Containers',
    label: 'std::stack · LIFO Operations',
    badge: 'std::stack',
    info: 'Standard LIFO stack container demonstrating push, pop, and top.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[]',
    extra: [],
    code: `void main() {
    stack<int> s;
    s.push(10);
    s.push(20);
    s.push(30);

    int topElement = s.top();
    s.pop();
    s.push(40);
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  lc20_valid_parentheses: {
    id: 'lc20_valid_parentheses',
    category: 'C++ STL Containers',
    label: 'LC 20 · Valid Parentheses (stack<char>)',
    badge: 'LC 20',
    info: 'Validate matching parenthesis string using stack<char> push, pop, and top inspection.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[]',
    extra: [],
    code: `void main() {
    string s = "{[()]}";
    stack<char> st;

    for (char c : s) {
        if (c == '(' || c == '{' || c == '[') {
            st.push(c);
        } else {
            if (st.empty()) break;
            char top = st.top();
            if ((c == ')' && top == '(') ||
                (c == '}' && top == '{') ||
                (c == ']' && top == '[')) {
                st.pop();
            } else {
                break;
            }
        }
    }

    bool valid = st.empty();
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  stl_queue: {
    id: 'stl_queue',
    category: 'C++ STL Containers',
    label: 'std::queue · FIFO Operations',
    badge: 'std::queue',
    info: 'Standard FIFO queue container demonstrating push, pop, front, and back.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[]',
    extra: [],
    code: `void main() {
    queue<int> q;
    q.push(100);
    q.push(200);
    q.push(300);

    int frontVal = q.front();
    q.pop();
    q.push(400);
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  stl_pair: {
    id: 'stl_pair',
    category: 'C++ STL Containers',
    label: 'std::pair · Heterogeneous Couple',
    badge: 'std::pair',
    info: 'std::pair and make_pair utility for binding two values together.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[]',
    extra: [],
    code: `void main() {
    pair<int, int> p = {10, 20};
    p.first = 50;

    pair<int, int> q = make_pair(100, 200);
    int sum = p.first + q.second;
} `,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  cp_bfs: {
    id: 'cp_bfs',
    category: 'C++ STL Algorithms',
    label: 'CP BFS · Shortest Path (CSES / CF)',
    badge: 'Competitive Programming',
    info: 'Full Competitive Programming BFS on an unweighted graph using queue, 2D vector adj, range-for, macros, and cin stream.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[5, 5, 1, 2, 2, 3, 3, 4, 4, 5, 1, 5]',
    extra: [],
    code: `#include <bits/stdc++.h>
using namespace std;

using ll = long long;
using vi = vector<int>;
#define all(x) (x).begin(), (x).end()
#define sz(x) ((int)(x).size())

void solve() {
    int n, m;
    cin >> n >> m;

    vector<vector<int>> adj(n + 1);
    vector<bool> visited(n + 1, false);
    vector<int> parent(n + 1, 0);
    queue<int> q;

    for (int i = 0; i < m; i++) {
        int a, b;
        cin >> a >> b;
        adj[a].push_back(b);
        adj[b].push_back(a);
    }

    visited[1] = true;
    q.push(1);

    while (!q.empty()) {
        int u = q.front();
        q.pop();

        if (u == n) break;

        for (int x : adj[u]) {
            if (!visited[x]) {
                visited[x] = true;
                parent[x] = u;
                q.push(x);
            }
        }
    }

    if (!visited[n]) {
        cout << "IMPOSSIBLE" << endl;
        return;
    }

    vector<int> path;
    for (int count = n; count != 0; count = parent[count]) {
        path.push_back(count);
    }

    reverse(all(path));

    cout << path.size() << "\\n";
    for (int i = 0; i < path.size(); i++) {
        cout << path[i] << " ";
    }
    cout << "\n";
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    int t = 1;
    while (t--) {
        solve();
    }
    return 0;
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  lc125: {
    id: 'lc125',
    category: 'Array Algorithms',
    label: 'LC 125 · Valid Palindrome (std::string)',
    badge: 'Two Pointers',
    info: 'Check if a string is a palindrome using two pointers moving inwards towards each other.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[]',
    extra: [],
    code: `void main() {
    string s = "racecar";
    int left = 0;
    int right = s.length() - 1;
    bool isPalindrome = true;

    while (left < right) {
        if (s[left] != s[right]) {
            isPalindrome = false;
            break;
        }
        left++;
        right--;
    }
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  stl_pq: {
    id: 'stl_pq',
    category: 'C++ STL Containers',
    label: 'std::priority_queue · Top K & Heaps',
    badge: 'std::priority_queue',
    info: 'Priority queue dynamically maintaining highest priority elements at the top.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[]',
    extra: [],
    code: `void main() {
    priority_queue<int> maxHeap;
    maxHeap.push(30);
    maxHeap.push(10);
    maxHeap.push(50);
    maxHeap.push(20);

    int maxVal = maxHeap.top();
    maxHeap.pop();

    priority_queue<int, vector<int>, greater<int>> minHeap;
    minHeap.push(40);
    minHeap.push(5);
    minHeap.push(15);
    int minVal = minHeap.top();
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  stl_set: {
    id: 'stl_set',
    category: 'C++ STL Containers',
    label: 'std::set · Unique Elements & Filtering',
    badge: 'std::set',
    info: 'Ordered container storing unique keys with logarithmic lookup and insertion.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[]',
    extra: [],
    code: `void main() {
    set<int> uniqueNums;
    uniqueNums.insert(10);
    uniqueNums.insert(20);
    uniqueNums.insert(10);
    uniqueNums.insert(30);

    int has20 = uniqueNums.count(20);
    int has99 = uniqueNums.count(99);
    uniqueNums.erase(20);
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  },

  stl_map: {
    id: 'stl_map',
    category: 'C++ STL Containers',
    label: 'std::map · Frequency Hash Mapping',
    badge: 'std::map',
    info: 'Key-value dictionary mapping string keys to counts with bracket lookup.',
    structureType: 'dsa',
    entryFn: 'main',
    defaultArray: '[]',
    extra: [],
    code: `void main() {
    map<string, int> freq;
    freq["apple"] = 3;
    freq["banana"] = 5;
    freq["apple"] += 2;

    int appleCount = freq["apple"];
    int orangeCount = freq["orange"];
}`,
    buildInitial(arr) {
      return { heap: {}, heapCounter: 0, colRight: 0, args: [] };
    }
  }
};
