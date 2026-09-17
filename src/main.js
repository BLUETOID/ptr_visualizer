/**
 * Main Application Orchestrator for C++ Pointer Visualizer
 */

import { tokenize } from './core/lexer.js';
import { parseProgram, ParseError } from './core/parser.js';
import { resetEngineState, runProgram } from './core/interpreter.js';

import { CanvasManager } from './render/canvas.js';
import { ListRenderer } from './render/listRenderer.js';
import { TreeRenderer } from './render/treeRenderer.js';

import { EXAMPLES_CATALOG } from './examples/catalog.js';
import { SNIPPETS } from './examples/snippets.js';

import { EditorManager } from './ui/editor.js';
import { ControlsManager } from './ui/controls.js';
import { MemoryInspector } from './ui/memoryInspector.js';
import { ExampleDrawer } from './ui/exampleDrawer.js';

class App {
  constructor() {
    this.currentPresetId = 'lc206';
    this.timeline = [];
    this.currentStep = 0;
    this.structureType = 'list';
    this.lastSuccessfulTimeline = [];

    this.initDOM();
    this.initSubsystems();

    // Restore saved state or load default
    const saved = this.loadSavedState();
    if (saved) {
      this.loadExample(saved.presetId, true);
      if (saved.code) {
        this.editor.setCode(saved.code);
      }
      if (saved.arrayInput) {
        this.arrayInput.value = saved.arrayInput;
      }
      this.rebuildAndRun();
    } else {
      this.loadExample(this.currentPresetId);
    }
  }

  initDOM() {
    this.presetSelect = document.getElementById('presetSelect');
    this.arrayInput = document.getElementById('arrayInput');
    this.extraFields = document.getElementById('extraFields');
    this.presetInfo = document.getElementById('presetInfo');
    this.runBtn = document.getElementById('runBtn');
    this.warningBanner = document.getElementById('warningBanner');
    this.followCursorToggle = document.getElementById('followCursorToggle');

    this.zoomInBtn = document.getElementById('zoomInBtn');
    this.zoomOutBtn = document.getElementById('zoomOutBtn');
    this.zoomResetBtn = document.getElementById('zoomResetBtn');

    // Populate preset dropdown with categorized optgroups
    this.presetSelect.innerHTML = '';
    const groups = {};
    Object.entries(EXAMPLES_CATALOG).forEach(([id, ex]) => {
      const cat = ex.category || 'General';
      if (!groups[cat]) {
        const og = document.createElement('optgroup');
        og.label = cat;
        groups[cat] = og;
        this.presetSelect.appendChild(og);
      }
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `${ex.label}`;
      groups[cat].appendChild(opt);
    });

    this.presetSelect.addEventListener('change', () => {
      this.loadExample(this.presetSelect.value);
    });

    this.arrayInput.addEventListener('input', () => {
      this.rebuildAndRun();
    });

    if (this.runBtn) {
      this.runBtn.addEventListener('click', () => {
        this.rebuildAndRun();
      });
    }

    this.newScratchpadBtn = document.getElementById('newScratchpadBtn');
    if (this.newScratchpadBtn) {
      this.newScratchpadBtn.addEventListener('click', () => {
        this.loadExample('scratchpad');
      });
    }

    if (this.followCursorToggle) {
      this.followCursorToggle.addEventListener('change', (e) => {
        this.editor.followCursor = e.target.checked;
      });
    }
  }

  initSubsystems() {
    // 1. Canvas & Renderers
    this.canvas = new CanvasManager('canvas', 'viewport');
    const viewport = document.getElementById('viewport');
    this.listRenderer = new ListRenderer(viewport);
    this.treeRenderer = new TreeRenderer(viewport);

    this.zoomInBtn.addEventListener('click', () => this.canvas.zoomBy(1.15));
    this.zoomOutBtn.addEventListener('click', () => this.canvas.zoomBy(0.85));
    this.zoomResetBtn.addEventListener('click', () => this.canvas.resetView(60, 40, 1));

    // 2. Memory Inspector
    this.memory = new MemoryInspector('stackPanel', 'memoryBadge');

    // 3. Editor
    this.editor = new EditorManager({
      codeInputId: 'codeInput',
      lineNumbersId: 'lineNumbers',
      activeLineId: 'activeLine',
      editorScrollId: 'editorScroll',
      parseStatusId: 'parseStatus',
      snippetsBarId: 'snippetsBar',
      onCodeChange: () => this.rebuildAndRun(),
      onCursorLine: (line) => this.handleCursorLine(line)
    });
    this.editor.renderSnippets(SNIPPETS);

    // 4. Controls
    this.controls = new ControlsManager({
      playBtnId: 'playBtn',
      prevBtnId: 'prevBtn',
      nextBtnId: 'nextBtn',
      resetBtnId: 'resetBtn',
      speedSelectId: 'speedSelect',
      progressId: 'progress',
      stepLabelId: 'stepLabel',
      explanationBannerId: 'explanationBanner',
      onStepChange: (step) => this.renderStep(step)
    });

    // 5. Example Drawer Modal
    this.drawer = new ExampleDrawer(EXAMPLES_CATALOG, (id) => {
      this.loadExample(id);
    });
  }

