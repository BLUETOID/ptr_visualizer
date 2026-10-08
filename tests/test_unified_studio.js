import assert from 'assert';
import { tokenize } from '../src/core/lexer.js';
import { parseProgram } from '../src/core/parser.js';
import { runProgram, resetEngineState } from '../src/core/interpreter.js';
import { DsaRenderer, formatCellValue } from '../src/render/dsaRenderer.js';
import { TreeRenderer } from '../src/render/treeRenderer.js';
import { ListRenderer } from '../src/render/listRenderer.js';
import { EXAMPLES_CATALOG } from '../src/examples/catalog.js';

console.log('[START] Verifying Unified C++ Visualizer Studio & Hybrid Execution...');

// 1. Verify Tree BFS (Level Order) with queue<TreeNode*> and vector<int>
{
  const ex = EXAMPLES_CATALOG['tree_bfs_queue'];
  assert.ok(ex, 'tree_bfs_queue preset must exist in catalog');

  const tokens = tokenize(ex.code);
  const ast = parseProgram(tokens);
  assert.ok(ast.functions['main'], 'main function parsed');

  resetEngineState();
  const timeline = runProgram(ast.functions['main'], [], ast.functions);
  assert.ok(timeline.length > 20, `Tree BFS should produce multiple steps, got ${timeline.length}`);

  // Find a snapshot that contains both tree nodes in heap and items in queue
  const hybridSnap = timeline.find(snap => {
    const hasHeap = snap.heap && Object.keys(snap.heap).length >= 5;
    const hasQueue = snap.frames && snap.frames.some(f => 
      f.vars && Object.values(f.vars).some(v => v.value && v.value.isQueue && v.value.elements.length > 0)
    );
    return hasHeap && hasQueue;
  });

  assert.ok(hybridSnap, 'Should find a snapshot with both tree nodes and active queue items');

  // Verify pointer formatting inside queue cells
  const queueVar = Object.values(hybridSnap.frames[0].vars).find(v => v.value && v.value.isQueue);
  const frontNodeId = queueVar.value.elements[0];
  assert.ok(typeof frontNodeId === 'string' && hybridSnap.heap[frontNodeId], 'Queue element should be a valid heap ID');
  const formattedVal = formatCellValue(frontNodeId, hybridSnap.heap);
  assert.ok(formattedVal.startsWith('Node '), `Pointer in cell should format as "Node <val>", got: ${formattedVal}`);

  console.log('  [PASS] Tree BFS (queue<TreeNode*>) executes with active heap & queue snapshots');
}

// 2. Verify Merge K Lists with priority_queue and ListNode*
{
  const ex = EXAMPLES_CATALOG['merge_k_lists'];
  assert.ok(ex, 'merge_k_lists preset must exist in catalog');

  const tokens = tokenize(ex.code);
  const ast = parseProgram(tokens);
  assert.ok(ast.functions['main'], 'main function parsed');

  resetEngineState();
  const timeline = runProgram(ast.functions['main'], [], ast.functions);
  assert.ok(timeline.length > 15, `Merge K Lists should produce steps, got ${timeline.length}`);

  // Find snapshot with both priority_queue elements and linked list nodes
  const snapWithHeapAndPQ = timeline.find(snap => {
    const hasList = snap.heap && Object.values(snap.heap).some(n => n.structType === 'ListNode');
    const hasPQ = snap.frames && snap.frames.some(f => 
      f.vars && Object.values(f.vars).some(v => v.value && v.value.isPriorityQueue)
    );
    return hasList && hasPQ;
  });

  assert.ok(snapWithHeapAndPQ, 'Snapshot contains both ListNode and priority_queue');
  console.log('  [PASS] Merge K Lists (priority_queue & ListNode*) executes successfully');
}

// 3. Verify LRU Cache with unordered_map and DoublyListNode*
{
  const ex = EXAMPLES_CATALOG['lru_cache'];
  assert.ok(ex, 'lru_cache preset must exist in catalog');

  const tokens = tokenize(ex.code);
  const ast = parseProgram(tokens);
  assert.ok(ast.functions['main'], 'main function parsed');

  resetEngineState();
  const timeline = runProgram(ast.functions['main'], [], ast.functions);
  assert.ok(timeline.length > 15, `LRU cache should produce steps, got ${timeline.length}`);

  const snapWithDLLAndMap = timeline.find(snap => {
    const hasDLL = snap.heap && Object.values(snap.heap).some(n => n.structType === 'DoublyListNode');
    const hasMap = snap.frames && snap.frames.some(f => 
      f.vars && Object.values(f.vars).some(v => v.value && v.value.isMap && Object.keys(v.value.entries).length > 0)
    );
    return hasDLL && hasMap;
  });

  assert.ok(snapWithDLLAndMap, 'Snapshot contains both DoublyListNode and unordered_map');
  console.log('  [PASS] LRU Cache (unordered_map & DoublyListNode*) executes successfully');
}

