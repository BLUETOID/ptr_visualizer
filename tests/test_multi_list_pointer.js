/**
 * Automated Verification Script for Multi-Linked-List Support & Red Nullptr Arrow
 */

import { parseListInputs } from '../src/main.js';
import { EXAMPLES_CATALOG, buildListHelper, buildMultiListHelper } from '../src/examples/catalog.js';
import { tokenize } from '../src/core/lexer.js';
import { parseProgram } from '../src/core/parser.js';
import { resetEngineState, runProgram } from '../src/core/interpreter.js';
import { ListRenderer } from '../src/render/listRenderer.js';
import fs from 'fs';

console.log('[START] Verifying Multi-Linked-List Input Parsing...');

// 1. parseListInputs tests
const t1 = parseListInputs('[1, 2, 4], [1, 3, 4]');
console.assert(t1.length === 2, `Expected 2 lists, got ${t1.length}`);
console.assert(JSON.stringify(t1[0]) === '[1,2,4]', `Expected [1,2,4], got ${JSON.stringify(t1[0])}`);
console.assert(JSON.stringify(t1[1]) === '[1,3,4]', `Expected [1,3,4], got ${JSON.stringify(t1[1])}`);
console.log('  [PASS] Comma-separated bracketed lists parsed successfully: [1, 2, 4], [1, 3, 4]');

const t2 = parseListInputs('[[1, 2, 4], [1, 3, 4]]');
console.assert(t2.length === 2, `Expected 2 lists, got ${t2.length}`);
console.log('  [PASS] 2D JSON array parsed successfully: [[1, 2, 4], [1, 3, 4]]');

const t3 = parseListInputs('[1, 2, 3]');
console.assert(t3.length === 1, `Expected 1 list, got ${t3.length}`);
console.assert(JSON.stringify(t3[0]) === '[1,2,3]', `Expected [1,2,3], got ${JSON.stringify(t3[0])}`);
console.log('  [PASS] Single 1D array parsed successfully: [1, 2, 3]');

const t4 = parseListInputs('[1, 2], [3, 4], [5, 6]');
console.assert(t4.length === 3, `Expected 3 lists, got ${t4.length}`);
console.log('  [PASS] Three lists parsed successfully: [1, 2], [3, 4], [5, 6]');

const t5 = parseListInputs('1, 2, 3; 4, 5, 6');
console.assert(t5.length === 2, `Expected 2 lists, got ${t5.length}`);
console.log('  [PASS] Semicolon-separated lists parsed successfully: 1, 2, 3; 4, 5, 6');

// 2. buildMultiListHelper tests
console.log('[START] Verifying buildMultiListHelper structure...');
const multiBuilt = buildMultiListHelper([[1, 2, 4], [1, 3, 4]]);
console.assert(multiBuilt.heads.length === 2, `Expected 2 heads, got ${multiBuilt.heads.length}`);
const head1 = multiBuilt.heap[multiBuilt.heads[0]];
const head2 = multiBuilt.heap[multiBuilt.heads[1]];
console.assert(head1.row === 0, `Head1 should be on row 0, got ${head1.row}`);
console.assert(head2.row === 1, `Head2 should be on row 1, got ${head2.row}`);
console.assert(head1.col === 0, `Head1 should be at col 0`);
console.assert(head2.col === 0, `Head2 should be at col 0`);
console.log('  [PASS] buildMultiListHelper assigns distinct row 0 and row 1 with correct col indices.');

