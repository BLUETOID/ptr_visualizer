/**
 * Array & STL Containers SVG Renderer
 * Renders contiguous array boxes, vectors, stacks, queues, pairs, index pointers, variable watch cards, and swap animations.
 */

import { colorForVar } from './listRenderer.js';

const SVGNS = 'http://www.w3.org/2000/svg';

function svgEl(tag, parent, attrs = {}) {
  const el = document.createElementNS(SVGNS, tag);
  Object.entries(attrs).forEach(([k, v]) => {
    el.setAttribute(k, v);
  });
  if (parent) parent.appendChild(el);
  return el;
}

export function isIndexPointerName(name) {
  const nonIndex = /^(sum|total|max|min|maxSoFar|currentMax|curMax|minSoFar|val|value|ans|count|cnt|diff|res|result|target|n|m|size|capacity|len|length|num|temp|tmp)$/i;
  if (nonIndex.test(name)) return false;
  const common = /^(i|j|k|l|r|p|q|u|v|idx|index|ptr|left|right|low|high|mid|start|end|slow|fast|curr|pos|head|tail|front|rear|prev|next|src|dst|top|bottom)(\d|_.*)?$/i;
  const suffix = /(index|idx|ptr|pos|pointer)$/i;
  return common.test(name) || suffix.test(name);
}

export class DsaRenderer {
  constructor(viewport) {
    this.viewport = viewport;
    this.container = svgEl('g', this.viewport, { id: 'dsaGroup', class: 'dsa-layer' });
  }

  clear() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  render(frames, heap, meta = {}) {
    this.clear();

    if (!frames || frames.length === 0) {
      this.renderEmptyNotice('No active call frames');
      return;
    }

    // Inspect active stack frame (top frame)
    const activeFrame = frames[frames.length - 1];
    const allVars = { ...activeFrame.vars };

    // Categorize variables: arrays vs stl containers vs pointers vs scalars
    const arrays = [];
    const stacks = [];
    const queues = [];
    const priorityQueues = [];
    const sets = [];
    const maps = [];
    const strings = [];
    const pairs = [];
    const scalarPointers = [];
    const otherScalars = [];

    Object.entries(allVars).forEach(([name, info]) => {
      const val = info.value;
      if (val && val.isPriorityQueue) {
        priorityQueues.push({ name, value: val.elements, isMinHeap: val.isMinHeap });
      } else if (val && val.isSet) {
        sets.push({ name, value: val.elements });
      } else if (val && val.isMap) {
        maps.push({ name, value: val.entries });
      } else if (val && val.isStack) {
        stacks.push({ name, value: val.elements });
      } else if (val && val.isQueue) {
        queues.push({ name, value: val.elements });
      } else if (val && val.isPair) {
        pairs.push({ name, value: val });
      } else if (info.kind === 'string' || (typeof val === 'string' && val.length > 0 && !info.isCinStream)) {
        strings.push({ name, value: val });
      } else if (info.kind === 'array' || Array.isArray(val)) {
        arrays.push({ name, value: Array.isArray(val) ? val : [] });
      } else if (typeof val === 'number' && Number.isInteger(val)) {
        if (isIndexPointerName(name) && val >= 0) {
          scalarPointers.push({ name, value: val, color: colorForVar(name) });
        } else {
          otherScalars.push({ name, value: val, kind: 'scalar' });
        }
      } else if (info.kind === 'scalar' || typeof val === 'boolean' || typeof val === 'number') {
        otherScalars.push({ name, value: val, kind: info.kind || 'scalar' });
      }
    });

    // If no explicit container was found in active frame, check outer frames
    if (arrays.length === 0 && strings.length === 0 && stacks.length === 0 && queues.length === 0 && priorityQueues.length === 0 && sets.length === 0 && maps.length === 0 && pairs.length === 0) {
      for (let i = frames.length - 2; i >= 0; i--) {
        Object.entries(frames[i].vars).forEach(([name, info]) => {
          const val = info.value;
          if (val && val.isPriorityQueue && !priorityQueues.find(pq => pq.name === name)) {
            priorityQueues.push({ name, value: val.elements, isMinHeap: val.isMinHeap });
          } else if (val && val.isSet && !sets.find(s => s.name === name)) {
            sets.push({ name, value: val.elements });
          } else if (val && val.isMap && !maps.find(m => m.name === name)) {
            maps.push({ name, value: val.entries });
          } else if (val && val.isStack && !stacks.find(s => s.name === name)) {
            stacks.push({ name, value: val.elements });
          } else if (val && val.isQueue && !queues.find(q => q.name === name)) {
            queues.push({ name, value: val.elements });
          } else if (val && val.isPair && !pairs.find(p => p.name === name)) {
            pairs.push({ name, value: val });
          } else if (typeof val === 'string' && !strings.find(s => s.name === name)) {
            strings.push({ name, value: val });
          } else if ((info.kind === 'array' || Array.isArray(val)) && !arrays.find(a => a.name === name)) {
            arrays.push({ name, value: Array.isArray(val) ? val : [] });
          }
        });
        if (arrays.length > 0 || strings.length > 0 || stacks.length > 0 || queues.length > 0 || priorityQueues.length > 0) break;
      }
    }

    const hasContainers = arrays.length > 0 || strings.length > 0 || stacks.length > 0 || queues.length > 0 || priorityQueues.length > 0 || sets.length > 0 || maps.length > 0 || pairs.length > 0;

    // If still no containers, show a clean placeholder
    if (!hasContainers) {
      this.renderEmptyNotice('No Array or STL Container in Scope', 'Declare an array, vector, string, stack, queue, or map to visualize.');
      this.renderVariableHud(otherScalars.concat(scalarPointers), [], 40, 100);
      return;
    }

    let curY = 30;

    // 1. Render Variable Watch HUD at the top
    if (otherScalars.length > 0 || pairs.length > 0) {
      curY = this.renderVariableHud(otherScalars, pairs, 40, curY);
      curY += 24;
    }

    // 2. Render Priority Queues (Heaps)
    priorityQueues.forEach((pq) => {
      curY = this.renderPriorityQueue(pq, meta, 40, curY);
      curY += 50;
    });

    // 3. Render Sets
    sets.forEach((st) => {
      curY = this.renderSet(st, meta, 40, curY);
      curY += 50;
    });

    // 4. Render Maps
    maps.forEach((mp) => {
      curY = this.renderMap(mp, meta, 40, curY);
      curY += 50;
    });

    // 5. Render STL Stacks
    stacks.forEach((st) => {
      curY = this.renderStack(st, meta, 40, curY);
      curY += 50;
    });

    // 6. Render STL Queues
    queues.forEach((q) => {
      curY = this.renderQueue(q, meta, 40, curY);
      curY += 50;
    });

    // 7. Render Strings
    strings.forEach((strObj) => {
      curY = this.renderString(strObj, scalarPointers, meta, 40, curY);
      curY += 50;
    });

    // 8. Render Arrays, Matrices, and Graph Adjacency Lists
    arrays.forEach((arrObj) => {
      const is2D = arrObj.value.length > 0 && Array.isArray(arrObj.value[0]);
      const isAdjList = is2D && (
        arrObj.name.toLowerCase().includes('adj') ||
        arrObj.name.toLowerCase().includes('graph') ||
        arrObj.value.some((r, idx) => Array.isArray(r) && r.length !== arrObj.value[0]?.length)
      );

      if (isAdjList) {
        curY = this.renderAdjacencyList(arrObj, scalarPointers, meta, 40, curY);
      } else if (is2D) {
        curY = this.render2DMatrix(arrObj, scalarPointers, meta, 40, curY);
      } else {
        curY = this.render1DArray(arrObj, scalarPointers, meta, 40, curY);
      }
      curY += 60;
    });
  }

