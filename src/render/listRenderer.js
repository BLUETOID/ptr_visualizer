/**
 * Singly & Doubly Linked List SVG Renderer
 */

const SVGNS = 'http://www.w3.org/2000/svg';
const NODE_W = 96;
const NODE_H = 56;
const COL_GAP = 160;
const ROW_Y = 270;
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
  q: '#34d399'
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
    const isDoubly = n.structType === 'DoublyListNode';

    const g = this.getOrCreateGroup(key, 'list-node', seen);
    if (!g.dataset.built) {
      g.innerHTML = `
        <rect class="val-cell"></rect>
        <rect class="ptr-cell next-cell"></rect>
        <text class="val-text"></text>
        <circle class="ptr-dot next-dot" r="4"></circle>
        <text class="label-text"></text>
        <text class="status-badge"></text>
      `;
      g.dataset.built = '1';
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

  drawNullAnchor(x, y, seen) {
    const key = 'nullptr-anchor';
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

  drawEdge(key, sx, sy, tx, ty, sourceCol, targetCol, seen, flashSet, arcAbove = true) {
    seen.add(key);
    let path = this.elCache.get(key);
    if (!path) {
      path = svgEl('path', this.viewport);
      path.setAttribute('class', 'edge-path');
      path.setAttribute('marker-end', 'url(#arrowhead)');
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
    let maxCol = 0;
    if (nodes.length) {
      maxCol = Math.max(0, ...nodes.map(n => n.col || 0));
    }

    const colToX = (col) => ORIGIN_X + (col || 0) * COL_GAP;

    // Render nodes
    nodes.forEach(n => {
      this.drawNode(n, colToX(n.col), ROW_Y, seen, activeIds, leakIds);
    });

    // Render null terminator anchor
    const nullX = colToX(maxCol + 1);
    this.drawNullAnchor(nullX, ROW_Y, seen);

    // Render Next / Prev edges
    nodes.forEach(n => {
      if (n.freed) return; // Don't draw outgoing pointers from freed memory

      // Next pointer
      const sx = colToX(n.col) + NODE_W;
      const sy = ROW_Y + NODE_H / 2;
      let tx, ty, targetCol;

      if (n.next === null || n.next === undefined) {
        tx = nullX;
        ty = ROW_Y + NODE_H / 2;
        targetCol = maxCol + 1;
      } else {
        const t = heap[n.next];
        if (!t) {
          tx = nullX;
          ty = ROW_Y + NODE_H / 2;
          targetCol = maxCol + 1;
        } else {
          tx = colToX(t.col);
          ty = ROW_Y + NODE_H / 2;
          targetCol = t.col;
        }
      }

      this.drawEdge(
        `edge:${n.id}:next`,
        sx, sy, tx, ty,
        n.col, targetCol,
        seen, flashSet,
        targetCol <= n.col // arc above if going backward or cycle
      );

      // Prev pointer (if DoublyListNode)
      if (n.structType === 'DoublyListNode' && n.prev !== undefined) {
        const psx = colToX(n.col);
        const psy = ROW_Y + NODE_H * 0.75;
        let ptx, pty, pTargetCol;

        if (n.prev === null || n.prev === undefined) {
          ptx = ORIGIN_X - 100;
          pty = ROW_Y + NODE_H * 0.75;
          pTargetCol = -1;
        } else {
          const pt = heap[n.prev];
          if (pt) {
            ptx = colToX(pt.col) + NODE_W;
            pty = ROW_Y + NODE_H * 0.75;
            pTargetCol = pt.col;
          }
        }

        if (ptx !== undefined) {
          this.drawEdge(
            `edge:${n.id}:prev`,
            psx, psy, ptx, pty,
            n.col, pTargetCol,
            seen, flashSet,
            false // arc below for prev
          );
        }
      }
    });

    // Render pointer badges
    const groups = this.collectPointerGroups(frames);
    groups.forEach((vars, key) => {
      let x, y;
      if (key === 'null') {
        x = nullX + NODE_W / 2;
        y = ROW_Y;
      } else {
        const n = heap[key];
        if (!n) return;
        x = colToX(n.col) + NODE_W / 2;
        y = ROW_Y;
      }

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