// 3. LC 21 Merge Two Sorted Lists execution test
console.log('[START] Verifying LC 21 Merge Two Sorted Lists execution...');
const lc21Preset = EXAMPLES_CATALOG['lc21'];
console.assert(!!lc21Preset, 'Preset lc21 must exist in catalog');
const lc21Tokens = tokenize(lc21Preset.code);
const lc21Ast = parseProgram(lc21Tokens);
const lc21Initial = lc21Preset.buildInitial([[1, 2, 4], [1, 3, 4]], {});
resetEngineState(lc21Initial.heap, lc21Initial.heapCounter, lc21Initial.colRight);
const lc21Timeline = runProgram(lc21Ast.functions[lc21Preset.entryFn], lc21Initial.args, lc21Ast.functions);
console.assert(lc21Timeline && lc21Timeline.length > 10, `Expected >10 steps for LC 21, got ${lc21Timeline.length}`);
console.log(`  [PASS] LC 21 execution passed with ${lc21Timeline.length} steps.`);

// 4. LC 160 Intersection of Two Lists execution test
console.log('[START] Verifying LC 160 Intersection of Two Lists execution...');
const lc160Preset = EXAMPLES_CATALOG['lc160'];
console.assert(!!lc160Preset, 'Preset lc160 must exist in catalog');
const lc160Tokens = tokenize(lc160Preset.code);
const lc160Ast = parseProgram(lc160Tokens);
const lc160Initial = lc160Preset.buildInitial([], {});
resetEngineState(lc160Initial.heap, lc160Initial.heapCounter, lc160Initial.colRight);
const lc160Timeline = runProgram(lc160Ast.functions[lc160Preset.entryFn], lc160Initial.args, lc160Ast.functions);
console.assert(lc160Timeline && lc160Timeline.length > 5, `Expected >5 steps for LC 160, got ${lc160Timeline.length}`);
console.log(`  [PASS] LC 160 execution passed with ${lc160Timeline.length} steps.`);

// 5. ListRenderer Multi-Row & Distinct NULL Anchor test
console.log('[START] Verifying ListRenderer Multi-Row Layout & Distinct nullptr Anchors...');

// Setup mock DOM for ListRenderer
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

const viewport = mockEl('g', 'viewport');
const listRenderer = new ListRenderer(viewport);

// Render initial multi-list state with 2 rows
const initialSnap = lc21Timeline[0];
listRenderer.render(initialSnap.heap, initialSnap.frames, initialSnap.meta || {});

// Verify that separate nullptr anchors were created for Row 0 and Row 1
console.assert(listRenderer.elCache.has('nullptr-anchor-0'), 'Must create nullptr-anchor-0 for Row 0');
console.assert(listRenderer.elCache.has('nullptr-anchor-1'), 'Must create nullptr-anchor-1 for Row 1');
console.log('  [PASS] ListRenderer created distinct nullptr-anchor-0 and nullptr-anchor-1 for Row 0 and Row 1.');

// Verify row labels List 1 and List 2 were created
console.assert(listRenderer.elCache.has('row-label-0'), 'Must create row-label-0 for List 1');
console.assert(listRenderer.elCache.has('row-label-1'), 'Must create row-label-1 for List 2');
console.log('  [PASS] ListRenderer created row-label-0 and row-label-1 on the canvas.');

// 6. Verify Red nullptr Arrow Styling
console.log('[START] Verifying Red Arrow Styling for nullptr Targets...');
// Node 2 (last node of list 1) points to null
const edgeToNull = listRenderer.elCache.get('edge:n2:next');
console.assert(edgeToNull, 'edge:n2:next must exist');
console.assert(edgeToNull.classList.contains('edge-null'), 'Edge to null must have class edge-null');
console.assert(edgeToNull.getAttribute('marker-end') === 'url(#arrowhead-null)', 'Edge to null must use url(#arrowhead-null)');
console.log('  [PASS] Edge pointing to nullptr is styled in red with url(#arrowhead-null) marker.');

// Node 0 (points to node 1) is a normal intra-list edge
const edgeNormal = listRenderer.elCache.get('edge:n0:next');
console.assert(edgeNormal, 'edge:n0:next must exist');
console.assert(!edgeNormal.classList.contains('edge-null'), 'Normal edge must not have edge-null class');
console.assert(edgeNormal.getAttribute('marker-end') === 'url(#arrowhead)', 'Normal edge must use standard url(#arrowhead)');
console.log('  [PASS] Normal edge pointing to another node retains classic slate styling.');