  renderEmptyNotice(title, subtitle = '') {
    const textGroup = svgEl('g', this.container, { transform: 'translate(400, 180)' });
    
    // Clean SVG icon badge (zero emojis)
    svgEl('circle', textGroup, {
      cx: 0,
      cy: -30,
      r: 28,
      fill: 'rgba(56, 189, 248, 0.08)',
      stroke: 'rgba(56, 189, 248, 0.25)',
      'stroke-width': 1.5
    });

    const iconGroup = svgEl('g', textGroup, { transform: 'translate(-11, -41)' });
    svgEl('rect', iconGroup, { x: 0, y: 0, width: 9, height: 9, rx: 2, fill: '#38bdf8' });
    svgEl('rect', iconGroup, { x: 13, y: 0, width: 9, height: 9, rx: 2, fill: '#38bdf8' });
    svgEl('rect', iconGroup, { x: 0, y: 13, width: 9, height: 9, rx: 2, fill: '#38bdf8' });
    svgEl('rect', iconGroup, { x: 13, y: 13, width: 9, height: 9, rx: 2, fill: '#38bdf8' });

    const t1 = svgEl('text', textGroup, {
      class: 'dsa-empty-text',
      x: 0,
      y: 20
    });
    t1.textContent = title;

    if (subtitle) {
      const t2 = svgEl('text', textGroup, {
        class: 'dsa-empty-subtext',
        x: 0,
        y: 46
      });
      t2.textContent = subtitle;
    }
  }