  loadExample(id, skipRun = false) {
    const ex = EXAMPLES_CATALOG[id] || EXAMPLES_CATALOG['scratchpad'];
    if (!ex) return;

    this.currentPresetId = id;
    this.presetSelect.value = id;
    this.structureType = ex.structureType;

    // Clear previous diagram elements to prevent overlap
    this.listRenderer.clear();
    this.treeRenderer.clear();

    this.arrayInput.value = ex.defaultArray || '[]';
    this.presetInfo.textContent = ex.info || '';

    this.buildExtraInputs(ex);
    this.editor.setCode(ex.code);

    this.canvas.resetView(ex.structureType === 'tree' ? 100 : 60, 40, 1);
    if (!skipRun) {
      this.rebuildAndRun();
    }
  }

  buildExtraInputs(ex) {
    this.extraFields.innerHTML = '';
    if (!ex.extra || ex.extra.length === 0) return;

    ex.extra.forEach(f => {
      const wrap = document.createElement('div');
      wrap.className = 'field-group';
      wrap.innerHTML = `
        <label for="extra_${f.id}">${f.label}</label>
        <input type="${f.type}" id="extra_${f.id}" value="${f.value}">
      `;
      wrap.querySelector('input').addEventListener('input', () => this.rebuildAndRun());
      this.extraFields.appendChild(wrap);
    });
  }

  readExtraParams(ex) {
    const out = {};
    if (!ex || !ex.extra) return out;
    ex.extra.forEach(f => {
      const el = document.getElementById(`extra_${f.id}`);
      if (el) {
        out[f.id] = f.type === 'number' ? parseInt(el.value, 10) : el.value;
      }
    });
    return out;
  }

  showWarning(msg) {
    if (!this.warningBanner) return;
    if (!msg) {
      this.warningBanner.style.display = 'none';
      return;
    }
    this.warningBanner.textContent = msg;
    this.warningBanner.style.display = 'block';
  }

