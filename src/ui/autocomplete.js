/**
 * C++ Code Autocomplete & Recommendation Engine
 */

export const COMPLETIONS = [
  // Types & Declarations
  { label: 'ListNode', text: 'ListNode* ', kind: 'type', detail: 'Singly linked list node pointer' },
  { label: 'ListNode* curr = head;', text: 'ListNode* curr = head;', kind: 'snippet', detail: 'Initialize traversal pointer' },
  { label: 'ListNode* prev = nullptr;', text: 'ListNode* prev = nullptr;', kind: 'snippet', detail: 'Initialize predecessor pointer' },
  { label: 'ListNode* next = curr->next;', text: 'ListNode* next = curr->next;', kind: 'snippet', detail: 'Save next node reference' },
  { label: 'ListNode dummy(0);', text: 'ListNode dummy(0);\ndummy.next = head;', kind: 'snippet', detail: 'Stack-allocated dummy head pattern' },
  { label: 'ListNode(val)', text: 'ListNode(${1:val})', kind: 'constructor', detail: 'Node constructor' },
  
  { label: 'TreeNode', text: 'TreeNode* ', kind: 'type', detail: 'Binary tree node pointer' },
  { label: 'TreeNode* curr = root;', text: 'TreeNode* curr = root;', kind: 'snippet', detail: 'Initialize tree traversal pointer' },
  { label: 'TreeNode* left', text: 'TreeNode* left;', kind: 'type', detail: 'Left child pointer' },
  { label: 'TreeNode* right', text: 'TreeNode* right;', kind: 'type', detail: 'Right child pointer' },
  
  { label: 'DoublyListNode', text: 'DoublyListNode* ', kind: 'type', detail: 'Doubly linked list node pointer' },

  // Keywords & Memory
  { label: 'new ListNode', text: 'new ListNode(${1:10});', kind: 'memory', detail: 'Allocate dynamic node on heap' },
  { label: 'new TreeNode', text: 'new TreeNode(${1:10});', kind: 'memory', detail: 'Allocate dynamic tree node on heap' },
  { label: 'delete', text: 'delete ${1:ptr};', kind: 'memory', detail: 'Deallocate heap memory' },
  { label: 'nullptr', text: 'nullptr', kind: 'keyword', detail: 'C++ null pointer literal' },

  // Control Flow Idioms
  { label: 'while (curr != nullptr)', text: 'while (curr != nullptr) {\n    curr = curr->next;\n}', kind: 'snippet', detail: 'List traversal loop' },
  { label: 'while (fast != nullptr && fast->next != nullptr)', text: 'while (fast != nullptr && fast->next != nullptr) {\n    slow = slow->next;\n    fast = fast->next->next;\n}', kind: 'snippet', detail: 'Fast/slow two pointers loop' },
  { label: 'if (head == nullptr)', text: 'if (head == nullptr) {\n    return nullptr;\n}', kind: 'snippet', detail: 'Check for empty list' },
  { label: 'if (root == nullptr)', text: 'if (root == nullptr) {\n    return nullptr;\n}', kind: 'snippet', detail: 'Check for empty tree' },
  { label: 'return', text: 'return ', kind: 'keyword', detail: 'Return statement' },
  { label: 'int', text: 'int ', kind: 'type', detail: 'Integer scalar type' },
  { label: 'bool', text: 'bool ', kind: 'type', detail: 'Boolean type' },
  { label: 'void', text: 'void ', kind: 'type', detail: 'Void return type' }
];

export const MEMBER_COMPLETIONS = {
  list: [
    { label: 'next', text: 'next', kind: 'field', detail: 'ListNode* next pointer' },
    { label: 'val', text: 'val', kind: 'field', detail: 'int node value' },
    { label: 'prev', text: 'prev', kind: 'field', detail: 'DoublyListNode* prev pointer' }
  ],
  tree: [
    { label: 'left', text: 'left', kind: 'field', detail: 'TreeNode* left child pointer' },
    { label: 'right', text: 'right', kind: 'field', detail: 'TreeNode* right child pointer' },
    { label: 'val', text: 'val', kind: 'field', detail: 'int node value' }
  ]
};

export class AutocompleteManager {
  constructor(textarea, onApply) {
    this.textarea = textarea;
    this.onApply = onApply || (() => {});

    this.box = null;
    this.visible = false;
    this.items = [];
    this.selectedIndex = 0;
    this.replaceRange = { start: 0, end: 0 };

    this.createDOM();
    this.initEvents();
  }

  createDOM() {
    this.box = document.createElement('div');
    this.box.className = 'autocomplete-box';
    this.box.style.display = 'none';
    document.body.appendChild(this.box);
  }