  renderVariableHud(variables = [], pairs = [], startX = 40, startY = 30) {
    const varList = Array.isArray(variables) ? variables : [];
    const pairList = Array.isArray(pairs) ? pairs : [];
    const totalItems = varList.length + pairList.length;
    if (totalItems === 0) return startY;

    const hudGroup = svgEl('g', this.container, {
      class: 'dsa-hud-group',
      transform: `translate(${startX}, ${startY})`
    });

    const label = svgEl('text', hudGroup, {
      x: 0,
      y: 12,
      fill: '#64748b',
      'font-family': 'var(--font-mono)',
      'font-size': 11,
      'font-weight': 700,
      'letter-spacing': '0.05em'
    });
    label.textContent = 'VARIABLES & STATE:';

    let cardX = 0;
    const cardY = 24;
    const cardH = 38;

    // Render scalar variables
    if (varList.length > 0) {
      varList.forEach(v => {
        const valStr = typeof v.value === 'string' && v.value.length === 1 ? `'${v.value}'` : (typeof v.value === 'string' ? `"${v.value}"` : String(v.value));
        const textLen = Math.max(v.name.length, valStr.length);
        const cardW = Math.max(100, textLen * 9 + 48);

        const card = svgEl('g', hudGroup, {
          transform: `translate(${cardX}, ${cardY})`
        });

        // Background
        svgEl('rect', card, {
          class: 'dsa-hud-card',
          width: cardW,
          height: cardH,
          rx: 6,
          ry: 6
        });

        // Dot color indicator
        const dotColor = colorForVar(v.name);
        svgEl('circle', card, {
          cx: 14,
          cy: cardH / 2,
          r: 4.5,
          fill: dotColor
        });

        // Var name
        const nameEl = svgEl('text', card, {
          class: 'dsa-hud-name',
          x: 25,
          y: cardH / 2 - 1
        });
        nameEl.textContent = `${v.name}:`;

        // Var val
        const valEl = svgEl('text', card, {
          class: 'dsa-hud-val',
          x: cardW - 12,
          y: cardH / 2,
          'text-anchor': 'end'
        });
        valEl.textContent = valStr;

        cardX += cardW + 10;
      });
    }

    // Render pairs
    if (pairList.length > 0) {
      pairList.forEach(p => {
        const cardW = 160;
        const card = svgEl('g', hudGroup, {
          transform: `translate(${cardX}, ${cardY})`
        });

        svgEl('rect', card, {
          class: 'dsa-hud-card',
          width: cardW,
          height: cardH,
          rx: 6,
          ry: 6
        });

        const dotColor = colorForVar(p.name);
        svgEl('circle', card, {
          cx: 14,
          cy: cardH / 2,
          r: 4.5,
          fill: dotColor
        });

        const nameEl = svgEl('text', card, {
          class: 'dsa-hud-name',
          x: 25,
          y: cardH / 2 - 1
        });
        nameEl.textContent = `${p.name}:`;

        const valEl = svgEl('text', card, {
          class: 'dsa-hud-val',
          x: cardW - 12,
          y: cardH / 2,
          'text-anchor': 'end'
        });
        valEl.textContent = `(${p.value.first}, ${p.value.second})`;

        cardX += cardW + 10;
      });
    }

    return startY + cardY + cardH;
  }

  render1DArray(arrObj, allPointers, meta, startX, startY) {
    const arr = arrObj.value;
    const arrName = arrObj.name;
    const len = arr.length;

    const cellW = 68;
    const cellH = 58;
    const gap = 8;

    // Group pointers by index
    const topPointers = {};
    allPointers.forEach(p => {
      const idx = p.value;
      if (idx >= 0 && idx < len) {
        if (!topPointers[idx]) topPointers[idx] = [];
        topPointers[idx].push(p);
      }
    });

    let maxTopStack = 0;
    Object.values(topPointers).forEach(list => {
      if (list.length > maxTopStack) maxTopStack = list.length;
    });
    const arrayY = startY + Math.max(65, 25 + maxTopStack * 28); // Room for vertically stacked pointer badges

    const arrGroup = svgEl('g', this.container, {
      class: 'dsa-array-wrap',
      transform: `translate(${startX}, 0)`
    });

    // Array Header
    const headerGroup = svgEl('g', arrGroup, { transform: `translate(0, ${startY + 15})` });
    const titleText = svgEl('text', headerGroup, { class: 'dsa-array-title', x: 0, y: 0 });
    titleText.textContent = `${arrName}[]`;

    const sizeText = svgEl('text', headerGroup, { class: 'dsa-array-size', x: titleText.textContent.length * 9 + 15, y: 0 });
    sizeText.textContent = `(size: ${len})`;

    // Check dsaAccess metadata
    const access = meta && meta.dsaAccess;
    const isThisArray = access && (access.arrayName === arrName || !access.arrayName);

    // Render Cells
    for (let c = 0; c < len; c++) {
      const cellX = c * (cellW + gap);
      const cellVal = arr[c];

      let cellClass = 'dsa-cell';
      if (isThisArray) {
        if (access.type === 'swap' && access.indices && access.indices.includes(c)) {
          cellClass += ' dsa-access-swap';
        } else if (access.type === 'sort' && access.indices && c >= access.indices[0] && c <= access.indices[1]) {
          cellClass += ' dsa-access-swap';
        } else if (access.type === 'reverse' && access.indices && c >= access.indices[0] && c <= access.indices[1]) {
          cellClass += ' dsa-access-swap';
        } else if ((access.type === 'write' || access.type === 'push') && access.index === c) {
          cellClass += ' dsa-access-write';
        } else if (access.type === 'read' && access.index === c) {
          cellClass += ' dsa-access-read';
        }
      }

      const cellGroup = svgEl('g', arrGroup, {
        class: cellClass,
        transform: `translate(${cellX}, ${arrayY})`
      });

      // Cell Rect Box
      svgEl('rect', cellGroup, {
        class: 'dsa-cell-box',
        width: cellW,
        height: cellH,
        rx: 8,
        ry: 8
      });

      // Cell Value Text or Boolean Indicator
      if (typeof cellVal === 'boolean') {
        svgEl('rect', cellGroup, {
          x: 10,
          y: (cellH - 26) / 2,
          width: cellW - 20,
          height: 26,
          rx: 6,
          ry: 6,
          fill: cellVal ? 'rgba(16, 185, 129, 0.25)' : 'rgba(100, 116, 139, 0.2)',
          stroke: cellVal ? '#10b981' : '#64748b',
          'stroke-width': 1.5
        });
        const valText = svgEl('text', cellGroup, {
          class: 'dsa-cell-val',
          x: cellW / 2,
          y: cellH / 2,
          fill: cellVal ? '#34d399' : '#94a3b8',
          'font-size': 12,
          'font-weight': 700
        });
        valText.textContent = cellVal ? 'TRUE' : 'FALSE';
      } else {
        const valText = svgEl('text', cellGroup, {
          class: 'dsa-cell-val',
          x: cellW / 2,
          y: cellH / 2
        });
        valText.textContent = typeof cellVal === 'string' && cellVal.length === 1 ? `'${cellVal}'` : (cellVal !== undefined ? cellVal : '');
      }

      // Index Pill Badge (Below cell)
      const indexPillY = cellH + 8;
      const indexPillW = 34;
      const indexPillH = 18;
      const indexPillX = (cellW - indexPillW) / 2;

      svgEl('rect', cellGroup, {
        class: 'dsa-cell-index-box',
        x: indexPillX,
        y: indexPillY,
        width: indexPillW,
        height: indexPillH
      });

      const idxText = svgEl('text', cellGroup, {
        class: 'dsa-cell-index-text',
        x: cellW / 2,
        y: indexPillY + indexPillH / 2
      });
      idxText.textContent = `[${c}]`;

      // Render Top Pointers if present
      if (topPointers[c]) {
        this.renderMultiPointerMarker(arrGroup, topPointers[c], cellX + cellW / 2, arrayY);
      }
    }

    // Render Swap Arc if applicable
    if (isThisArray && access.type === 'swap' && access.indices && access.indices.length >= 2) {
      const idx1 = access.indices[0];
      const idx2 = access.indices[1];
      if (idx1 >= 0 && idx1 < len && idx2 >= 0 && idx2 < len) {
        this.renderSwapArc(arrGroup, idx1, idx2, cellW, gap, arrayY);
      }
    }

    return arrayY + cellH + 50;
  }