  rebuildAndRun() {
    this.showWarning('');
    const code = this.editor.getCode().trim();

    // If completely empty, reset cleanly to blank state
    if (!code) {
      this.editor.setStatus('Scratchpad Empty', 'ok');
      this.controls.updateExplanation('Type C++ code to create nodes and visualize them live.');
      this.timeline = [];
      this.listRenderer.clear();
      this.treeRenderer.clear();
      this.memory.update([], {});
      return;
    }

    const ex = EXAMPLES_CATALOG[this.currentPresetId];

    // 1. Parse Input Array (optional in scratchpad mode)
    let arr = [];
    const arrStr = this.arrayInput.value.trim();
    if (arrStr) {
      try {
        arr = JSON.parse(arrStr);
        if (!Array.isArray(arr)) arr = [];
      } catch (e) {
        if (this.currentPresetId !== 'scratchpad') {
          this.editor.setStatus('Invalid JSON Array', 'error');
          this.controls.updateExplanation('Invalid input array format. Use JSON e.g. [1, 2, 3]', true);
          return;
        }
      }
    }

    // 2. Tokenize & Parse C++
    let ast;
    try {
      const tokens = tokenize(this.editor.getCode());
      ast = parseProgram(tokens);
    } catch (e) {
      const line = e.line || 1;
      this.editor.setStatus(`Syntax Error: L${line}`, 'error');
      this.editor.setActiveLine(line, true);
      this.controls.updateExplanation(`Syntax Error: ${e.message}`, true);
      return;
    }

    // 3. Find Entry Function (prioritize main, run, preset fn, or first fn)
    let fn = null;
    if (ast.functions['main']) fn = ast.functions['main'];
    else if (ast.functions['run']) fn = ast.functions['run'];
    else if (ex && ast.functions[ex.entryFn]) fn = ast.functions[ex.entryFn];
    else if (ast.order.length > 0) fn = ast.functions[ast.order[0]];

    if (!fn) {
      this.editor.setStatus('No Function Found', 'pending');
      this.controls.updateExplanation('Declare a function (e.g. void main() { ... }) to begin visualizing.');
      return;
    }

    // Auto-detect structure type: Tree if TreeNode used, otherwise List
    const prevType = this.structureType;
    if (code.includes('TreeNode')) {
      this.structureType = 'tree';
    } else {
      this.structureType = 'list';
    }
    if (prevType !== this.structureType) {
      this.listRenderer.clear();
      this.treeRenderer.clear();
    }

    // 4. Build Initial Structure Heap
    const extra = this.readExtraParams(ex);
    let initial;
    try {
      if (fn.params.length === 0) {
        initial = { heap: {}, heapCounter: 0, colRight: 0, args: [] };
      } else if (ex && ex.buildInitial) {
        initial = ex.buildInitial(arr, extra);
      } else {
        initial = { heap: {}, heapCounter: 0, colRight: 0, args: new Array(fn.params.length).fill(null) };
      }
    } catch (e) {
      this.editor.setStatus('Build Error', 'error');
      this.controls.updateExplanation(`Structure build error: ${e.message}`, true);
      return;
    }

    // 5. Execute in Interpreter
    resetEngineState(initial.heap, initial.heapCounter, initial.colRight);
    let timeline;
    try {
      timeline = runProgram(fn, initial.args, ast.functions);
    } catch (e) {
      this.editor.setStatus('Runtime Error', 'error');
      this.controls.updateExplanation(`Runtime exception: ${e.message}`, true);
      return;
    }

    // Success! Update timeline
    this.timeline = timeline;
    this.lastSuccessfulTimeline = timeline;
    this.controls.setTimelineLength(timeline.length);

    this.editor.setStatus(`Live OK (${timeline.length} steps)`, 'ok');

    // Default to the final step so user immediately sees their created structures
    this.currentStep = Math.max(0, timeline.length - 1);
    this.renderStep(this.currentStep);

    // Persist state to localStorage
    this.saveState();
  }

  renderStep(idx) {
    if (!this.timeline || this.timeline.length === 0) return;
    const snap = this.timeline[idx];
    if (!snap) return;

    this.currentStep = idx;

    // Highlight editor active line
    const isErr = !!(snap.meta && snap.meta.error);
    this.editor.setActiveLine(snap.lineIndex, isErr);

    // Update memory inspector (stack & heap)
    this.memory.update(snap.frames, snap.heap, snap.meta);

    // Update explanation banner
    this.controls.updateExplanation(snap.explanation, isErr, snap.meta || {});

    // Show warning banner for serious memory violations
    if (snap.meta && snap.meta.error) {
      this.showWarning(snap.explanation);
    } else {
      this.showWarning('');
    }

    // Render Canvas (always clear opposing renderer to prevent ghost overlap)
    if (this.structureType === 'tree') {
      this.listRenderer.clear();
      this.treeRenderer.render(snap.heap, snap.frames, snap.meta || {});
    } else {
      this.treeRenderer.clear();
      this.listRenderer.render(snap.heap, snap.frames, snap.meta || {});
    }
  }

  handleCursorLine(lineNumber) {
    if (!this.timeline || this.timeline.length === 0) return;

    // Find the latest step corresponding to this line number
    let matchedStep = -1;
    for (let i = 0; i < this.timeline.length; i++) {
      if (this.timeline[i].lineIndex === lineNumber) {
        matchedStep = i;
      }
    }

    if (matchedStep !== -1 && matchedStep !== this.currentStep) {
      this.controls.setStep(matchedStep);
    }
  }

  // ---- localStorage Persistence ----
  saveState() {
    try {
      const state = {
        presetId: this.currentPresetId,
        code: this.editor.getCode(),
        arrayInput: this.arrayInput.value
      };
      localStorage.setItem('ptrviz_state', JSON.stringify(state));
    } catch (e) { /* localStorage unavailable or full */ }
  }

  loadSavedState() {
    try {
      const raw = localStorage.getItem('ptrviz_state');
      if (!raw) return null;
      const state = JSON.parse(raw);
      if (!state.presetId) return null;
      return state;
    } catch (e) {
      return null;
    }
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
