/**
 * Main Application Orchestrator for C++ Pointer Visualizer
 */

import { tokenize } from './core/lexer.js';
import { parseProgram, ParseError } from './core/parser.js';
import { resetEngineState, runProgram } from './core/interpreter.js';

import { CanvasManager } from './render/canvas.js';
import { ListRenderer } from './render/listRenderer.js';
import { TreeRenderer } from './render/treeRenderer.js';
import { DsaRenderer } from './render/dsaRenderer.js';

import { EXAMPLES_CATALOG } from './examples/catalog.js';
import { SNIPPETS, POINTER_SNIPPETS, ARRAY_STL_SNIPPETS, DSA_SNIPPETS } from './examples/snippets.js';

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
    this.visualizerMode = 'pointer';
    this.lastSuccessfulTimeline = [];

    this.initDOM();
    this.initSubsystems();

    // Check URL parameters for shared code/presets
    let loadedFromUrl = false;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('code') || urlParams.has('preset')) {
        const sharedMode = urlParams.get('mode');
        const sharedPreset = urlParams.get('preset') || 'scratchpad';
        const rawCode = urlParams.get('code');
        const rawInput = urlParams.get('input');

        if (sharedMode) {
          this.setMode(sharedMode, false);
        }
        this.loadExample(sharedPreset, true);
        if (rawCode) {
          this.editor.setCode(decodeURIComponent(rawCode));
        }
        if (rawInput && this.arrayInput) {
          this.arrayInput.value = decodeURIComponent(rawInput);
        }
        this.rebuildAndRun();
        loadedFromUrl = true;
      }
    } catch (e) { /* ignore url parse error */ }

    if (!loadedFromUrl) {
      // Restore saved state or load default
      const saved = this.loadSavedState();
      if (saved) {
        if (saved.visualizerMode) {
          this.setMode(saved.visualizerMode, false);
        }
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
    this.shareBtn = document.getElementById('shareBtn');
    this.exportSvgBtn = document.getElementById('exportSvgBtn');
    this.toastEl = document.getElementById('toastNotification');
    this.toastMsg = document.getElementById('toastMsg');

    this.modePointerBtn = document.getElementById('modePointerBtn');
    this.modeDsaBtn = document.getElementById('modeDsaBtn');
    this.inputLabel = document.getElementById('inputLabel');
    this.newScratchpadBtn = document.getElementById('newScratchpadBtn');

    if (this.modePointerBtn) {
      this.modePointerBtn.addEventListener('click', () => this.setMode('pointer'));
    }
    if (this.modeDsaBtn) {
      this.modeDsaBtn.addEventListener('click', () => this.setMode('array_stl'));
    }

    this.populatePresetDropdown(this.visualizerMode);

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

    if (this.shareBtn) {
      this.shareBtn.addEventListener('click', () => this.shareVisualization());
    }

    if (this.exportSvgBtn) {
      this.exportSvgBtn.addEventListener('click', () => this.exportSvg());
    }

    if (this.newScratchpadBtn) {
      this.newScratchpadBtn.addEventListener('click', () => {
        if (this.visualizerMode === 'array_stl') {
          this.loadExample('dsa_scratchpad');
        } else {
          this.loadExample('scratchpad');
        }
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
    this.dsaRenderer = new DsaRenderer(viewport);

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
      onStepChange: (step) => this.renderStep(step, true)
    });

    // 5. Example Drawer Modal
    this.drawer = new ExampleDrawer(EXAMPLES_CATALOG, (id) => {
      this.loadExample(id);
    });
  }

  populatePresetDropdown(mode) {
    if (!this.presetSelect) return;
    this.presetSelect.innerHTML = '';
    const groups = {};
    Object.entries(EXAMPLES_CATALOG).forEach(([id, ex]) => {
      const isArrayStl = ex.structureType === 'dsa' ||
        ex.category === 'Array Algorithms' ||
        ex.category === 'C++ STL Containers' ||
        ex.category === 'C++ STL Algorithms' ||
        ex.category === 'DSA & Arrays';

      if (mode === 'array_stl' && !isArrayStl) return;
      if (mode === 'pointer' && isArrayStl) return;

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
  }

  setMode(mode, triggerRender = true) {
    const normalizedMode = (mode === 'dsa' || mode === 'array_stl') ? 'array_stl' : 'pointer';
    if (this.visualizerMode === normalizedMode && !triggerRender) return;

    // Buffer previous mode code & inputs to preserve user work
    if (!this.modeBuffers) this.modeBuffers = {};
    if (this.editor && this.currentPresetId) {
      this.modeBuffers[this.visualizerMode] = {
        presetId: this.currentPresetId,
        code: this.editor.getCode(),
        arrayInput: this.arrayInput ? this.arrayInput.value : ''
      };
    }

    this.visualizerMode = normalizedMode;

    const stackTitle = document.querySelector('#stackWrap .panel-title span');
    if (this.modePointerBtn && this.modeDsaBtn) {
      if (normalizedMode === 'array_stl') {
        this.modeDsaBtn.classList.add('active', 'dsa-active');
        this.modePointerBtn.classList.remove('active');
        this.editor.renderSnippets(ARRAY_STL_SNIPPETS);
        if (this.inputLabel) this.inputLabel.textContent = 'Initial Array / Input Stream';
        if (this.newScratchpadBtn) this.newScratchpadBtn.textContent = '+ Blank Scratchpad';
        if (stackTitle) stackTitle.textContent = 'Virtual Call Stack & Scope';
      } else {
        this.modePointerBtn.classList.add('active');
        this.modeDsaBtn.classList.remove('active', 'dsa-active');
        this.editor.renderSnippets(POINTER_SNIPPETS);
        if (this.inputLabel) this.inputLabel.textContent = 'Initial Node Values';
        if (this.newScratchpadBtn) this.newScratchpadBtn.textContent = '+ Blank Scratchpad';
        if (stackTitle) stackTitle.textContent = 'Virtual Call Stack & Heap';
      }
    }

    if (this.drawer) {
      this.drawer.setMode(normalizedMode);
    }

    this.populatePresetDropdown(normalizedMode);

    if (this.modeBuffers && this.modeBuffers[normalizedMode]) {
      const saved = this.modeBuffers[normalizedMode];
      this.loadExample(saved.presetId, true);
      this.editor.setCode(saved.code);
      if (this.arrayInput) this.arrayInput.value = saved.arrayInput;
      this.rebuildAndRun();
      return;
    }

    // If current preset does not belong to the selected mode, switch to that mode's default preset
    const curPreset = EXAMPLES_CATALOG[this.currentPresetId];
    const curIsArrayStl = curPreset && (curPreset.structureType === 'dsa' || curPreset.category === 'Array Algorithms' || curPreset.category === 'C++ STL Containers' || curPreset.category === 'C++ STL Algorithms' || curPreset.category === 'DSA & Arrays');

    if (normalizedMode === 'array_stl' && !curIsArrayStl) {
      this.loadExample('dsa_scratchpad');
      return;
    } else if (normalizedMode === 'pointer' && curIsArrayStl) {
      this.loadExample('lc206');
      return;
    }

    if (triggerRender && this.timeline.length > 0) {
      this.renderStep(this.currentStep, false);
    }
    this.saveState();
  }

  loadExample(id, skipRun = false) {
    const ex = EXAMPLES_CATALOG[id] || EXAMPLES_CATALOG['scratchpad'];
    if (!ex) return;

    this.currentPresetId = id;
    this.structureType = ex.structureType;

    const isArrayStl = ex.structureType === 'dsa' ||
      ex.category === 'Array Algorithms' ||
      ex.category === 'C++ STL Containers' ||
      ex.category === 'C++ STL Algorithms' ||
      ex.category === 'DSA & Arrays';

    const targetMode = isArrayStl ? 'array_stl' : 'pointer';
    if (this.visualizerMode !== targetMode) {
      this.setMode(targetMode, false);
    }

    this.presetSelect.value = id;

    // Clear previous diagram elements to prevent overlap
    this.listRenderer.clear();
    this.treeRenderer.clear();
    this.dsaRenderer.clear();

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
      this.dsaRenderer.clear();
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
        if (this.currentPresetId !== 'scratchpad' && this.currentPresetId !== 'dsa_scratchpad' && this.visualizerMode !== 'array_stl') {
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
      const isTypingIncomplete =
        e.message.includes('Unexpected end of code') ||
        e.message.includes('Incomplete') ||
        e.message.includes("Unexpected token 'null'") ||
        (e.message.includes('Expected') && e.message.includes('EOF'));

      if (isTypingIncomplete) {
        this.editor.setStatus('Writing code...', 'pending');
        this.controls.updateExplanation('Writing C++ code... Continue typing to visualize.', false);
        return;
      }

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
      this.editor.setStatus('Writing code...', 'pending');
      this.controls.updateExplanation('Write a function (e.g. int main() { ... }) to begin visualizing.', false);
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

    // Auto-detect studio mode when in scratchpad
    const hasPointerStructures = code.includes('ListNode') || code.includes('TreeNode') || code.includes('->next') || code.includes('->left') || code.includes('->right');
    const hasContainerStructures = code.includes('vector') || code.includes('stack') || code.includes('queue') || code.includes('priority_queue') || code.includes('set<') || code.includes('map<') || (code.includes('string ') || code.includes('string>')) || /\[\s*\d*\s*\]/.test(code);

    if (hasContainerStructures && !hasPointerStructures && this.visualizerMode === 'pointer' && this.currentPresetId && this.currentPresetId.includes('scratchpad')) {
      this.setMode('array_stl', false);
    } else if (hasPointerStructures && !hasContainerStructures && this.visualizerMode === 'array_stl' && this.currentPresetId && this.currentPresetId.includes('scratchpad')) {
      this.setMode('pointer', false);
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
      let cinRaw = arrStr;
      if (cinRaw.startsWith('[') && cinRaw.endsWith(']')) {
        try {
          const parsed = JSON.parse(cinRaw);
          if (Array.isArray(parsed)) cinRaw = parsed.join(' ');
        } catch (_) {}
      }
      timeline = runProgram(fn, initial.args, ast.functions, cinRaw);
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
    this.renderStep(this.currentStep, false);

    // Persist state to localStorage
    this.saveState();
  }

  renderStep(idx, forceScroll = false) {
    if (!this.timeline || this.timeline.length === 0) return;
    const snap = this.timeline[idx];
    if (!snap) return;

    this.currentStep = idx;

    // Highlight editor active line
    const isErr = !!(snap.meta && snap.meta.error);
    this.editor.setActiveLine(snap.lineIndex, isErr, forceScroll);

    // Update memory inspector (stack & heap or container status)
    this.memory.update(snap.frames, snap.heap, snap.meta, this.visualizerMode);

    // Update explanation banner
    this.controls.updateExplanation(snap.explanation, isErr, snap.meta || {});

    // Show warning banner for serious memory violations
    if (snap.meta && snap.meta.error) {
      this.showWarning(snap.explanation);
    } else {
      this.showWarning('');
    }

    // Inspect whether snapshot has heap nodes and/or containers
    const hasHeapNodes = Object.keys(snap.heap || {}).length > 0;
    const hasTreeNodes = Object.values(snap.heap || {}).some(n => n.structType === 'TreeNode');

    let hasContainers = false;
    if (snap.frames && snap.frames.length > 0) {
      for (const f of snap.frames) {
        if (!f.vars) continue;
        for (const info of Object.values(f.vars)) {
          const val = info.value;
          if (
            (val && (val.isStack || val.isQueue || val.isPriorityQueue || val.isSet || val.isMap || val.isPair)) ||
            info.kind === 'array' || Array.isArray(val) ||
            info.kind === 'string' || (typeof val === 'string' && val.length > 0 && !info.isCinStream)
          ) {
            hasContainers = true;
            break;
          }
        }
        if (hasContainers) break;
      }
    }

    // Render Canvas with seamless dual-studio fallback so right-side canvas NEVER goes blank
    if (this.visualizerMode === 'array_stl' || this.visualizerMode === 'dsa') {
      if (hasContainers || !hasHeapNodes) {
        this.listRenderer.clear();
        this.treeRenderer.clear();
        this.dsaRenderer.render(snap.frames, snap.heap, snap.meta || {});
      } else {
        // Fallback: Pointer nodes present in Containers Studio
        this.dsaRenderer.clear();
        if (hasTreeNodes || this.structureType === 'tree') {
          this.listRenderer.clear();
          this.treeRenderer.render(snap.heap, snap.frames, snap.meta || {});
        } else {
          this.treeRenderer.clear();
          this.listRenderer.render(snap.heap, snap.frames, snap.meta || {});
        }
      }
    } else {
      // Pointer Studio
      if (hasHeapNodes) {
        this.dsaRenderer.clear();
        if (hasTreeNodes || this.structureType === 'tree') {
          this.listRenderer.clear();
          this.treeRenderer.render(snap.heap, snap.frames, snap.meta || {});
        } else {
          this.treeRenderer.clear();
          this.listRenderer.render(snap.heap, snap.frames, snap.meta || {});
        }
      } else if (hasContainers) {
        // Fallback: Containers/Arrays present in Pointer Studio (e.g. stack<char>, vector<int>)
        this.listRenderer.clear();
        this.treeRenderer.clear();
        this.dsaRenderer.render(snap.frames, snap.heap, snap.meta || {});
      } else {
        // Default: render list / null anchor
        this.dsaRenderer.clear();
        if (this.structureType === 'tree') {
          this.listRenderer.clear();
          this.treeRenderer.render(snap.heap, snap.frames, snap.meta || {});
        } else {
          this.treeRenderer.clear();
          this.listRenderer.render(snap.heap, snap.frames, snap.meta || {});
        }
      }
    }
  }

  showToast(msg) {
    if (!this.toastEl || !this.toastMsg) return;
    this.toastMsg.textContent = msg;
    this.toastEl.classList.add('show');
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, 3000);
  }

  shareVisualization() {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('mode', this.visualizerMode);
      url.searchParams.set('preset', this.currentPresetId);
      url.searchParams.set('code', encodeURIComponent(this.editor.getCode()));
      if (this.arrayInput && this.arrayInput.value) {
        url.searchParams.set('input', encodeURIComponent(this.arrayInput.value));
      }
      
      const shareUrl = url.toString();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          this.showToast('Shareable link copied to clipboard!');
        }).catch(() => {
          this.fallbackCopy(shareUrl);
        });
      } else {
        this.fallbackCopy(shareUrl);
      }
    } catch (e) {
      this.showToast('Could not copy link');
    }
  }

  fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      this.showToast('Shareable link copied to clipboard!');
    } catch (err) {
      prompt('Copy this shareable link:', text);
    }
    document.body.removeChild(ta);
  }

  exportSvg() {
    const svg = document.getElementById('canvas');
    if (!svg) return;

    try {
      const clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

      // Add a dark background rect for clean standalone display
      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('width', '100%');
      bgRect.setAttribute('height', '100%');
      bgRect.setAttribute('fill', '#0b0f19');
      clone.insertBefore(bgRect, clone.firstChild);

      // Embed style block for standalone rendering
      const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      styleEl.textContent = `
        text { font-family: 'JetBrains Mono', monospace, -apple-system, sans-serif; }
        .list-node .val-cell { fill: #1e2433; stroke: #475569; stroke-width: 1.5; }
        .list-node .ptr-cell { fill: #161a26; stroke: #475569; stroke-width: 1.5; }
        .list-node .val-text { fill: #f8fafc; font-weight: 700; font-size: 15px; }
        .edge-path { stroke: #64748b; stroke-width: 2; fill: none; }
        .dsa-box { fill: #161a26; stroke: #334155; stroke-width: 1.5; }
        .dsa-val { fill: #f8fafc; font-weight: 700; font-size: 14px; }
        .dsa-title { fill: #94a3b8; font-weight: 700; font-size: 13px; }
      `;
      clone.insertBefore(styleEl, clone.firstChild);

      const serializer = new XMLSerializer();
      const svgStr = '<?xml version="1.0" encoding="utf-8"?>\n' + serializer.serializeToString(clone);
      const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `ptrviz_${this.currentPresetId}_${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);

      this.showToast('SVG diagram exported successfully!');
    } catch (e) {
      this.showToast('Export failed: ' + e.message);
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
        arrayInput: this.arrayInput.value,
        visualizerMode: this.visualizerMode
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