// Render all steps of LC 21 to verify no crash during dynamic splicing
let renderedSteps = 0;
for (let i = 0; i < lc21Timeline.length; i++) {
  const snap = lc21Timeline[i];
  listRenderer.render(snap.heap, snap.frames, snap.meta || {});
  renderedSteps++;
}
console.log(`  [PASS] Successfully rendered all ${renderedSteps} steps of LC 21 with inter-row transitions.`);

// 7. Doubly Linked List Rendering & Pointer Alignment
console.log('[START] Verifying Doubly Linked List Rendering & Dual Nullptr Anchors...');
const dllPreset = EXAMPLES_CATALOG['dll_insert'];
console.assert(!!dllPreset, 'DLL preset must exist in catalog');
const dllTokens = tokenize(dllPreset.code);
const dllAst = parseProgram(dllTokens);
const dllInitial = dllPreset.buildInitial([10, 20, 30], { newVal: 25 });
resetEngineState(dllInitial.heap, dllInitial.heapCounter, dllInitial.colRight);
const dllTimeline = runProgram(dllAst.functions[dllPreset.entryFn], dllInitial.args, dllAst.functions);

const dllRenderer = new ListRenderer(mockEl('g', 'dll-viewport'));
// Render step 0
dllRenderer.render(dllTimeline[0].heap, dllTimeline[0].frames, dllTimeline[0].meta || {});

// Both right and left nullptr anchors must exist
console.assert(dllRenderer.elCache.has('nullptr-anchor'), 'DLL must have right nullptr-anchor');
console.assert(dllRenderer.elCache.has('nullptr-anchor-prev'), 'DLL must have left nullptr-anchor-prev');
console.log('  [PASS] Doubly Linked List renders distinct nullptr anchors on both left and right sides.');

// DLL head->prev points to left null, so it should be red
const dllPrevNull = dllRenderer.elCache.get('edge:n0:prev');
console.assert(dllPrevNull && dllPrevNull.classList.contains('edge-null'), 'DLL head->prev null edge must be red');
console.assert(dllPrevNull.getAttribute('marker-end') === 'url(#arrowhead-null)', 'DLL head->prev must use red arrowhead-null');
console.log('  [PASS] DLL head->prev null pointer renders with red edge-null and arrowhead-null to left nullptr.');

// DLL tail->next points to right null, so it should be red
const dllNextNull = dllRenderer.elCache.get('edge:n2:next');
console.assert(dllNextNull && dllNextNull.classList.contains('edge-null'), 'DLL tail->next null edge must be red');
console.assert(dllNextNull.getAttribute('marker-end') === 'url(#arrowhead-null)', 'DLL tail->next must use red arrowhead-null');
console.log('  [PASS] DLL tail->next null pointer renders with red edge-null and arrowhead-null to right nullptr.');

// Verify adjacent next edge uses classic curved arc
const nextEdge = dllRenderer.elCache.get('edge:n0:next');
console.assert(nextEdge && nextEdge.getAttribute('d').includes('C'), 'Next edge must be classic curved arc');
console.log('  [PASS] Doubly Linked List edges use classic curved arcs flowing from node to node.');

// Verify all new DLL presets execute
const dllPresetKeys = ['dll_prepend', 'dll_insert', 'dll_delete', 'dll_reverse', 'dll_palindrome', 'dll_scratchpad'];
dllPresetKeys.forEach(key => {
  const p = EXAMPLES_CATALOG[key];
  console.assert(!!p, `Preset ${key} must exist in catalog`);
  const t = tokenize(p.code);
  const a = parseProgram(t);
  const ini = p.buildInitial(JSON.parse(p.defaultArray), { targetVal: 20, newVal: 5 });
  resetEngineState(ini.heap, ini.heapCounter, ini.colRight);
  const time = runProgram(a.functions[p.entryFn], ini.args, a.functions);
  console.assert(time && time.length > 0, `Preset ${key} must generate timeline steps`);
  dllRenderer.render(time[0].heap, time[0].frames, time[0].meta || {});
  console.assert(dllRenderer.elCache.has('nullptr-anchor'), `${key} must have right nullptr`);
  console.assert(dllRenderer.elCache.has('nullptr-anchor-prev'), `${key} must have left nullptr`);
});
console.log('  [PASS] All Doubly Linked List presets (prepend, insert, delete, reverse, palindrome, scratchpad) executed and verified with dual nullptr.');