  renderPointerMarker(parent, ptr, centerX, targetY, position = 'top') {
    const ptrGroup = svgEl('g', parent, {
      class: 'dsa-pointer-group'
    });

    const badgeW = Math.max(54, ptr.name.length * 8 + 26);
    const badgeH = 24;
    const color = ptr.color || '#38bdf8';

    if (position === 'top') {
      const arrowTipY = targetY - 4;
      const badgeY = arrowTipY - 26;
      const badgeX = centerX - badgeW / 2;

      svgEl('polygon', ptrGroup, {
        class: 'dsa-pointer-arrow',
        points: `${centerX},${arrowTipY} ${centerX - 6},${arrowTipY - 8} ${centerX + 6},${arrowTipY - 8}`,
        fill: color
      });

      svgEl('rect', ptrGroup, {
        class: 'dsa-pointer-badge',
        x: badgeX,
        y: badgeY,
        width: badgeW,
        height: badgeH,
        fill: '#121622',
        stroke: color,
        'stroke-width': 1.5
      });

      const text = svgEl('text', ptrGroup, {
        class: 'dsa-pointer-text',
        x: centerX,
        y: badgeY + badgeH / 2,
        fill: color
      });
      text.textContent = `${ptr.name}=${ptr.value}`;
    } else {
      const arrowTipY = targetY + 4;
      const badgeY = arrowTipY + 8;
      const badgeX = centerX - badgeW / 2;

      svgEl('polygon', ptrGroup, {
        class: 'dsa-pointer-arrow',
        points: `${centerX},${arrowTipY} ${centerX - 6},${arrowTipY + 8} ${centerX + 6},${arrowTipY + 8}`,
        fill: color
      });

      svgEl('rect', ptrGroup, {
        class: 'dsa-pointer-badge',
        x: badgeX,
        y: badgeY,
        width: badgeW,
        height: badgeH,
        fill: '#121622',
        stroke: color,
        'stroke-width': 1.5
      });

      const text = svgEl('text', ptrGroup, {
        class: 'dsa-pointer-text',
        x: centerX,
        y: badgeY + badgeH / 2,
        fill: color
      });
      text.textContent = `${ptr.name}=${ptr.value}`;
    }
  }

  renderSwapArc(parent, idx1, idx2, cellW, gap, arrayY) {
    const x1 = idx1 * (cellW + gap) + cellW / 2;
    const x2 = idx2 * (cellW + gap) + cellW / 2;
    const midX = (x1 + x2) / 2;
    const dist = Math.abs(x2 - x1);
    const arcHeight = Math.min(65, Math.max(30, dist * 0.35));
    const arcY = arrayY - 12;

    const pathData = `M ${x1} ${arcY} Q ${midX} ${arcY - arcHeight} ${x2} ${arcY}`;

    svgEl('path', parent, {
      d: pathData,
      class: 'dsa-swap-arc'
    });

    const labelW = 46;
    const labelH = 18;
    const labelX = midX - labelW / 2;
    const labelY = arcY - arcHeight * 0.7 - labelH / 2;

    svgEl('rect', parent, {
      x: labelX,
      y: labelY,
      width: labelW,
      height: labelH,
      class: 'dsa-swap-label-box'
    });

    const labelText = svgEl('text', parent, {
      x: midX,
      y: labelY + labelH / 2,
      class: 'dsa-swap-label-text'
    });
    labelText.textContent = 'SWAP';
  }

