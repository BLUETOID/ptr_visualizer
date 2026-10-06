/**
 * Singly & Doubly Linked List SVG Renderer
 */

const SVGNS = 'http://www.w3.org/2000/svg';
const NODE_W = 96;
const NODE_H = 56;
const COL_GAP = 160;
const ROW_Y = 270;
const BASE_ROW_Y = 160;
const ROW_GAP = 160;
const ORIGIN_X = 260;

const VAR_COLORS = {
  head: '#38bdf8',
  curr: '#4ade80',
  prev: '#fbbf24',
  next: '#c084fc',
  first: '#2dd4bf',
  second: '#f472b6',
  temp: '#a78bfa',
  slow: '#a3e635',
  fast: '#f87171',
  dummy: '#94a3b8',
  tail: '#fb923c',
  p: '#60a5fa',
  q: '#34d399',
  l1: '#38bdf8',
  l2: '#4ade80',
  list1: '#38bdf8',
  list2: '#4ade80',
  headA: '#38bdf8',
  headB: '#4ade80',
  head1: '#38bdf8',
  head2: '#4ade80',
  head3: '#c084fc',
  head4: '#f472b6',
  pA: '#60a5fa',
  pB: '#34d399',
  left: '#38bdf8',
  right: '#f472b6',
  newNode: '#34d399',
  newHead: '#a78bfa',
  toDelete: '#ef4444'
};

const FALLBACK_PALETTE = [
  '#38bdf8', '#4ade80', '#fbbf24', '#c084fc',
  '#2dd4bf', '#f472b6', '#a78bfa', '#a3e635', '#f87171'
];

export function colorForVar(name) {
  if (VAR_COLORS[name]) return VAR_COLORS[name];
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_PALETTE[h % FALLBACK_PALETTE.length];
}

function svgEl(tag, parent) {
  const el = document.createElementNS(SVGNS, tag);
  if (parent) parent.appendChild(el);
  return el;
}

function bezierPath(sx, sy, tx, ty, arcAbove, arcHeight) {
  if (Math.abs(sy - ty) > 20) {
    const dx = Math.max(40, Math.abs(tx - sx) / 2);
    return `M ${sx} ${sy} C ${sx + dx} ${sy}, ${tx - dx} ${ty}, ${tx} ${ty}`;
  }
  const midX = (sx + tx) / 2;
  let c1y, c2y;
  if (arcAbove) {
    c1y = Math.min(sy, ty) - arcHeight;
    c2y = Math.min(sy, ty) - arcHeight;
  } else {
    c1y = Math.max(sy, ty) + arcHeight;
    c2y = Math.max(sy, ty) + arcHeight;
  }
  return `M ${sx} ${sy} C ${midX} ${c1y}, ${midX} ${c2y}, ${tx} ${ty}`;
}

export class ListRenderer {
  constructor(viewport) {
    this.viewport = viewport;
    this.elCache = new Map();
  }

  clear() {
    this.elCache.forEach(el => el.remove());
    this.elCache.clear();
  }

  getOrCreateGroup(key, className, seen) {
    seen.add(key);
    let g = this.elCache.get(key);
    if (!g) {
      g = svgEl('g', this.viewport);
      g.setAttribute('class', className);
      this.elCache.set(key, g);
    }
    return g;
  }

  sweepUnseen(seen) {
    for (const [key, el] of this.elCache) {
      if (!seen.has(key)) {
        el.remove();
        this.elCache.delete(key);
      }
    }
  }

  flashEl(el) {
    if (!el) return;
    el.classList.remove('flash');
    void (el.getBBox && el.getBBox());
    el.classList.add('flash');
  }

