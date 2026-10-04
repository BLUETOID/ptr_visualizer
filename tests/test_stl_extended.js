import { tokenize } from '../src/core/lexer.js';
import { parseProgram } from '../src/core/parser.js';
import { runProgram, resetEngineState } from '../src/core/interpreter.js';
import { DsaRenderer } from '../src/render/dsaRenderer.js';

console.log('[START] Starting Extended STL & Containers Verification...');

function runCode(code, cinInput = '') {
  const tokens = tokenize(code);
  const ast = parseProgram(tokens);
  resetEngineState();
  const entryFn = ast.functions.main || ast.functions.solve || ast.functions[ast.order[0]];
  return runProgram(entryFn, [], ast.functions, cinInput);
}

// 1. Test std::string manipulation
try {
  const code = `
  int main() {
    string s = "racecar";
    s.push_back('!');
    s[0] = 'R';
    int len = s.length();
    string sub = s.substr(1, 3);
    int pos = s.find("car");
    s += '?';
    return 0;
  }
  `;
  const timeline = runCode(code);
  const lastFrame = timeline[timeline.length - 1].frames[0];
  const sVal = lastFrame.vars.s.value;
  if (sVal !== 'Racecar!?') throw new Error(`Expected s = 'Racecar!?', got '${sVal}'`);
  if (lastFrame.vars.len.value !== 8) throw new Error(`Expected len = 8, got ${lastFrame.vars.len.value}`);
  if (lastFrame.vars.sub.value !== 'ace') throw new Error(`Expected sub = 'ace', got '${lastFrame.vars.sub.value}'`);
  if (lastFrame.vars.pos.value !== 4) throw new Error(`Expected pos = 4, got ${lastFrame.vars.pos.value}`);
  console.log('  [PASS] std::string operations (push_back, index assign, substr, find, +=)');
} catch (e) {
  console.error('  [FAIL] std::string test:', e.message);
  process.exit(1);
}

// 2. Test std::priority_queue (Max-Heap and Min-Heap)
try {
  const code = `
  int main() {
    priority_queue<int> maxPq;
    maxPq.push(10);
    maxPq.push(50);
    maxPq.push(20);
    int topMax = maxPq.top();
    maxPq.pop();

    priority_queue<int, vector<int>, greater<int>> minPq;
    minPq.push(30);
    minPq.push(5);
    minPq.push(15);
    int topMin = minPq.top();
    return 0;
  }
  `;
  const timeline = runCode(code);
  const lastFrame = timeline[timeline.length - 1].frames[0];
  if (lastFrame.vars.topMax.value !== 50) throw new Error(`Expected topMax = 50, got ${lastFrame.vars.topMax.value}`);
  if (lastFrame.vars.topMin.value !== 5) throw new Error(`Expected topMin = 5, got ${lastFrame.vars.topMin.value}`);
  console.log('  [PASS] std::priority_queue (max-heap & min-heap ordering, push, pop, top)');
} catch (e) {
  console.error('  [FAIL] std::priority_queue test:', e.message);
  process.exit(1);
}

// 3. Test std::set
try {
  const code = `
  int main() {
    set<int> st;
    st.insert(42);
    st.insert(17);
    st.insert(42);
    int sz = st.size();
    int has17 = st.count(17);
    int has99 = st.count(99);
    st.erase(17);
    int szAfter = st.size();
    return 0;
  }
  `;
  const timeline = runCode(code);
  const lastFrame = timeline[timeline.length - 1].frames[0];
  if (lastFrame.vars.sz.value !== 2) throw new Error(`Expected set size 2 (unique), got ${lastFrame.vars.sz.value}`);
  if (lastFrame.vars.has17.value !== 1) throw new Error(`Expected has17 = 1, got ${lastFrame.vars.has17.value}`);
  if (lastFrame.vars.has99.value !== 0) throw new Error(`Expected has99 = 0, got ${lastFrame.vars.has99.value}`);
  if (lastFrame.vars.szAfter.value !== 1) throw new Error(`Expected szAfter = 1, got ${lastFrame.vars.szAfter.value}`);
  console.log('  [PASS] std::set (insert, uniqueness, count, erase, size)');
} catch (e) {
  console.error('  [FAIL] std::set test:', e.message);
  process.exit(1);
}

// 4. Test std::map
try {
  const code = `
  int main() {
    map<string, int> mp;
    mp["apple"] = 5;
    mp["banana"] = 12;
    int a = mp["apple"];
    int b = mp["banana"];
    int c = mp["orange"]; // auto-inserts 0
    int hasApple = mp.count("apple");
    return 0;
  }
  `;
  const timeline = runCode(code);
  const lastFrame = timeline[timeline.length - 1].frames[0];
  if (lastFrame.vars.a.value !== 5) throw new Error(`Expected apple = 5, got ${lastFrame.vars.a.value}`);
  if (lastFrame.vars.b.value !== 12) throw new Error(`Expected banana = 12, got ${lastFrame.vars.b.value}`);
  if (lastFrame.vars.c.value !== 0) throw new Error(`Expected orange = 0, got ${lastFrame.vars.c.value}`);
  if (lastFrame.vars.hasApple.value !== 1) throw new Error(`Expected hasApple = 1, got ${lastFrame.vars.hasApple.value}`);
  console.log('  [PASS] std::map (key-value assignment, lookup, auto-default, count)');
} catch (e) {
  console.error('  [FAIL] std::map test:', e.message);
  process.exit(1);
}

// 5. Test DsaRenderer SVG output generation for all container types
try {
  // Mock SVG DOM environment
  const mockElements = [];
  const mockViewport = {
    appendChild: (el) => mockElements.push(el)
  };
  globalThis.document = {
    createElementNS: (ns, tag) => {
      const el = {
        tag,
        attrs: {},
        children: [],
        setAttribute: (k, v) => { el.attrs[k] = v; },
        appendChild: (child) => { el.children.push(child); }
      };
      return el;
    }
  };

  const renderer = new DsaRenderer(mockViewport);
  const frames = [{
    vars: {
      s: { kind: 'string', value: 'hello' },
      adj: { kind: 'array', value: [[1, 2], [0]] },
      pq: { value: { isPriorityQueue: true, elements: [10, 5], isMinHeap: false } },
      st: { value: { isSet: true, elements: [1, 2, 3] } },
      mp: { value: { isMap: true, entries: { x: 10 } } }
    }
  }];
  renderer.render(frames, {}, {});
  console.log('  [PASS] DsaRenderer renders string, adjacency list, priority_queue, set, and map without errors');
} catch (e) {
  console.error('  [FAIL] DsaRenderer svg test:', e.message);
  process.exit(1);
}

console.log('[DONE] All Extended STL & Container tests passed!');