  renderStack(stObj, meta, startX, startY) {
    const elements = stObj.value;
    const name = stObj.name;
    const count = elements.length;
    const cellW = 80;
    const cellH = 34;

    const stackGroup = svgEl('g', this.container, {
      class: 'stl-stack-wrap',
      transform: `translate(${startX}, ${startY})`
    });

    // Title
    const title = svgEl('text', stackGroup, { class: 'dsa-array-title', x: 0, y: 15 });
    title.textContent = `std::stack ${name}`;

    const sizeText = svgEl('text', stackGroup, { class: 'dsa-array-size', x: title.textContent.length * 9 + 15, y: 15 });
    sizeText.textContent = `(size: ${count})`;

    const startElementsY = 35;
    const totalH = Math.max(1, count) * cellH;

    // Stack container U-shape outline
    svgEl('rect', stackGroup, {
      x: 0,
      y: startElementsY,
      width: cellW,
      height: totalH,
      fill: 'rgba(255, 255, 255, 0.02)',
      stroke: '#475569',
      'stroke-width': 1.5,
      rx: 6,
      ry: 6
    });

    // Render items from top to bottom (LIFO: elements[count - 1] is top)
    for (let i = 0; i < count; i++) {
      const elemIdx = count - 1 - i;
      const val = elements[elemIdx];
      const y = startElementsY + i * cellH;

      const cell = svgEl('g', stackGroup, {
        class: 'dsa-cell',
        transform: `translate(0, ${y})`
      });

      svgEl('rect', cell, {
        class: 'dsa-cell-box',
        width: cellW,
        height: cellH,
        rx: 4,
        ry: 4
      });

      const txt = svgEl('text', cell, {
        class: 'dsa-cell-val',
        x: cellW / 2,
        y: cellH / 2,
        'font-size': 14
      });
      txt.textContent = typeof val === 'string' && val.length === 1 ? `'${val}'` : (val !== undefined ? val : '');

      // If top element, mark with TOP badge
      if (i === 0) {
        const topMarker = svgEl('g', stackGroup, { transform: `translate(${cellW + 10}, ${startElementsY + cellH / 2})` });
        svgEl('polygon', topMarker, {
          points: '0,0 8,-4 8,4',
          fill: '#38bdf8'
        });
        const topTxt = svgEl('text', topMarker, {
          class: 'dsa-pointer-text',
          x: 14,
          y: 0,
          fill: '#38bdf8',
          'dominant-baseline': 'central'
        });
        topTxt.textContent = 'TOP';
      }
    }

    return startY + startElementsY + totalH + 20;
  }

  renderQueue(qObj, meta, startX, startY) {
    const elements = qObj.value;
    const name = qObj.name;
    const count = elements.length;
    const cellW = 58;
    const cellH = 46;
    const gap = 6;

    const queueGroup = svgEl('g', this.container, {
      class: 'stl-queue-wrap',
      transform: `translate(${startX}, ${startY})`
    });

    const title = svgEl('text', queueGroup, { class: 'dsa-array-title', x: 0, y: 15 });
    title.textContent = `std::queue ${name}`;

    const sizeText = svgEl('text', queueGroup, { class: 'dsa-array-size', x: title.textContent.length * 9 + 15, y: 15 });
    sizeText.textContent = `(size: ${count})`;

    const queueY = 35;

    // Front marker
    if (count > 0) {
      const frontTxt = svgEl('text', queueGroup, {
        class: 'dsa-cell-index-text',
        x: 20,
        y: queueY - 10,
        fill: '#34d399'
      });
      frontTxt.textContent = 'FRONT';
    }

    for (let i = 0; i < count; i++) {
      const cellX = i * (cellW + gap);
      const val = elements[i];

      const cell = svgEl('g', queueGroup, {
        class: 'dsa-cell',
        transform: `translate(${cellX}, ${queueY})`
      });

      svgEl('rect', cell, {
        class: 'dsa-cell-box',
        width: cellW,
        height: cellH,
        rx: 6,
        ry: 6
      });

      const txt = svgEl('text', cell, {
        class: 'dsa-cell-val',
        x: cellW / 2,
        y: cellH / 2,
        'font-size': 15
      });
      txt.textContent = typeof val === 'string' && val.length === 1 ? `'${val}'` : (val !== undefined ? val : '');
    }

    // Back marker
    if (count > 0) {
      const backX = (count - 1) * (cellW + gap) + cellW / 2;
      const backTxt = svgEl('text', queueGroup, {
        class: 'dsa-cell-index-text',
        x: backX,
        y: queueY - 10,
        fill: '#fbbf24'
      });
      backTxt.textContent = 'BACK';
    }

    return startY + queueY + cellH + 30;
  }

