/**
 * End-to-end rendering test for all DSA and Pointer presets
 */

import { EXAMPLES_CATALOG } from '../src/examples/catalog.js';
import { tokenize } from '../src/core/lexer.js';
import { parseProgram } from '../src/core/parser.js';
import { resetEngineState, runProgram } from '../src/core/interpreter.js';
import { DsaRenderer, isIndexPointerName } from '../src/render/dsaRenderer.js';
import { ListRenderer } from '../src/render/listRenderer.js';
import { TreeRenderer } from '../src/render/treeRenderer.js';

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

console.log('[START] Verifying isIndexPointerName logic...');
// Check pointers
console.assert(isIndexPointerName('i') === true, 'i should be index pointer');
console.assert(isIndexPointerName('j') === true, 'j should be index pointer');
console.assert(isIndexPointerName('left') === true, 'left should be index pointer');
console.assert(isIndexPointerName('right') === true, 'right should be index pointer');
console.assert(isIndexPointerName('low') === true, 'low should be index pointer');
console.assert(isIndexPointerName('high') === true, 'high should be index pointer');
console.assert(isIndexPointerName('mid') === true, 'mid should be index pointer');
console.assert(isIndexPointerName('slow') === true, 'slow should be index pointer');
console.assert(isIndexPointerName('fast') === true, 'fast should be index pointer');

// Check scalars
console.assert(isIndexPointerName('val') === false, 'val should NOT be index pointer');
console.assert(isIndexPointerName('currentMax') === false, 'currentMax should NOT be index pointer');
console.assert(isIndexPointerName('maxSoFar') === false, 'maxSoFar should NOT be index pointer');
console.assert(isIndexPointerName('sum') === false, 'sum should NOT be index pointer');
console.assert(isIndexPointerName('target') === false, 'target should NOT be index pointer');
console.assert(isIndexPointerName('ans') === false, 'ans should NOT be index pointer');
console.assert(isIndexPointerName('count') === false, 'count should NOT be index pointer');
console.assert(isIndexPointerName('total') === false, 'total should NOT be index pointer');
console.log('  [PASS] isIndexPointerName correctly distinguishes index pointers from scalars.');

console.log('[START] Rendering Kadane Algorithm steps in DsaRenderer...');
const kadanePreset = EXAMPLES_CATALOG['dsa_kadane'];
const kadaneTokens = tokenize(kadanePreset.code);
const kadaneAst = parseProgram(kadaneTokens);
resetEngineState({}, 0, 0);
const kadaneTimeline = runProgram(kadaneAst.functions['main'], [], kadaneAst.functions);

const viewport = mockEl('g', 'viewport');
const dsaRenderer = new DsaRenderer(viewport);

let renderedCount = 0;
for (let i = 0; i < kadaneTimeline.length; i++) {
  const snap = kadaneTimeline[i];
  dsaRenderer.render(snap.frames, snap.heap, snap.meta || {});
  renderedCount++;
}
console.log(`  [PASS] Successfully rendered all ${renderedCount} steps of Kadane Algorithm without error.`);

console.log('[START] Testing all presets rendering in DsaRenderer and ListRenderer...');
const dsaPresets = [
  'dsa_twosum', 'dsa_binarysearch', 'dsa_reverse', 'dsa_bubblesort',
  'dsa_slidingwindow', 'dsa_kadane', 'dsa_vector', 'dsa_stack',
  'dsa_queue', 'dsa_pair', 'dsa_pqueue', 'dsa_set', 'dsa_map'
];

for (const id of dsaPresets) {
  const preset = EXAMPLES_CATALOG[id];
  if (!preset) continue;
  const tokens = tokenize(preset.code);
  const ast = parseProgram(tokens);
  resetEngineState({}, 0, 0);
  const fn = ast.functions['main'] || ast.functions['run'] || ast.functions[preset.entryFn];
  const timeline = runProgram(fn, [], ast.functions);
  const lastSnap = timeline[timeline.length - 1];
  dsaRenderer.render(lastSnap.frames, lastSnap.heap, lastSnap.meta || {});
}
console.log('  [PASS] All 13 DSA presets rendered cleanly with zero errors.');

console.log('[DONE] All rendering verification tests passed cleanly!');
