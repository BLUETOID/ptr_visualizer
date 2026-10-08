/**
 * Memory Inspector: Live Call Stack & Heap Memory Status Panel
 */

import { colorForVar } from '../render/listRenderer.js';

export class MemoryInspector {
  constructor(stackPanelId, memoryBadgeId) {
    this.stackPanel = document.getElementById(stackPanelId);
    this.memoryBadge = document.getElementById(memoryBadgeId);

    if (typeof window !== 'undefined') {
      window.addEventListener('ptrviz-node-click', (e) => {
        if (e.detail && e.detail.id) {
          this.highlightNode(e.detail.id);
        }
      });
    }
  }

  highlightNode(nodeId) {
    if (!this.stackPanel) return;
    const rows = this.stackPanel.querySelectorAll('.stack-table tr');
    let matched = false;
    rows.forEach(tr => {
      tr.classList.remove('inspect-highlight');
      const text = tr.textContent || '';
      if (text.includes(nodeId)) {
        tr.classList.add('inspect-highlight');
        tr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        matched = true;
        setTimeout(() => tr.classList.remove('inspect-highlight'), 1800);
      }
    });
  }

  update(frames, heap, meta = {}) {
    this.renderStack(frames, heap);
    this.renderMemoryStatus(heap, meta);
  }

  describePointer(ptrVal, heap) {
    if (ptrVal === null || ptrVal === undefined) return 'nullptr';
    const node = heap[ptrVal];
    if (!node) return String(ptrVal);
    if (node.freed) return `<span class="ptr-freed">freed [${ptrVal}]</span>`;
    return `<span class="ptr-target">${ptrVal}</span> <span class="ptr-val">(val: ${node.val})</span>`;
  }

  renderStack(frames, heap) {
    if (!this.stackPanel) return;
    this.stackPanel.innerHTML = '';

    if (!frames || frames.length === 0) {
      this.stackPanel.innerHTML = '<div class="empty-msg">No active stack frames.</div>';
      return;
    }

    // Render each frame starting from current (top of stack) downwards
    for (let idx = frames.length - 1; idx >= 0; idx--) {
      const f = frames[idx];
      const frameDiv = document.createElement('div');
      frameDiv.className = `frame-block ${idx === frames.length - 1 ? 'frame-top' : ''}`;

      const header = document.createElement('div');
      header.className = 'frame-header';
      header.innerHTML = `
        <span class="frame-fn">#${idx} ${f.name}(...)</span>
        ${idx === frames.length - 1 ? '<span class="active-badge">ACTIVE</span>' : ''}
      `;
      frameDiv.appendChild(header);

      const table = document.createElement('table');
      table.className = 'stack-table';

      const varNames = Object.keys(f.vars);
      if (varNames.length === 0) {
        table.innerHTML = `<tr><td colspan="3" class="empty-locals">No local variables yet</td></tr>`;
      } else {
        varNames.forEach(name => {
          const info = f.vars[name];
          const tr = document.createElement('tr');
          const dot = `<span class="var-dot" style="background:${colorForVar(name)}"></span>`;
          function formatVal(v) {
            if (v === null || v === undefined) return 'nullptr';
            if (typeof v === 'string' && v.length === 1) return `'${v}'`;
            if (typeof v === 'string') return `"${v}"`;
            return String(v);
          }

          let valDesc = '';
          const isPtr = info.kind === 'pointer' || info.value === null ||
            (typeof info.value === 'string' && (/^n\d+$/.test(info.value) || (heap && heap[info.value])));

          if (isPtr) {
            valDesc = this.describePointer(info.value, heap);
          } else if (info.kind === 'array' || Array.isArray(info.value)) {
            const arr = Array.isArray(info.value) ? info.value : [];
            valDesc = `<span class="scalar-val">[${arr.slice(0, 10).map(formatVal).join(', ')}${arr.length > 10 ? '...' : ''}]</span> <span class="ptr-val">(len: ${arr.length})</span>`;
          } else if (info.value && info.value.isStack) {
            valDesc = `<span class="scalar-val">stack[${info.value.elements.map(formatVal).join(', ')}]</span> <span class="ptr-val">(top: ${formatVal(info.value.elements[info.value.elements.length - 1])})</span>`;
          } else if (info.value && info.value.isQueue) {
            valDesc = `<span class="scalar-val">queue[${info.value.elements.map(formatVal).join(', ')}]</span> <span class="ptr-val">(front: ${formatVal(info.value.elements[0])})</span>`;
          } else if (info.value && info.value.isPair) {
            valDesc = `<span class="scalar-val">pair(${formatVal(info.value.first)}, ${formatVal(info.value.second)})</span>`;
          } else if (info.kind === 'char' || (typeof info.value === 'string' && info.value.length === 1)) {
            valDesc = `<span class="scalar-val">'${info.value}'</span>`;
          } else if (info.kind === 'string' || typeof info.value === 'string') {
            valDesc = `<span class="scalar-val">"${info.value}"</span>`;
          } else if (info.kind === 'scalar') {
            valDesc = `<span class="scalar-val">${info.value}</span>`;
          } else {
            valDesc = this.describePointer(info.value, heap);
          }

          tr.innerHTML = `
            <td class="var-name">${dot}<code>${name}</code></td>
            <td class="var-kind">${info.kind}</td>
            <td class="var-val">${valDesc}</td>
          `;
          table.appendChild(tr);
        });
      }

      frameDiv.appendChild(table);
      this.stackPanel.appendChild(frameDiv);
    }
  }

  update(frames, heap, meta = {}, mode = 'pointer') {
    this.renderStack(frames, heap);
    if (mode === 'array_stl') {
      this.renderContainerStatus(frames, meta);
    } else {
      this.renderMemoryStatus(heap, meta);
    }
  }

  renderContainerStatus(frames, meta) {
    if (!this.memoryBadge) return;
    let containerCount = 0;
    let varCount = 0;
    if (frames && frames.length > 0) {
      const topFrame = frames[frames.length - 1];
      Object.values(topFrame.vars).forEach(v => {
        if (v.kind === 'array' || v.kind === 'string' || (v.value && (v.value.isStack || v.value.isQueue || v.value.isPriorityQueue || v.value.isSet || v.value.isMap || v.value.isPair || Array.isArray(v.value)))) {
          containerCount++;
        } else {
          varCount++;
        }
      });
    }

    this.memoryBadge.innerHTML = `
      <span class="mem-stat" title="Active STL Containers & Arrays">Containers: <b>${containerCount}</b></span>
      <span class="mem-stat" title="Active Variables in Scope">Variables: <b>${varCount}</b></span>
    `;
  }

  renderMemoryStatus(heap, meta) {
    if (!this.memoryBadge) return;

    const allNodes = Object.values(heap);
    const activeNodes = allNodes.filter(n => !n.freed);
    const freedNodes = allNodes.filter(n => n.freed);
    const leakIds = meta.leaks || [];

    let statusHtml = `
      <span class="mem-stat" title="Active Allocated Nodes">Active: <b>${activeNodes.length}</b></span>
      <span class="mem-stat" title="Deallocated with delete">Freed: <b>${freedNodes.length}</b></span>
    `;

    if (leakIds.length > 0) {
      statusHtml += `
        <span class="mem-alert-leak" title="Memory Leak: nodes allocated on heap but unreachable from stack">
          LEAK: ${leakIds.join(', ')}
        </span>
      `;
    }

    this.memoryBadge.innerHTML = statusHtml;
  }
}