  render2DMatrix(arrObj, allPointers, meta, startX, startY) {
    const matrix = arrObj.value;
    const rows = matrix.length;
    const cols = rows > 0 && Array.isArray(matrix[0]) ? matrix[0].length : 0;
    const cellW = 54;
    const cellH = 46;
    const gap = 6;

    const matrixGroup = svgEl('g', this.container, {
      class: 'dsa-matrix-wrap',
      transform: `translate(${startX}, ${startY})`
    });

    const title = svgEl('text', matrixGroup, { class: 'dsa-array-title', x: 0, y: 15 });
    title.textContent = `${arrObj.name}[${rows}][${cols}]`;

    const startGridY = 40;

    for (let j = 0; j < cols; j++) {
      const colX = 36 + j * (cellW + gap) + cellW / 2;
      const colLabel = svgEl('text', matrixGroup, {
        class: 'dsa-cell-index-text',
        x: colX,
        y: startGridY - 10
      });
      colLabel.textContent = `c${j}`;
    }

    for (let i = 0; i < rows; i++) {
      const rowY = startGridY + i * (cellH + gap);

      const rowLabel = svgEl('text', matrixGroup, {
        class: 'dsa-cell-index-text',
        x: 15,
        y: rowY + cellH / 2
      });
      rowLabel.textContent = `r${i}`;

      for (let j = 0; j < cols; j++) {
        const colX = 36 + j * (cellW + gap);
        const cellVal = matrix[i][j];

        const cellGroup = svgEl('g', matrixGroup, {
          class: 'dsa-cell',
          transform: `translate(${colX}, ${rowY})`
        });

        svgEl('rect', cellGroup, {
          class: 'dsa-cell-box',
          width: cellW,
          height: cellH,
          rx: 6,
          ry: 6
        });

        const valText = svgEl('text', cellGroup, {
          class: 'dsa-cell-val',
          x: cellW / 2,
          y: cellH / 2,
          'font-size': 15
        });
        valText.textContent = cellVal !== undefined ? cellVal : '';
      }
    }

    return startY + startGridY + rows * (cellH + gap) + 30;
  }

  renderString(strObj, allPointers, meta, startX, startY) {
    const str = strObj.value || '';
    const strName = strObj.name;
    const len = str.length;

    const cellW = 54;
    const cellH = 52;
    const gap = 6;

    const topPointers = {};
    allPointers.forEach(p => {
      const idx = p.value;
      if (idx >= 0 && idx < len) {
        if (!topPointers[idx]) topPointers[idx] = [];
        topPointers[idx].push(p);
      }
    });

    let maxTopStack = 0;
    Object.values(topPointers).forEach(list => {
      if (list.length > maxTopStack) maxTopStack = list.length;
    });
    const arrayY = startY + Math.max(65, 25 + maxTopStack * 28);

    const strGroup = svgEl('g', this.container, {
      class: 'dsa-string-wrap',
      transform: `translate(${startX}, 0)`
    });

    const headerGroup = svgEl('g', strGroup, { transform: `translate(0, ${startY + 15})` });
    const titleText = svgEl('text', headerGroup, { class: 'dsa-array-title', x: 0, y: 0 });
    titleText.textContent = `std::string ${strName} = "${str}"`;

    const sizeText = svgEl('text', headerGroup, { class: 'dsa-array-size', x: titleText.textContent.length * 8.5 + 20, y: 0 });
    sizeText.textContent = `(len: ${len})`;

    const access = meta && meta.dsaAccess;
    const isThisString = access && (access.arrayName === strName || !access.arrayName);

    for (let c = 0; c < len; c++) {
      const cellX = c * (cellW + gap);
      const ch = str[c];

      let cellClass = 'dsa-cell';
      if (isThisString) {
        if ((access.type === 'write' || access.type === 'push') && access.index === c) {
          cellClass += ' dsa-access-write';
        } else if (access.type === 'read' && access.index === c) {
          cellClass += ' dsa-access-read';
        }
      }

      const cellGroup = svgEl('g', strGroup, {
        class: cellClass,
        transform: `translate(${cellX}, ${arrayY})`
      });

      svgEl('rect', cellGroup, {
        class: 'dsa-cell-box',
        width: cellW,
        height: cellH,
        rx: 8,
        ry: 8
      });

      const valText = svgEl('text', cellGroup, {
        class: 'dsa-cell-val',
        x: cellW / 2,
        y: cellH / 2 - 2,
        'font-family': 'var(--font-mono)',
        'font-size': 18,
        'font-weight': 700,
        fill: '#38bdf8'
      });
      valText.textContent = `'${ch}'`;

      const indexPillY = cellH + 6;
      const indexPillW = 30;
      const indexPillH = 16;
      const indexPillX = (cellW - indexPillW) / 2;

      svgEl('rect', cellGroup, {
        class: 'dsa-cell-index-box',
        x: indexPillX,
        y: indexPillY,
        width: indexPillW,
        height: indexPillH
      });

      const idxText = svgEl('text', cellGroup, {
        class: 'dsa-cell-index-text',
        x: cellW / 2,
        y: indexPillY + indexPillH / 2,
        'font-size': 10
      });
      idxText.textContent = `[${c}]`;

      if (topPointers[c]) {
        this.renderMultiPointerMarker(strGroup, topPointers[c], cellX + cellW / 2, arrayY);
      }
    }

    return arrayY + cellH + 45;
  }

