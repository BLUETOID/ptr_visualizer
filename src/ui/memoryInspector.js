/**
 * Memory Inspector: Live Call Stack & Heap Memory Status Panel
 */

import { colorForVar } from '../render/listRenderer.js';

export class MemoryInspector {
  constructor(stackPanelId, memoryBadgeId) {
    this.stackPanel = document.getElementById(stackPanelId);
    this.memoryBadge = document.getElementById(memoryBadgeId);
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
          const valDesc = info.kind === 'scalar'
            ? `<span class="scalar-val">${info.value}</span>`
            : this.describePointer(info.value, heap);

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
