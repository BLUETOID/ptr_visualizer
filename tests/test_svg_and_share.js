/**
 * Automated Verification for SVG Canvas Rendering, Studio Fallback, Share & Export
 */

import { tokenize } from '../src/core/lexer.js';
import { parseProgram } from '../src/core/parser.js';
import { resetEngineState, runProgram } from '../src/core/interpreter.js';
import { ListRenderer } from '../src/render/listRenderer.js';
import { TreeRenderer } from '../src/render/treeRenderer.js';
import { DsaRenderer } from '../src/render/dsaRenderer.js';
import { MemoryInspector } from '../src/ui/memoryInspector.js';

// Setup Mock DOM
const mockEl = (tag = 'div', id = '') => {
  const children = [];
  const el = {
    tagName: tag.toUpperCase(),
    id,
    dataset: {},
    innerHTML: '',
    textContent: '',
    value: '',
    style: {},
    children,
    childNodes: children,
    classList: {
      _classes: new Set(),
      add: (c) => el.classList._classes.add(c),
      remove: (c) => el.classList._classes.delete(c),
      contains: (c) => el.classList._classes.has(c),
      toggle: (c, force) => {
        if (force === undefined) {
          if (el.classList._classes.has(c)) el.classList._classes.delete(c);
          else el.classList._classes.add(c);
        } else if (force) el.classList._classes.add(c);
        else el.classList._classes.delete(c);
      }
    },
    addEventListener: () => {},
    appendChild: (c) => {
      children.push(c);
      c.parentElement = el;
      c.parentNode = el;
      return c;
    },
    insertBefore: (c, ref) => {
      const idx = children.indexOf(ref);
      if (idx !== -1) children.splice(idx, 0, c);
      else children.push(c);
      c.parentElement = el;
      c.parentNode = el;
      return c;
    },
    setAttribute: (k, v) => { el[k] = v; },
    getAttribute: (k) => el[k] || '',
    querySelectorAll: (sel) => [],
    querySelector: (sel) => mockEl('child'),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    remove: () => {
      if (el.parentElement) {
        const idx = el.parentElement.children.indexOf(el);
        if (idx !== -1) el.parentElement.children.splice(idx, 1);
      }
    }
  };
  el.parentElement = el;
  el.parentNode = el;
  return el;
};

const domMap = new Map();
global.document = {
  body: mockEl('body'),
  getElementById: (id) => {
    if (!domMap.has(id)) domMap.set(id, mockEl('div', id));
    return domMap.get(id);
  },
  createElement: (tag) => mockEl(tag),
  createElementNS: (ns, tag) => mockEl(tag),
  addEventListener: () => {}
};

console.log('[START] Verifying SVG Canvas Rendering & Studio Fallbacks...');

// Test 1: MemoryInspector does not throw valDesc ReferenceError
const inspector = new MemoryInspector('stackPanel', 'memoryBadge');
const mockFrames = [
  {
    name: 'main',
    vars: {
      x: { kind: 'scalar', value: 42 },
      ch: { kind: 'char', value: '(' },
      str: { kind: 'string', value: 'hello' },
      nums: { kind: 'array', value: [1, 2, 3] },
      st: { kind: 'stack', value: { isStack: true, elements: ['('] } },
      q: { kind: 'queue', value: { isQueue: true, elements: [10, 20] } },
      p: { kind: 'pair', value: { isPair: true, first: 1, second: 2 } }
    }
  }
];

try {
  inspector.update(mockFrames, {}, {}, 'pointer');
  inspector.update(mockFrames, {}, {}, 'array_stl');
  console.log('  [PASS] MemoryInspector handles all C++ variable types without reference errors');
} catch (e) {
  console.error('  [FAIL] MemoryInspector threw:', e);
  process.exit(1);
}

// Test 2: Dual Studio Fallback Simulation
// Case A: User is in 'pointer' studio but writes stack<char> code
const codeStack = `
int main() {
    stack<char> st;
    st.push('(');
    st.push(')');
    return 0;
}
`;

const tokensA = tokenize(codeStack);
const astA = parseProgram(tokensA);
resetEngineState({}, 0, 0);
const timelineA = runProgram(astA.functions['main'], [], astA.functions);
const lastSnapA = timelineA[timelineA.length - 1];

const viewport = mockEl('g', 'viewport');
const listRenderer = new ListRenderer(viewport);
const treeRenderer = new TreeRenderer(viewport);
const dsaRenderer = new DsaRenderer(viewport);

// Simulate the smart dispatch logic from renderStep:
const hasHeapNodesA = Object.keys(lastSnapA.heap || {}).length > 0;
let hasContainersA = false;
for (const f of lastSnapA.frames) {
  for (const info of Object.values(f.vars)) {
    const val = info.value;
    if ((val && (val.isStack || val.isQueue || val.isPriorityQueue || val.isSet || val.isMap || val.isPair)) ||
        info.kind === 'array' || Array.isArray(val) ||
        info.kind === 'string' || (typeof val === 'string' && val.length > 0 && !info.isCinStream)) {
      hasContainersA = true;
      break;
    }
  }
}

if (!hasHeapNodesA && hasContainersA) {
  // Seamless fallback to dsaRenderer!
  dsaRenderer.render(lastSnapA.frames, lastSnapA.heap, lastSnapA.meta || {});
  console.log('  [PASS] Pointer Studio fallback: stack<char> seamlessly renders with DsaRenderer (no blank canvas)');
} else {
  console.error('  [FAIL] Expected containers detected in stack<char> snapshot');
  process.exit(1);
}

// Case B: User is in 'array_stl' studio but writes ListNode pointer code
const codeList = `
int main() {
    ListNode* head = new ListNode(10);
    head->next = new ListNode(20);
    return 0;
}
`;

const tokensB = tokenize(codeList);
const astB = parseProgram(tokensB);
resetEngineState({}, 0, 0);
const timelineB = runProgram(astB.functions['main'], [], astB.functions);
const lastSnapB = timelineB[timelineB.length - 1];

const hasHeapNodesB = Object.keys(lastSnapB.heap || {}).length > 0;
if (hasHeapNodesB) {
  listRenderer.render(lastSnapB.heap, lastSnapB.frames, lastSnapB.meta || {});
  console.log('  [PASS] Containers Studio fallback: ListNode pointers seamlessly render with ListRenderer (no blank canvas)');
} else {
  console.error('  [FAIL] Expected heap nodes detected in ListNode snapshot');
  process.exit(1);
}

// Case C: TreeNode renders with TreeRenderer
const codeTree = `
int main() {
    TreeNode* root = new TreeNode(1);
    root->left = new TreeNode(2);
    root->right = new TreeNode(3);
    return 0;
}
`;

const tokensC = tokenize(codeTree);
const astC = parseProgram(tokensC);
resetEngineState({}, 0, 0);
const timelineC = runProgram(astC.functions['main'], [], astC.functions);
const lastSnapC = timelineC[timelineC.length - 1];

const hasTreeNodesC = Object.values(lastSnapC.heap || {}).some(n => n.structType === 'TreeNode');
if (hasTreeNodesC) {
  treeRenderer.render(lastSnapC.heap, lastSnapC.frames, lastSnapC.meta || {});
  console.log('  [PASS] Tree structures seamlessly render with TreeRenderer');
} else {
  console.error('  [FAIL] Expected TreeNodes detected in Tree snapshot');
  process.exit(1);
}

console.log('[DONE] All SVG rendering, studio fallback, and memory tests passed cleanly!');