  renderPriorityQueue(pqObj, meta, startX, startY) {
    const elements = pqObj.value || [];
    const name = pqObj.name;
    const isMin = pqObj.isMinHeap;
    const count = elements.length;
    const cellW = 60;
    const cellH = 46;
    const gap = 8;

    const pqGroup = svgEl('g', this.container, {
      class: 'stl-pq-wrap',
      transform: `translate(${startX}, ${startY})`
    });

    const title = svgEl('text', pqGroup, { class: 'dsa-array-title', x: 0, y: 15 });
    title.textContent = `std::priority_queue ${isMin ? '<min-heap>' : '<max-heap>'} ${name}`;

    const sizeText = svgEl('text', pqGroup, { class: 'dsa-array-size', x: title.textContent.length * 8.5 + 20, y: 15 });
    sizeText.textContent = `(size: ${count}${count > 0 ? `, top: ${elements[0]}` : ''})`;

    const heapY = 40;

    for (let i = 0; i < count; i++) {
      const cellX = i * (cellW + gap);
      const val = elements[i];
      const isTop = (i === 0);

      const cell = svgEl('g', pqGroup, {
        class: `dsa-cell ${isTop ? 'dsa-access-swap' : ''}`,
        transform: `translate(${cellX}, ${heapY})`
      });

      svgEl('rect', cell, {
        class: 'dsa-cell-box',
        width: cellW,
        height: cellH,
        rx: 6,
        ry: 6,
        stroke: isTop ? '#f59e0b' : '#475569',
        fill: isTop ? 'rgba(245, 158, 11, 0.12)' : 'rgba(18, 22, 34, 0.9)'
      });

      const txt = svgEl('text', cell, {
        class: 'dsa-cell-val',
        x: cellW / 2,
        y: cellH / 2,
        fill: isTop ? '#fbbf24' : '#e2e8f0',
        'font-weight': isTop ? 700 : 500
      });
      txt.textContent = val !== undefined ? val : '';

      if (isTop) {
        const topLabel = svgEl('text', pqGroup, {
          class: 'dsa-cell-index-text',
          x: cellX + cellW / 2,
          y: heapY - 8,
          fill: '#f59e0b',
          'font-weight': 700
        });
        topLabel.textContent = 'TOP';
      }
    }

    return startY + heapY + cellH + 30;
  }

  renderSet(setObj, meta, startX, startY) {
    const elements = setObj.value || [];
    const name = setObj.name;
    const count = elements.length;
    const cellW = 56;
    const cellH = 40;
    const gap = 8;

    const setGroup = svgEl('g', this.container, {
      class: 'stl-set-wrap',
      transform: `translate(${startX}, ${startY})`
    });

    const title = svgEl('text', setGroup, { class: 'dsa-array-title', x: 0, y: 15 });
    title.textContent = `std::set ${name}`;

    const sizeText = svgEl('text', setGroup, { class: 'dsa-array-size', x: title.textContent.length * 8.5 + 20, y: 15 });
    sizeText.textContent = `(size: ${count}, unique elements)`;

    const setY = 35;
    for (let i = 0; i < count; i++) {
      const cellX = i * (cellW + gap);
      const val = elements[i];

      const cell = svgEl('g', setGroup, {
        class: 'dsa-cell',
        transform: `translate(${cellX}, ${setY})`
      });

      svgEl('rect', cell, {
        class: 'dsa-cell-box',
        width: cellW,
        height: cellH,
        rx: 16,
        ry: 16,
        stroke: '#818cf8',
        fill: 'rgba(129, 140, 248, 0.08)'
      });

      const txt = svgEl('text', cell, {
        class: 'dsa-cell-val',
        x: cellW / 2,
        y: cellH / 2,
        fill: '#c7d2fe',
        'font-weight': 600
      });
      txt.textContent = val !== undefined ? val : '';
    }

    return startY + setY + cellH + 30;
  }

  renderMap(mapObj, meta, startX, startY) {
    const entries = Object.entries(mapObj.value || {});
    const name = mapObj.name;
    const count = entries.length;
    const cardW = 120;
    const cardH = 40;
    const gap = 10;

    const mapGroup = svgEl('g', this.container, {
      class: 'stl-map-wrap',
      transform: `translate(${startX}, ${startY})`
    });

    const title = svgEl('text', mapGroup, { class: 'dsa-array-title', x: 0, y: 15 });
    title.textContent = `std::map ${name}`;

    const sizeText = svgEl('text', mapGroup, { class: 'dsa-array-size', x: title.textContent.length * 8.5 + 20, y: 15 });
    sizeText.textContent = `(size: ${count} keys)`;

    const mapY = 35;
    entries.forEach(([key, val], i) => {
      const cardX = (i % 6) * (cardW + gap);
      const rowIdx = Math.floor(i / 6);
      const curCardY = mapY + rowIdx * (cardH + gap);

      const card = svgEl('g', mapGroup, {
        class: 'dsa-cell',
        transform: `translate(${cardX}, ${curCardY})`
      });

      svgEl('rect', card, {
        class: 'dsa-cell-box',
        width: cardW,
        height: cardH,
        rx: 6,
        ry: 6,
        stroke: '#38bdf8',
        fill: 'rgba(56, 189, 248, 0.05)'
      });

      svgEl('line', card, {
        x1: cardW * 0.55,
        y1: 4,
        x2: cardW * 0.55,
        y2: cardH - 4,
        stroke: 'rgba(56, 189, 248, 0.25)',
        'stroke-width': 1
      });

      const keyTxt = svgEl('text', card, {
        x: (cardW * 0.55) / 2,
        y: cardH / 2,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        fill: '#38bdf8',
        'font-family': 'var(--font-mono)',
        'font-size': 13,
        'font-weight': 700
      });
      keyTxt.textContent = key;

      const valTxt = svgEl('text', card, {
        x: cardW * 0.55 + (cardW * 0.45) / 2,
        y: cardH / 2,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        fill: '#34d399',
        'font-family': 'var(--font-mono)',
        'font-size': 13,
        'font-weight': 700
      });
      valTxt.textContent = val;
    });

    const rowsCount = Math.max(1, Math.ceil(count / 6));
    return startY + mapY + rowsCount * (cardH + gap) + 30;
  }

