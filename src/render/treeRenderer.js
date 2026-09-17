/**
 * Binary Tree SVG Renderer
 */

import { colorForVar } from './listRenderer.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const TREE_R = 28;
const TREE_SPACING_X = 84;
const TREE_SPACING_Y = 115;
const TREE_ORIGIN_X = 400;
const TREE_ORIGIN_Y = 100;

function svgEl(tag, parent) {
  const el = document.createElementNS(SVGNS, tag);
  if (parent) parent.appendChild(el);
  return el;
}

export class TreeRenderer {
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

  drawTreeNode(n, x, y, seen, activeIds, leakIds) {
    const key = `node:${n.id}`;
    const isFreed = !!n.freed;
    const isLeak = leakIds && leakIds.includes(n.id);

    const g = this.getOrCreateGroup(key, 'tree-node', seen);
    if (!g.dataset.built) {
      g.innerHTML = `
        <circle r="${TREE_R}"></circle>
        <text class="tree-val"></text>
        <text class="tree-label"></text>
        <text class="status-badge"></text>
      `;
      g.dataset.built = '1';
    }

    g.setAttribute('transform', `translate(${x}, ${y})`);
    g.classList.toggle('node-active', activeIds.has(n.id));
    g.classList.toggle('node-freed', isFreed);
    g.classList.toggle('node-leak', isLeak);

    const text = g.querySelector('.tree-val');
    text.textContent = n.val;

    const label = g.querySelector('.tree-label');
    label.textContent = n.id;
    label.setAttribute('y', -TREE_R - 6);

    const badge = g.querySelector('.status-badge');
    badge.setAttribute('y', TREE_R + 18);
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
  }

  drawNullStub(key, parentPos, field, seen) {
    seen.add(key);
    let g = this.elCache.get(key);
    if (!g) {
      g = svgEl('g', this.viewport);
      g.setAttribute('class', 'null-stub');
      g.innerHTML = `<line></line><text></text>`;
      this.elCache.set(key, g);
    }
    const dx = field === 'left' ? -36 : 36;
    const x1 = parentPos.x;
    const y1 = parentPos.y + TREE_R;
    const x2 = parentPos.x + dx;
    const y2 = parentPos.y + TREE_R + 36;

    const line = g.querySelector('line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);

    const t = g.querySelector('text');
    t.setAttribute('x', x2);
    t.setAttribute('y', y2 + 14);
    t.textContent = 'null';
  }

  drawEdge(key, parentPos, childPos, field, seen, flashSet) {
    seen.add(key);
    let path = this.elCache.get(key);
    if (!path) {
      path = svgEl('path', this.viewport);
      path.setAttribute('class', 'edge-path');
      path.setAttribute('marker-end', 'url(#arrowhead)');
      this.elCache.set(key, path);
    }

    const sx = parentPos.x;
    const sy = parentPos.y + TREE_R;
    const tx = childPos.x;
    const ty = childPos.y - TREE_R;
    const midY = (sy + ty) / 2;

    path.setAttribute('d', `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`);

    if (flashSet && flashSet.has(key)) {
      this.flashEl(path);
    }
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

    // Locate root: check first frame's 'root' pointer or first tree node in heap
    let rootId = null;
    if (frames[0] && frames[0].vars['root'] && frames[0].vars['root'].value) {
      rootId = frames[0].vars['root'].value;
    } else {
      const treeNode = Object.values(heap).find(n => n.structType === 'TreeNode' && !n.freed);
      if (treeNode) rootId = treeNode.id;
    }

    const pos = {};
    let counter = 0;

    // In-order traversal to compute x & y coordinates
    function visit(id, depth) {
      if (id === null || id === undefined || !heap[id] || heap[id].freed) return;
      visit(heap[id].left, depth + 1);
      pos[id] = {
        x: TREE_ORIGIN_X + counter * TREE_SPACING_X,
        y: TREE_ORIGIN_Y + depth * TREE_SPACING_Y
      };
      counter++;
      visit(heap[id].right, depth + 1);
    }

    if (rootId) {
      visit(rootId, 0);
    }

    // Place any detached/leaked tree nodes
    Object.values(heap).forEach(n => {
      if (n.structType === 'TreeNode' && !pos[n.id] && !n.freed) {
        pos[n.id] = {
          x: TREE_ORIGIN_X + (counter++) * TREE_SPACING_X,
          y: TREE_ORIGIN_Y + 300
        };
      }
    });

    // Render tree nodes
    Object.keys(pos).forEach(id => {
      this.drawTreeNode(heap[id], pos[id].x, pos[id].y, seen, activeIds, leakIds);
    });

    // Render tree edges
    Object.keys(pos).forEach(id => {
      const n = heap[id];
      const p = pos[id];
      if (n.freed) return;

      ['left', 'right'].forEach(field => {
        const childId = n[field];
        if (childId && pos[childId] && !heap[childId].freed) {
          this.drawEdge(`edge:${id}:${field}`, p, pos[childId], field, seen, flashSet);
        } else if (childId === null || childId === undefined) {
          this.drawNullStub(`stub:${id}:${field}`, p, field, seen);
        }
      });
    });

    // Null pointer anchor
    const maxY = (counter > 0 ? Math.max(...Object.values(pos).map(pp => pp.y)) : TREE_ORIGIN_Y) + 140;
    const nullX = TREE_ORIGIN_X + (counter > 1 ? (counter - 1) * TREE_SPACING_X / 2 : 0);

    // Badges
    const groups = this.collectPointerGroups(frames);
    groups.forEach((vars, key) => {
      let x, y;
      if (key === 'null') {
        x = nullX;
        y = maxY;
      } else {
        if (!pos[key]) return;
        x = pos[key].x;
        y = pos[key].y;
      }

      vars.forEach((v, i) => {
        this.drawBadge(
          `badge:${v.frameIdx}:${v.name}`,
          v.name,
          v.frameIdx,
          v.totalFrames,
          x,
          y - TREE_R - 20 - i * 28,
          seen
        );
      });
    });

    this.sweepUnseen(seen);
  }
}