  initEvents() {
    // Listen to keydown for navigating autocomplete
    this.textarea.addEventListener('keydown', (e) => {
      if (!this.visible) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectPrev();
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (this.items.length > 0) {
          e.preventDefault();
          this.applySelected();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.hide();
      }
    });

    // Check suggestions on input or cursor movements
    this.textarea.addEventListener('input', () => {
      this.evaluateSuggestions();
    });

    this.textarea.addEventListener('click', () => {
      this.hide();
    });

    window.addEventListener('resize', () => {
      if (this.visible) this.updatePosition();
    });
  }

  evaluateSuggestions() {
    const pos = this.textarea.selectionStart;
    const text = this.textarea.value;
    const before = text.substring(0, pos);

    // 1. Check for member access operator '->' or '.'
    const memberMatch = before.match(/([a-zA-Z0-9_]+)(->|\.)([a-zA-Z0-9_]*)$/);
    if (memberMatch) {
      const varName = memberMatch[1].toLowerCase();
      const query = (memberMatch[3] || '').toLowerCase();
      const replaceStart = pos - query.length;
      this.replaceRange = { start: replaceStart, end: pos };

      const isTree = varName.includes('root') || varName.includes('tree') || varName.includes('left') || varName.includes('right') || text.includes('TreeNode');
      const candidates = isTree ? MEMBER_COMPLETIONS.tree : MEMBER_COMPLETIONS.list;

      this.items = candidates.filter(c => c.label.toLowerCase().startsWith(query));
      if (this.items.length > 0) {
        this.show();
        return;
      }
    }

    // 2. Check for word typing (at least 1 character)
    const wordMatch = before.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/);
    if (wordMatch) {
      const query = wordMatch[1].toLowerCase();
      this.replaceRange = { start: pos - query.length, end: pos };

      // Filter completions by prefix or substring
      this.items = COMPLETIONS.filter(c => {
        const lbl = c.label.toLowerCase();
        return lbl.startsWith(query) || (lbl.includes(query) && query.length >= 2);
      });

      if (this.items.length > 0) {
        this.show();
        return;
      }
    }

    this.hide();
  }

  show() {
    this.selectedIndex = 0;
    this.visible = true;
    this.box.style.display = 'block';
    this.render();
    this.updatePosition();
  }

  hide() {
    this.visible = false;
    this.items = [];
    if (this.box) {
      this.box.style.display = 'none';
    }
  }

  selectNext() {
    this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
    this.render();
  }

  selectPrev() {
    this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
    this.render();
  }

  render() {
    this.box.innerHTML = '';
    this.items.slice(0, 8).forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = `autocomplete-item ${idx === this.selectedIndex ? 'active' : ''}`;
      
      row.innerHTML = `
        <span class="item-kind kind-${item.kind}">${item.kind}</span>
        <span class="item-label">${item.label}</span>
        <span class="item-detail">${item.detail || ''}</span>
      `;

      row.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.selectedIndex = idx;
        this.applySelected();
      });

      this.box.appendChild(row);
    });
  }

  applySelected() {
    const item = this.items[this.selectedIndex];
    if (!item) return;

    let insertion = item.text;
    // Strip snippet placeholder markers like ${1:val}
    let targetCursorOffset = -1;
    if (insertion.includes('${1:')) {
      const match = insertion.match(/\$\{1:([^}]*)\}/);
      if (match) {
        const placeholder = match[1];
        const matchIdx = insertion.indexOf(match[0]);
        insertion = insertion.replace(match[0], placeholder);
        targetCursorOffset = matchIdx + placeholder.length;
      }
    }

    const val = this.textarea.value;
    const { start, end } = this.replaceRange;

    this.textarea.value = val.substring(0, start) + insertion + val.substring(end);
    const newCursor = targetCursorOffset !== -1 ? start + targetCursorOffset : start + insertion.length;
    this.textarea.selectionStart = this.textarea.selectionEnd = newCursor;
    this.textarea.focus();

    this.hide();
    this.onApply(this.textarea.value);
  }

  updatePosition() {
    const rect = this.textarea.getBoundingClientRect();
    const pos = this.textarea.selectionStart;
    const textBefore = this.textarea.value.substring(0, pos);
    const lines = textBefore.split('\n');
    const lineIndex = lines.length;
    const colIndex = lines[lines.length - 1].length;

    const lineHeight = 21;
    const charWidth = 7.8;

    let top = rect.top + (lineIndex * lineHeight) - this.textarea.scrollTop + 14;
    let left = rect.left + (colIndex * charWidth) + 36;

    // Prevent popover from going off-screen
    const boxW = 340;
    if (left + boxW > window.innerWidth) {
      left = window.innerWidth - boxW - 16;
    }

    this.box.style.top = `${Math.max(10, top)}px`;
    this.box.style.left = `${Math.max(10, left)}px`;
  }
}