  renderAdjacencyList(arrObj, allPointers, meta, startX, startY) {
    const adj = arrObj.value || [];
    const name = arrObj.name;
    const numVertices = adj.length;
    const rowH = 46;
    const nodeW = 44;
    const neighborW = 44;
    const gap = 8;

    const adjGroup = svgEl('g', this.container, {
      class: 'dsa-adj-wrap',
      transform: `translate(${startX}, ${startY})`
    });

    const title = svgEl('text', adjGroup, { class: 'dsa-array-title', x: 0, y: 15 });
    title.textContent = `Graph Adjacency List: ${name} (vertices: ${numVertices})`;

    const startListY = 35;
    for (let u = 0; u < numVertices; u++) {
      const curRowY = startListY + u * rowH;
      const neighbors = Array.isArray(adj[u]) ? adj[u] : [];

      const isCurVertex = allPointers.some(p => p.value === u);

      const vertexGroup = svgEl('g', adjGroup, {
        transform: `translate(0, ${curRowY})`
      });

      svgEl('circle', vertexGroup, {
        cx: nodeW / 2,
        cy: rowH / 2,
        r: 18,
        fill: isCurVertex ? 'rgba(56, 189, 248, 0.25)' : 'rgba(30, 41, 59, 0.9)',
        stroke: isCurVertex ? '#38bdf8' : '#64748b',
        'stroke-width': isCurVertex ? 2.5 : 1.5
      });

      const vertexTxt = svgEl('text', vertexGroup, {
        x: nodeW / 2,
        y: rowH / 2,
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        fill: isCurVertex ? '#38bdf8' : '#f8fafc',
        'font-family': 'var(--font-mono)',
        'font-size': 13,
        'font-weight': 700
      });
      vertexTxt.textContent = u;

      svgEl('line', vertexGroup, {
        x1: nodeW + 6,
        y1: rowH / 2,
        x2: nodeW + 28,
        y2: rowH / 2,
        stroke: '#475569',
        'stroke-width': 1.5,
        'marker-end': 'url(#arrowhead)'
      });

      let nX = nodeW + 36;
      if (neighbors.length === 0) {
        const emptyTxt = svgEl('text', vertexGroup, {
          x: nX + 8,
          y: rowH / 2,
          'dominant-baseline': 'central',
          fill: '#64748b',
          'font-size': 12,
          'font-style': 'italic'
        });
        emptyTxt.textContent = 'empty (no outgoing edges)';
      } else {
        neighbors.forEach((v, idx) => {
          const neighborBox = svgEl('g', vertexGroup, {
            transform: `translate(${nX}, ${(rowH - 32) / 2})`
          });

          svgEl('rect', neighborBox, {
            width: neighborW,
            height: 32,
            rx: 6,
            ry: 6,
            fill: 'rgba(30, 41, 59, 0.8)',
            stroke: '#475569',
            'stroke-width': 1.2
          });

          const nTxt = svgEl('text', neighborBox, {
            x: neighborW / 2,
            y: 16,
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
            fill: '#f1f5f9',
            'font-family': 'var(--font-mono)',
            'font-size': 13,
            'font-weight': 600
          });
          nTxt.textContent = v;

          nX += neighborW + gap;

          if (idx < neighbors.length - 1) {
            svgEl('line', vertexGroup, {
              x1: nX - gap + 2,
              y1: rowH / 2,
              x2: nX - 2,
              y2: rowH / 2,
              stroke: '#64748b',
              'stroke-width': 1.2
            });
          }
        });
      }
    }

    return startY + startListY + numVertices * rowH + 30;
  }

  renderMultiPointerMarker(parent, ptrList, centerX, targetY) {
    if (!ptrList || ptrList.length === 0) return;
    const ptrGroup = svgEl('g', parent, { class: 'dsa-pointer-group' });
    const arrowTipY = targetY - 4;
    const baseColor = ptrList[0].color || colorForVar(ptrList[0].name);

    svgEl('polygon', ptrGroup, {
      class: 'dsa-pointer-arrow',
      points: `${centerX},${arrowTipY} ${centerX - 5},${arrowTipY - 7} ${centerX + 5},${arrowTipY - 7}`,
      fill: baseColor
    });

    const badgeH = 22;
    const badgeGap = 4;

    ptrList.forEach((p, idx) => {
      const badgeY = arrowTipY - 7 - (idx + 1) * badgeH - idx * badgeGap;
      const text = p.name;
      const badgeW = Math.max(32, text.length * 8 + 14);
      const badgeX = centerX - badgeW / 2;
      const pColor = p.color || colorForVar(p.name);

      svgEl('rect', ptrGroup, {
        class: 'dsa-pointer-badge',
        x: badgeX,
        y: badgeY,
        width: badgeW,
        height: badgeH,
        rx: 11,
        ry: 11,
        fill: pColor,
        stroke: 'rgba(255, 255, 255, 0.25)',
        'stroke-width': 1.2
      });

      const t = svgEl('text', ptrGroup, {
        class: 'dsa-pointer-text',
        x: centerX,
        y: badgeY + badgeH / 2,
        fill: '#0b0d13'
      });
      t.textContent = text;
    });
  }
}