// 4. Verify Coordinated SVG Canvas Rendering without throwing errors
{
  function createMockElement(tag) {
    const el = {
      tag,
      attrs: {},
      children: [],
      style: {},
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        toggle(c, val) { val ? this.classes.add(c) : this.classes.delete(c); },
        contains(c) { return this.classes.has(c); }
      },
      dataset: {},
      setAttribute: (k, v) => { el.attrs[k] = String(v); },
      getAttribute: (k) => el.attrs[k],
      appendChild: (child) => { el.children.push(child); return child; },
      remove: () => {},
      querySelector: () => createMockElement('sub'),
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    return el;
  }

  globalThis.document = {
    createElementNS: (ns, tag) => createMockElement(tag),
    getElementById: (id) => createMockElement(id)
  };

  const mockViewport = createMockElement('g');

  const dsaRenderer = new DsaRenderer(mockViewport);
  const treeRenderer = new TreeRenderer(mockViewport);
  const listRenderer = new ListRenderer(mockViewport);

  // Take Tree BFS snapshot and render both
  const bfsEx = EXAMPLES_CATALOG['tree_bfs_queue'];
  const tokens = tokenize(bfsEx.code);
  const ast = parseProgram(tokens);
  resetEngineState();
  const timeline = runProgram(ast.functions['main'], [], ast.functions);
  const testSnap = timeline[timeline.length - 1];

  // Render both containers in upper band and tree in lower band
  assert.doesNotThrow(() => {
    dsaRenderer.render(testSnap.frames, testSnap.heap, testSnap.meta, { offsetY: 25, compact: true });
    treeRenderer.render(testSnap.heap, testSnap.frames, testSnap.meta, { offsetY: 240 });
  }, 'Simultaneous dynamic dual-band rendering should not throw');

  console.log('  [PASS] Simultaneous dynamic dual-band SVG rendering executes cleanly without errors');
}

// 5. Verify pointer variables (e.g. ListNode* a = new ListNode(1)) are never treated as std::string
{
  const code = `
void main() {
    ListNode* a = new ListNode(1);
    ListNode* b = new ListNode(2);
    ListNode* c = new ListNode(3);
    ListNode* d = new ListNode(10);
    a->next = b;
    b->next = c;
    c->next = d;
    d->next = a;
}
`;
  const tokens = tokenize(code);
  const ast = parseProgram(tokens);
  resetEngineState();
  const timeline = runProgram(ast.functions['main'], [], ast.functions);
  const lastSnap = timeline[timeline.length - 1];

  // Check all frame variables:
  for (const [name, info] of Object.entries(lastSnap.frames[0].vars)) {
    assert.strictEqual(info.kind, 'pointer', `Variable ${name} should have kind 'pointer', got '${info.kind}'`);
  }

  // Check that DsaRenderer does NOT create string structures for these pointers
  const mockViewport = {
    tag: 'g',
    attrs: {},
    children: [],
    style: {},
    classList: { classes: new Set(), add() {}, remove() {}, contains() { return false; }, toggle() {} },
    dataset: {},
    setAttribute() {},
    getAttribute() { return ''; },
    appendChild(c) { this.children.push(c); return c; },
    remove() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {}
  };
  const dsaRenderer = new DsaRenderer(mockViewport);
  dsaRenderer.render(lastSnap.frames, lastSnap.heap, lastSnap.meta);

  // Since there are zero containers or strings, DsaRenderer renders empty notice, not string boxes
  const renderedText = JSON.stringify(mockViewport);
  assert.ok(!renderedText.includes('std::string a'), 'DsaRenderer must not render std::string for pointer variable a');
  assert.ok(!renderedText.includes('std::string b'), 'DsaRenderer must not render std::string for pointer variable b');
  assert.ok(!renderedText.includes('std::string c'), 'DsaRenderer must not render std::string for pointer variable c');
  assert.ok(!renderedText.includes('std::string d'), 'DsaRenderer must not render std::string for pointer variable d');

  console.log('  [PASS] Heap pointer variables (n0, n1, n2, n3) are never misclassified as std::string');
}

// 6. Verify topbar does not have brand title saying PtrViz Studio
{
  import('fs').then(fs => {
    const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf-8');
    assert.ok(!html.includes('class="brand-title"'), 'index.html topbar should not have brand-title');
    assert.ok(!html.includes('PtrViz Studio</span>'), 'index.html should not have PtrViz Studio in topbar');
    console.log('  [PASS] Top bar brand title removed cleanly');
  });
}

console.log('[DONE] All Unified C++ Visualizer Studio & Hybrid Execution tests passed with 100% success!\n');