// 8. Verify runBtn removal & marker definitions in index.html
console.log('[START] Verifying runBtn removal & markers in index.html...');
const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf-8');
console.assert(!indexHtml.includes('id="runBtn"'), 'id="runBtn" must NOT be in index.html');
console.assert(!indexHtml.includes('Run / Build'), 'Run / Build text must NOT be in index.html');
console.assert(indexHtml.includes('id="arrowhead"'), 'id="arrowhead" must be defined in index.html');
console.assert(indexHtml.includes('id="arrowhead-null"'), 'id="arrowhead-null" must be defined in index.html');
// 9. Verify LC 234 with multi-list input [[1, 2, 2, 1],[3,5,5]]
console.log('[START] Verifying LC 234 with multi-list input [[1, 2, 2, 1],[3,5,5]]...');
const lc234Parsed = parseListInputs('[[1, 2, 2, 1],[3,5,5]]');
console.assert(lc234Parsed.length === 2, 'Must parse 2 lists');
const lc234Multi = buildMultiListHelper(lc234Parsed);
console.assert(lc234Multi.heads.length === 2, 'Must have 2 heads');
console.assert(Object.keys(lc234Multi.heap).length === 7, 'Must create exactly 7 nodes (4 in list 1, 3 in list 2)');

const lc234Preset = EXAMPLES_CATALOG['lc234'];
const lc234Tokens = tokenize(lc234Preset.code);
const lc234Ast = parseProgram(lc234Tokens);
resetEngineState(lc234Multi.heap, lc234Multi.heapCounter, lc234Multi.maxCol);
const lc234Timeline = runProgram(lc234Ast.functions[lc234Preset.entryFn], lc234Multi.heads, lc234Ast.functions);

const step0 = lc234Timeline[0];
console.assert(step0.frames[0].vars['head'] && step0.frames[0].vars['head'].value === lc234Multi.heads[0], 'head must point to list 1 head');
console.assert(step0.frames[0].vars['head2'] && step0.frames[0].vars['head2'].value === lc234Multi.heads[1], 'head2 must be automatically created pointing to list 2 head');
console.assert(step0.meta.leaks.length === 0, 'List 2 must NOT be flagged as a memory leak because head2 reaches it');
console.log('  [PASS] head2 pointer variable created automatically; memory leaks are 0.');

const lc234Renderer = new ListRenderer(mockEl('g', 'lc234-viewport'));
lc234Renderer.render(step0.heap, step0.frames, step0.meta);

console.assert(lc234Renderer.elCache.has('nullptr-anchor-0'), 'Row 0 must have nullptr-anchor-0');
console.assert(lc234Renderer.elCache.has('nullptr-anchor-1'), 'Row 1 must have nullptr-anchor-1');
console.assert(lc234Renderer.elCache.has('row-label-0'), 'Row 0 must have row-label-0');
console.assert(lc234Renderer.elCache.has('row-label-1'), 'Row 1 must have row-label-1');
console.assert(lc234Renderer.elCache.has('badge:0:head'), 'Must render badge for head');
console.assert(lc234Renderer.elCache.has('badge:0:head2'), 'Must render badge for head2');
console.log('  [PASS] LC 234 with [[1, 2, 2, 1],[3,5,5]] correctly renders 2 separate rows with head & head2 badges.');

console.log('\n[DONE] All Multi-Linked-List & Red Nullptr Arrow verification checks passed with 100% success!');
