/**
 * Automated Verification for std::deque and Competitive Programming I/O Stream
 */

import { tokenize } from '../src/core/lexer.js';
import { parseProgram } from '../src/core/parser.js';
import { runProgram, resetEngineState, getCumulativeStdout } from '../src/core/interpreter.js';
import { DsaRenderer } from '../src/render/dsaRenderer.js';

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

// Setup Mock DOM for DsaRenderer
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
    querySelectorAll: () => [],
    querySelector: () => mockEl('child'),
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

console.log('[START] Verifying std::deque & CP I/O Stream...');

// Test 1: Competitive Programming Two-Pointer Deque with Binary String
try {
  const code = `
  #include <bits/stdc++.h>
  using namespace std;

  int main() {
    int t;
    cin >> t;
    while (t--) {
      int n;
      cin >> n;
      string s;
      cin >> s;
      deque<int> dq;
      int i = 0;
      int j = s.size() - 1;
      while (i <= j) {
        if (s[i] - '0' == 0) {
          dq.push_front(s[i] - '0');
        } else {
          dq.push_back(s[i] - '0');
        }
        i++;
        if (i <= j) {
          if (s[j] - '0' == 0) {
            dq.push_back(s[j] - '0');
          } else {
            dq.push_front(s[j] - '0');
          }
          j--;
        }
      }
      for (int val : dq) {
        cout << val;
      }
      cout << "\\n";
    }
  }
  `;

  const tokens = tokenize(code);
  const ast = parseProgram(tokens);
  resetEngineState({}, 0, 0);

  // 2 testcases: (n=4, s='0110') and (n=3, s='101')
  const cinStream = '2 4 0110 3 101';
  const timeline = runProgram(ast.functions['main'], [], ast.functions, cinStream);

  assert(timeline && timeline.length > 0, `Generated ${timeline.length} execution steps`);
  
  const stdout = getCumulativeStdout();
  assert(stdout.includes('1001\n011\n'), `Stdout correctly matches CP output (got: ${JSON.stringify(stdout)})`);

  // Check last step variables
  const lastStep = timeline[timeline.length - 1];
  assert(lastStep !== undefined, 'Last execution step is defined');
} catch (e) {
  assert(false, `Test 1 failed with error: ${e.message}`);
}

// Test 2: Deque Member Functions & Rendering
try {
  const code = `
  #include <deque>
  using namespace std;
  int main() {
    deque<int> dq;
    dq.push_back(10);
    dq.push_front(20);
    dq.push_back(30);
    int f = dq.front();
    int b = dq.back();
    int sz = dq.size();
    dq.pop_front();
    dq.pop_back();
    bool emp = dq.empty();
  }
  `;

  const tokens = tokenize(code);
  const ast = parseProgram(tokens);
  resetEngineState({}, 0, 0);
  const timeline = runProgram(ast.functions['main'], [], ast.functions);

  assert(timeline.length > 0, `Deque basic operations generated ${timeline.length} steps`);

  const finalVars = timeline[timeline.length - 1].frames[0].vars;
  assert(finalVars.f.value === 20, `dq.front() is 20 (got ${finalVars.f.value})`);
  assert(finalVars.b.value === 30, `dq.back() is 30 (got ${finalVars.b.value})`);
  assert(finalVars.sz.value === 3, `dq.size() was 3 (got ${finalVars.sz.value})`);
  assert(finalVars.emp.value === false, `dq.empty() is false after 1 pop (got ${finalVars.emp.value})`);
  assert(finalVars.dq.value.elements.length === 1 && finalVars.dq.value.elements[0] === 10, 'Deque remaining element is 10');

  // Verify DsaRenderer extracts and renders deque
  const mockContainer = mockEl('svg');
  const renderer = new DsaRenderer(mockContainer);
  let dequeRendered = false;
  renderer.renderDeque = (dqObj) => {
    dequeRendered = true;
    assert(dqObj.name === 'dq', `RenderDeque called with container name: ${dqObj.name}`);
    assert(Array.isArray(dqObj.value), 'RenderDeque called with elements array');
    return 100;
  };
  renderer.render(timeline[timeline.length - 1].frames, {}, {});
  assert(dequeRendered, 'DsaRenderer successfully invoked renderDeque');
} catch (e) {
  assert(false, `Test 2 failed with error: ${e.message}`);
}

console.log(`\n[DONE] std::deque & CP I/O Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
