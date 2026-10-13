/**
 * Tests for C++ OOP / Class Support and StackUsingQueues
 */

import { tokenize } from '../src/core/lexer.js';
import { parseProgram } from '../src/core/parser.js';
import { runProgram, resetEngineState } from '../src/core/interpreter.js';
import { DsaRenderer } from '../src/render/dsaRenderer.js';
import { MemoryInspector } from '../src/ui/memoryInspector.js';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  [PASS] ${label}`);
    passed++;
  } else {
    console.log(`  [FAIL] ${label}`);
    failed++;
  }
}

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
      toggle: () => {}
    },
    addEventListener: () => {},
    appendChild: (c) => {
      children.push(c);
      c.parentElement = el;
      return c;
    },
    removeChild: (c) => {
      const idx = children.indexOf(c);
      if (idx !== -1) children.splice(idx, 1);
    },
    setAttribute: (k, v) => { el[k] = v; },
    getAttribute: (k) => el[k] || '',
    querySelectorAll: (sel) => [],
    querySelector: (sel) => mockEl('child'),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }),
    remove: () => {}
  };
  el.parentElement = el;
  return el;
};

global.document = {
  body: mockEl('body'),
  getElementById: (id) => mockEl('div', id),
  createElement: (tag) => mockEl(tag),
  createElementNS: (ns, tag) => mockEl(tag),
  addEventListener: () => {}
};

console.log('[START] Verifying OOP / Class Support & StackUsingQueues...\n');

// Test 1: Full user StackUsingQueues code
{
  const code = `
class StackUsingQueues {
    queue<int> q1, q2;

public:
    void push(int x) {
        q2.push(x);
        while (!q1.empty()) {
            q2.push(q1.front());
            q1.pop();
        }
        swap(q1, q2);
    }

    int pop() {
        int val = q1.front();
        q1.pop();
        return val;
    }

    int top() {
        return q1.front();
    }

    bool empty() {
        return q1.empty();
    }
};

void main() {
    StackUsingQueues st;
    st.push(10);
    st.push(20);
    st.push(30);
    int top1 = st.top();
    int pop1 = st.pop();
    int top2 = st.top();
    int pop2 = st.pop();
    bool empty1 = st.empty();
    int pop3 = st.pop();
    bool empty2 = st.empty();
}
`;

  const tokens = tokenize(code);
  const ast = parseProgram(tokens);

  assert(ast.structs.StackUsingQueues !== undefined, 'StackUsingQueues class parsed into ast.structs');
  assert(ast.functions.main !== undefined, 'main() parsed into ast.functions');

  resetEngineState({}, 0, 0);
  const timeline = runProgram(ast.functions.main, [], ast.functions, null, ast.structs);

  assert(timeline.length > 0, `Execution produced ${timeline.length} steps`);

  const finalVars = timeline[timeline.length - 1].frames[0].vars;
  assert(finalVars.top1.value === 30, `top1 is 30 (got ${finalVars.top1.value})`);
  assert(finalVars.pop1.value === 30, `pop1 is 30 (got ${finalVars.pop1.value})`);
  assert(finalVars.top2.value === 20, `top2 is 20 (got ${finalVars.top2.value})`);
  assert(finalVars.pop2.value === 20, `pop2 is 20 (got ${finalVars.pop2.value})`);
  assert(finalVars.empty1.value === false, `empty1 is false (got ${finalVars.empty1.value})`);
  assert(finalVars.pop3.value === 10, `pop3 is 10 (got ${finalVars.pop3.value})`);
  assert(finalVars.empty2.value === true, `empty2 is true (got ${finalVars.empty2.value})`);

  // Verify DsaRenderer extracts queues q1 and q2 from the instance
  let foundQ1 = false, foundQ2 = false;
  // Mock SVG container
  const dummySvg = {
    ownerSVGElement: null,
    appendChild: () => {},
    removeChild: () => {},
    setAttribute: () => {},
    querySelectorAll: () => [],
    innerHTML: ''
  };
  const dsaRenderer = new DsaRenderer(dummySvg, 'dummy-canvas');
  // Spy on renderQueue
  const origRenderQueue = dsaRenderer.renderQueue.bind(dsaRenderer);
  dsaRenderer.renderQueue = (qObj, meta, startX, startY, heap) => {
    if (qObj.name.includes('q1')) foundQ1 = true;
    if (qObj.name.includes('q2')) foundQ2 = true;
    return startY + 50;
  };

  // Render a step where queues have items
  const pushStep = timeline.find(s => s.explanation.includes('swap'));
  if (pushStep) {
    dsaRenderer.render(pushStep.frames, pushStep.heap, pushStep.meta);
    assert(foundQ1 || foundQ2, 'DsaRenderer detected instance queues (q1 / q2)');
  }
}

// Test 2: Class with user-defined constructor
{
  const code = `
class Counter {
    int count;
public:
    Counter(int start) {
        count = start;
    }
    void inc() {
        count++;
    }
    int get() {
        return count;
    }
};

void main() {
    Counter c(42);
    c.inc();
    c.inc();
    int ans = c.get();
}
`;

  const ast = parseProgram(tokenize(code));
  resetEngineState({}, 0, 0);
  const timeline = runProgram(ast.functions.main, [], ast.functions, null, ast.structs);
  const finalVars = timeline[timeline.length - 1].frames[0].vars;
  assert(finalVars.ans.value === 44, `User constructor and methods worked: ans is 44 (got ${finalVars.ans.value})`);
}

// Test 3: Zero-boilerplate script mode with Class
{
  const code = `
class Accumulator {
    int total;
public:
    void add(int x) { total += x; }
    int val() { return total; }
};

Accumulator acc;
acc.add(10);
acc.add(25);
int res = acc.val();
`;

  const ast = parseProgram(tokenize(code));
  assert(ast.functions.main !== undefined, 'Top-level script mode synthesized main()');
  resetEngineState({}, 0, 0);
  const timeline = runProgram(ast.functions.main, [], ast.functions, null, ast.structs);
  const finalVars = timeline[timeline.length - 1].frames[0].vars;
  assert(finalVars.res.value === 35, `Zero-boilerplate class execution worked: res is 35 (got ${finalVars.res.value})`);
}

console.log(`\n[DONE] OOP / Class Support Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