  drawNode(n, x, y, seen, activeIds, leakIds) {
    const key = `node:${n.id}`;
    const isFreed = !!n.freed;
    const isLeak = leakIds && leakIds.includes(n.id);

    const g = this.getOrCreateGroup(key, 'list-node', seen);
    if (!g.dataset.built) {
      g.innerHTML = `
        <rect class="val-cell"></rect>
        <rect class="ptr-cell"></rect>
        <text class="val-text"></text>
        <circle class="ptr-dot" r="4"></circle>
        <text class="label-text"></text>
        <text class="status-badge"></text>
      `;
      g.dataset.built = '1';

      // Click to highlight corresponding memory cell in Inspector
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ptrviz-node-click', { detail: { id: n.id } }));
        }
      });
    }

    g.setAttribute('transform', `translate(${x}, ${y})`);
    g.classList.toggle('stack-alloc', !!n.stackAllocated);
    g.classList.toggle('node-active', activeIds.has(n.id));
    g.classList.toggle('node-freed', isFreed);
    g.classList.toggle('node-leak', isLeak);

    const halfW = NODE_W * 0.55;
    const valCell = g.querySelector('.val-cell');
    valCell.setAttribute('x', 0);
    valCell.setAttribute('y', 0);
    valCell.setAttribute('width', halfW);
    valCell.setAttribute('height', NODE_H);
    valCell.setAttribute('rx', 8);

    const ptrCell = g.querySelector('.ptr-cell');
    ptrCell.setAttribute('x', halfW);
    ptrCell.setAttribute('y', 0);
    ptrCell.setAttribute('width', NODE_W - halfW);
    ptrCell.setAttribute('height', NODE_H);
    ptrCell.setAttribute('rx', 8);

    const valText = g.querySelector('.val-text');
    valText.setAttribute('x', halfW / 2);
    valText.setAttribute('y', NODE_H / 2 + 1);
    valText.textContent = n.val;

    const dot = g.querySelector('.ptr-dot');
    dot.setAttribute('cx', halfW + (NODE_W - halfW) / 2);
    dot.setAttribute('cy', NODE_H / 2);

    const label = g.querySelector('.label-text');
    label.setAttribute('x', NODE_W / 2);
    label.setAttribute('y', -10);

    let topLabel = '';
    if (n.stackAllocated) topLabel = `[stack: ${n.label || 'var'}]`;
    else topLabel = n.id;
    label.textContent = topLabel;

    const badge = g.querySelector('.status-badge');
    badge.setAttribute('x', NODE_W / 2);
    badge.setAttribute('y', NODE_H + 15);
    if (isFreed) {
      badge.textContent = 'DELETED';
      badge.setAttribute('fill', '#ef4444');
    } else if (isLeak) {
      badge.textContent = 'LEAK';
      badge.setAttribute('fill', '#f59e0b');
    } else {
      badge.textContent = '';
    }

    if (activeIds.has(n.id)) {
      this.flashEl(g);
    }

    return {
      top: { x: x + NODE_W / 2, y },
      right: { x: x + NODE_W, y: y + NODE_H / 2 },
      left: { x, y: y + NODE_H / 2 },
      bottom: { x: x + NODE_W / 2, y: y + NODE_H }
    };
  }

  drawNullAnchor(keyOrX, xOrY, seen, maybeKey) {
    let key, x, y;
    if (typeof keyOrX === 'string') {
      key = keyOrX;
      x = xOrY;
      y = seen;
      seen = maybeKey;
    } else {
      key = maybeKey || 'nullptr-anchor';
      x = keyOrX;
      y = xOrY;
    }
    const g = this.getOrCreateGroup(key, 'null-anchor', seen);
    if (!g.dataset.built) {
      g.innerHTML = `
        <rect width="${NODE_W}" height="${NODE_H}" rx="8"></rect>
        <text>nullptr</text>
      `;
      g.dataset.built = '1';
    }
    g.setAttribute('transform', `translate(${x}, ${y})`);
    const t = g.querySelector('text');
    t.setAttribute('x', NODE_W / 2);
    t.setAttribute('y', NODE_H / 2 + 1);
    return { x: x + NODE_W / 2, y };
  }

  drawRowLabel(key, label, x, y, seen) {
    seen.add(key);
    let g = this.elCache.get(key);
    if (!g) {
      g = svgEl('g', this.viewport);
      g.setAttribute('class', 'row-label');
      g.innerHTML = `<rect rx="10" ry="10"></rect><text></text>`;
      this.elCache.set(key, g);
    }
    g.setAttribute('transform', `translate(${x}, ${y})`);
    const t = g.querySelector('text');
    t.textContent = label;
    const w = Math.max(54, label.length * 8 + 16);
    const rect = g.querySelector('rect');
    rect.setAttribute('x', -w / 2);
    rect.setAttribute('y', -10);
    rect.setAttribute('width', w);
    rect.setAttribute('height', 20);
    t.setAttribute('x', 0);
    t.setAttribute('y', 1);
  }

  drawEdge(key, sx, sy, tx, ty, sourceCol, targetCol, seen, flashSet, arcAbove = true, isNullTarget = false) {
    seen.add(key);
    let path = this.elCache.get(key);
    if (!path) {
      path = svgEl('path', this.viewport);
      path.setAttribute('class', 'edge-path');
      this.elCache.set(key, path);
    }

    const colDiff = targetCol - sourceCol;
    const isBackward = colDiff <= 0;
    const effectiveArcAbove = arcAbove !== undefined ? arcAbove : isBackward;
    const arcHeight = effectiveArcAbove
      ? (48 + 18 * Math.abs(colDiff))
      : (colDiff > 1 ? 24 + 10 * (colDiff - 1) : 18);

    const d = bezierPath(sx, sy, tx, ty, effectiveArcAbove, arcHeight);
    path.setAttribute('d', d);

    // Red styling when pointing to nullptr
    if (isNullTarget) {
      path.classList.add('edge-null');
      path.setAttribute('marker-end', 'url(#arrowhead-null)');
    } else {
      path.classList.remove('edge-null');
      path.setAttribute('marker-end', 'url(#arrowhead)');
    }

    if (flashSet && flashSet.has(key)) {
      this.flashEl(path);
    }
    return path;
  }

  drawBadge(key, name, frameIdx, totalFrames, x, y, seen) {
    seen.add(key);
    let g = this.elCache.get(key);
    if (!g) {
      g = svgEl('g', this.viewport);
      g.setAttribute('class', 'badge');
      g.innerHTML = `<rect rx="11" ry="11"></rect><text></text>`;
      this.elCache.set(key, g);
    }

    g.setAttribute('transform', `translate(${x}, ${y})`);
    const text = name + (totalFrames > 1 ? `·#${frameIdx}` : '');
    const t = g.querySelector('text');
    t.textContent = text;

    const w = Math.max(34, text.length * 8 + 16);
    const rect = g.querySelector('rect');
    rect.setAttribute('x', -w / 2);
    rect.setAttribute('y', -12);
    rect.setAttribute('width', w);
    rect.setAttribute('height', 24);
    rect.setAttribute('fill', colorForVar(name));

    t.setAttribute('x', 0);
    t.setAttribute('y', 2);
  }

  collectPointerGroups(frames) {
    const groups = new Map();
    frames.forEach((f, fi) => {
      Object.entries(f.vars).forEach(([name, info]) => {
        if (info.kind !== 'pointer') return;
        const key = info.value === null || info.value === undefined ? 'null' : info.value;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ name, frameIdx: fi, totalFrames: frames.length });
      });
    });
    return groups;
  }

  render(heap, frames, meta = {}) {
    const seen = new Set();
    const activeIds = new Set(meta.highlight || []);
    const leakIds = meta.leaks || [];

    const flashSet = new Set();
    if (meta.highlight) meta.highlight.forEach(id => flashSet.add(`node:${id}`));
    if (meta.changedEdge) flashSet.add(`edge:${meta.changedEdge.id}:${meta.changedEdge.field}`);

    const nodes = Object.values(heap).filter(n => n.structType !== 'TreeNode');
    if (nodes.length === 0) {
      this.drawNullAnchor(ORIGIN_X, ROW_Y, seen);
      this.sweepUnseen(seen);
      return;
    }

    // Check for multi-row layout
    const hasMultipleRows = nodes.some(n => typeof n.row === 'number' && n.row > 0);
    const rowNodesMap = new Map();
    nodes.forEach(n => {
      const r = typeof n.row === 'number' ? n.row : 0;
      if (!rowNodesMap.has(r)) rowNodesMap.set(r, []);
      rowNodesMap.get(r).push(n);
    });

    const rowIndices = Array.from(rowNodesMap.keys()).sort((a, b) => a - b);
    const totalRows = hasMultipleRows ? rowIndices.length : 1;
    const getY = (row) => (totalRows <= 1 ? ROW_Y : BASE_ROW_Y + row * ROW_GAP);

    const hasDLL = nodes.some(n => n.structType === 'DoublyListNode' || n.prev !== undefined);
    const minCol = Math.min(0, ...nodes.map(n => n.col || 0));
    const baseOrigin = hasDLL ? (hasMultipleRows ? 320 : 260) : ORIGIN_X;
    const originX = minCol < 0 ? Math.max(baseOrigin, baseOrigin - minCol * COL_GAP) : baseOrigin;
    const colToX = (col) => originX + (col || 0) * COL_GAP;

    // Per-row null anchors (both left and right for DLL)
    const nullXByRow = {};
    const prevNullXByRow = {};

    rowIndices.forEach((r, idx) => {
      const rNodes = rowNodesMap.get(r) || [];
      const hasDLLOnRow = rNodes.some(n => n.structType === 'DoublyListNode' || n.prev !== undefined);

      // Right nullptr anchor (for Next pointers)
      const maxC = rNodes.length ? Math.max(0, ...rNodes.map(n => n.col || 0)) : 0;
      const nx = colToX(maxC + 1);
      nullXByRow[r] = nx;
      const rightKey = totalRows > 1 ? `nullptr-anchor-${r}` : 'nullptr-anchor';
      this.drawNullAnchor(rightKey, nx, getY(r), seen);

      // Left nullptr anchor (for Doubly Linked List Prev pointers)
      const minC = rNodes.length ? Math.min(0, ...rNodes.map(n => n.col || 0)) : 0;
      if (hasDLLOnRow) {
        const prevNx = colToX(minC - 1);
        prevNullXByRow[r] = prevNx;
        const leftKey = totalRows > 1 ? `nullptr-anchor-prev-${r}` : 'nullptr-anchor-prev';
        this.drawNullAnchor(leftKey, prevNx, getY(r), seen);
      }

      // Row label on the left for multi-row setups
      if (totalRows > 1) {
        const labelX = hasDLLOnRow ? (prevNullXByRow[r] - 52) : (colToX(minC) - 52);
        this.drawRowLabel(`row-label-${r}`, `List ${idx + 1}`, labelX, getY(r) + NODE_H / 2, seen);
      }
    });

    // Render nodes
    nodes.forEach(n => {
      const r = typeof n.row === 'number' ? n.row : 0;
      this.drawNode(n, colToX(n.col), getY(r), seen, activeIds, leakIds);
    });

    // Render Next / Prev edges
    nodes.forEach(n => {
      if (n.freed) return;

      const srcRow = typeof n.row === 'number' ? n.row : 0;

      // Next pointer
      const sx = colToX(n.col) + NODE_W;
      const sy = getY(srcRow) + NODE_H / 2;
      let tx, ty, targetCol, tgtRow, isNullTarget = false;

      if (n.next === null || n.next === undefined) {
        tx = nullXByRow[srcRow] || colToX(Math.max(0, ...nodes.map(m => m.col || 0)) + 1);
        ty = getY(srcRow) + NODE_H / 2;
        targetCol = (n.col || 0) + 1;
        tgtRow = srcRow;
        isNullTarget = true;
      } else {
        const t = heap[n.next];
        if (!t) {
          tx = nullXByRow[srcRow] || colToX(Math.max(0, ...nodes.map(m => m.col || 0)) + 1);
          ty = getY(srcRow) + NODE_H / 2;
          targetCol = (n.col || 0) + 1;
          tgtRow = srcRow;
          isNullTarget = true;
        } else {
          tgtRow = typeof t.row === 'number' ? t.row : srcRow;
          targetCol = t.col || 0;
          tx = colToX(targetCol);
          ty = getY(tgtRow) + NODE_H / 2;
        }
      }

      this.drawEdge(
        `edge:${n.id}:next`,
        sx, sy, tx, ty,
        n.col || 0, targetCol,
        seen, flashSet,
        tgtRow === srcRow ? targetCol <= (n.col || 0) : undefined,
        isNullTarget
      );

      // Prev pointer (if DoublyListNode)
      if (n.structType === 'DoublyListNode' && n.prev !== undefined) {
        const psx = colToX(n.col || 0);
        const psy = getY(srcRow) + NODE_H * 0.75;
        let ptx, pty, pTargetCol, isPrevNull = false;

        if (n.prev === null || n.prev === undefined || !heap[n.prev]) {
          const leftNullX = prevNullXByRow[srcRow] !== undefined
            ? prevNullXByRow[srcRow]
            : colToX((n.col || 0) - 1);
          ptx = leftNullX + NODE_W;
          pty = getY(srcRow) + NODE_H * 0.75;
          pTargetCol = (n.col || 0) - 1;
          isPrevNull = true;
        } else {
          const pt = heap[n.prev];
          const pTgtRow = typeof pt.row === 'number' ? pt.row : srcRow;
          pTargetCol = pt.col || 0;
          ptx = colToX(pTargetCol) + NODE_W;
          pty = getY(pTgtRow) + NODE_H * 0.75;
        }

        if (ptx !== undefined) {
          this.drawEdge(
            `edge:${n.id}:prev`,
            psx, psy, ptx, pty,
            n.col || 0, pTargetCol,
            seen, flashSet,
            false, // arc below for prev
            isPrevNull
          );
        }
      }
    });

    // Render pointer badges
    const groups = this.collectPointerGroups(frames);
    const nullBadgeStacks = new Map();

    groups.forEach((vars, key) => {
      if (key === 'null') {
        vars.forEach(v => {
          let assignedRow = 0;
          if (totalRows > 1) {
            const nameLower = v.name.toLowerCase();
            if (nameLower.includes('2') || nameLower.includes('b') || nameLower === 'q' || nameLower === 'second') {
              assignedRow = rowIndices.length > 1 ? rowIndices[1] : 0;
            }
          }
          const hasPrevAnchor = prevNullXByRow[assignedRow] !== undefined;
          const isPrevVar = v.name.toLowerCase().startsWith('prev');
          let nx;
          let stackKey;
          if (isPrevVar && hasPrevAnchor) {
            nx = prevNullXByRow[assignedRow] + NODE_W / 2;
            stackKey = `prev-${assignedRow}`;
          } else {
            nx = (nullXByRow[assignedRow] !== undefined ? nullXByRow[assignedRow] : colToX(Math.max(0, ...nodes.map(n => n.col || 0)) + 1)) + NODE_W / 2;
            stackKey = `next-${assignedRow}`;
          }
          const stackIdx = nullBadgeStacks.get(stackKey) || 0;
          nullBadgeStacks.set(stackKey, stackIdx + 1);

          const ny = getY(assignedRow);
          this.drawBadge(
            `badge:${v.frameIdx}:${v.name}`,
            v.name,
            v.frameIdx,
            v.totalFrames,
            nx,
            ny - 24 - stackIdx * 30,
            seen
          );
        });
        return;
      }

      const n = heap[key];
      if (!n) return;
      const r = typeof n.row === 'number' ? n.row : 0;
      const x = colToX(n.col || 0) + NODE_W / 2;
      const y = getY(r);

      vars.forEach((v, i) => {
        this.drawBadge(
          `badge:${v.frameIdx}:${v.name}`,
          v.name,
          v.frameIdx,
          v.totalFrames,
          x,
          y - 24 - i * 30,
          seen
        );
      });
    });

    this.sweepUnseen(seen);
  }
}
