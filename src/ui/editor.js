import { AutocompleteManager } from './autocomplete.js';
import { SyntaxHighlighter } from './syntaxHighlight.js';

/**
 * Pure helper for smart Enter auto-indentation and bracket block expansion
 */
export function computeEnterIndent(val, start, end) {
  const lastNewline = val.lastIndexOf('\n', start - 1);
  const lineBefore = val.substring(lastNewline + 1, start);
  const indentMatch = lineBefore.match(/^[ \t]*/);
  const currentIndent = indentMatch ? indentMatch[0] : '';

  const prevChar = val[start - 1];
  const nextChar = val[end];

  // 1. Bracket expansion: cursor directly between { and }
  if (prevChar === '{' && nextChar === '}') {
    const extraIndent = '    ';
    const insertion = '\n' + currentIndent + extraIndent + '\n' + currentIndent;
    const newVal = val.substring(0, start) + insertion + val.substring(end);
    const newPos = start + 1 + currentIndent.length + extraIndent.length;
    return { val: newVal, start: newPos, end: newPos };
  }

  // 2. Open block: line ends with { or ( or [
  let nextIndent = currentIndent;
  const trimmed = lineBefore.trimEnd();
  if (trimmed.endsWith('{') || trimmed.endsWith('(') || trimmed.endsWith('[')) {
    nextIndent += '    ';
  }

  const insertion = '\n' + nextIndent;
  const newVal = val.substring(0, start) + insertion + val.substring(end);
  const newPos = start + insertion.length;
  return { val: newVal, start: newPos, end: newPos };
}

/**
 * Pure helper for smart Backspace indentation deletion
 */
export function computeBackspaceIndent(val, start, end) {
  if (start !== end || start < 4) return null;
  const lastNewline = val.lastIndexOf('\n', start - 1);
  const linePrefix = val.substring(lastNewline + 1, start);

  // If entire line up to cursor consists only of spaces and ends with 4 spaces
  if (/^[ ]+$/.test(linePrefix) && linePrefix.length % 4 === 0) {
    const newVal = val.substring(0, start - 4) + val.substring(end);
    const newPos = start - 4;
    return { val: newVal, start: newPos, end: newPos };
  }
  return null;
}

/**
 * Pure helper for Tab / Shift+Tab indent and unindent
 */
export function computeTabIndent(val, start, end, shiftKey) {
  if (start !== end) {
    // Multi-line block indentation
    const blockStart = val.lastIndexOf('\n', start - 1) + 1;
    let blockEnd = val.indexOf('\n', end);
    if (blockEnd === -1) blockEnd = val.length;

    const blockText = val.substring(blockStart, blockEnd);
    const lines = blockText.split('\n');
    let deltaStart = 0;
    let deltaTotal = 0;

    const newLines = lines.map((line, idx) => {
      if (shiftKey) {
        const removed = line.startsWith('    ') ? 4 : line.match(/^[ ]*/)[0].length;
        if (idx === 0) deltaStart = -removed;
        deltaTotal -= removed;
        return line.substring(removed);
      } else {
        if (idx === 0) deltaStart = 4;
        deltaTotal += 4;
        return '    ' + line;
      }
    });

    const newBlock = newLines.join('\n');
    const newVal = val.substring(0, blockStart) + newBlock + val.substring(blockEnd);
    return {
      val: newVal,
      start: Math.max(blockStart, start + deltaStart),
      end: Math.max(blockStart, end + deltaTotal)
    };
  }

  // Single cursor
  if (shiftKey) {
    const lastNewline = val.lastIndexOf('\n', start - 1);
    const linePrefix = val.substring(lastNewline + 1, start);
    if (/^[ ]+$/.test(linePrefix) && linePrefix.length > 0) {
      const removeCount = Math.min(4, linePrefix.length);
      const newVal = val.substring(0, start - removeCount) + val.substring(end);
      const newPos = start - removeCount;
      return { val: newVal, start: newPos, end: newPos };
    }
    return { val, start, end };
  }

  // Insert 4 spaces
  const newVal = val.substring(0, start) + '    ' + val.substring(end);
  const newPos = start + 4;
  return { val: newVal, start: newPos, end: newPos };
}

export class EditorManager {
  constructor(options) {
    this.codeInput = document.getElementById(options.codeInputId);
    this.lineNumbers = document.getElementById(options.lineNumbersId);
    this.activeLine = document.getElementById(options.activeLineId);
    this.editorScroll = document.getElementById(options.editorScrollId);
    this.parseStatus = document.getElementById(options.parseStatusId);
    this.snippetsBar = document.getElementById(options.snippetsBarId);

    this.onCodeChange = options.onCodeChange || (() => {});
    this.onCursorLine = options.onCursorLine || (() => {});

    this.lineHeight = 21;
    this.debounceTimer = null;
    this.debounceMs = 320;
    this.lastLineCount = 0;
    this.followCursor = true;

    this.autocomplete = new AutocompleteManager(this.codeInput, (code) => {
      this.syncLineNumbers();
      this.highlighter.update();
      this.onCodeChange(code);
    });

    this.highlighter = new SyntaxHighlighter(this.codeInput);

    this.initEvents();
  }

  initEvents() {
    this.codeInput.addEventListener('input', () => {
      this.syncLineNumbers();
      this.setStatus('Typing...', 'pending');
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.onCodeChange(this.getCode());
      }, this.debounceMs);
    });

    this.codeInput.addEventListener('keydown', (e) => {
      // 1. Smart Enter auto-indentation and bracket block expansion
      if (e.key === 'Enter' && !this.autocomplete.visible) {
        e.preventDefault();
        const start = this.codeInput.selectionStart;
        const end = this.codeInput.selectionEnd;
        const val = this.codeInput.value;
        const res = computeEnterIndent(val, start, end);
        this.codeInput.value = res.val;
        this.codeInput.selectionStart = res.start;
        this.codeInput.selectionEnd = res.end;
        this.syncLineNumbers();
        if (this.highlighter) this.highlighter.update();
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.onCodeChange(this.getCode()), this.debounceMs);
        return;
      }

      // 2. Smart Backspace for 4-space indent deletion
      if (e.key === 'Backspace' && !this.autocomplete.visible) {
        const start = this.codeInput.selectionStart;
        const end = this.codeInput.selectionEnd;
        const val = this.codeInput.value;
        const res = computeBackspaceIndent(val, start, end);
        if (res) {
          e.preventDefault();
          this.codeInput.value = res.val;
          this.codeInput.selectionStart = res.start;
          this.codeInput.selectionEnd = res.end;
          this.syncLineNumbers();
          if (this.highlighter) this.highlighter.update();
          clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => this.onCodeChange(this.getCode()), this.debounceMs);
          return;
        }
      }

      // 3. Smart Tab & Shift+Tab (single line or multi-line block)
      if (e.key === 'Tab' && !this.autocomplete.visible) {
        e.preventDefault();
        const start = this.codeInput.selectionStart;
        const end = this.codeInput.selectionEnd;
        const val = this.codeInput.value;
        const res = computeTabIndent(val, start, end, e.shiftKey);
        this.codeInput.value = res.val;
        this.codeInput.selectionStart = res.start;
        this.codeInput.selectionEnd = res.end;
        this.syncLineNumbers();
        if (this.highlighter) this.highlighter.update();
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.onCodeChange(this.getCode()), this.debounceMs);
        return;
      }

      // 4. Auto-closing brackets & quotes
      const pairs = { '(': ')', '{': '}', '[': ']' };
      if (pairs[e.key] && !this.autocomplete.visible) {
        const start = this.codeInput.selectionStart;
        const end = this.codeInput.selectionEnd;
        const val = this.codeInput.value;
        const closeChar = pairs[e.key];

        e.preventDefault();
        this.codeInput.value = val.substring(0, start) + e.key + closeChar + val.substring(end);
        this.codeInput.selectionStart = this.codeInput.selectionEnd = start + 1;
        this.syncLineNumbers();
        if (this.highlighter) this.highlighter.update();
        this.autocomplete.evaluateSuggestions();
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.onCodeChange(this.getCode()), this.debounceMs);
        return;
      }

      // 5. Skip over closing bracket if typed right before it
      if ([')', '}', ']'].includes(e.key) && !this.autocomplete.visible) {
        const start = this.codeInput.selectionStart;
        if (this.codeInput.value[start] === e.key) {
          e.preventDefault();
          this.codeInput.selectionStart = this.codeInput.selectionEnd = start + 1;
          return;
        }
      }
    });

    // Detect cursor line change
    const handleCursor = () => {
      if (!this.followCursor) return;
      const pos = this.codeInput.selectionStart;
      const textBefore = this.codeInput.value.substring(0, pos);
      const lineNumber = textBefore.split('\n').length;
      this.onCursorLine(lineNumber);
    };

    this.codeInput.addEventListener('click', handleCursor);
    this.codeInput.addEventListener('keyup', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
        handleCursor();
      }
    });

    // Handle scroll sync & prevent runaway internal textarea scroll
    this.codeInput.addEventListener('scroll', () => {
      if (this.codeInput.scrollTop > 0) {
        this.editorScroll.scrollTop += this.codeInput.scrollTop;
        this.codeInput.scrollTop = 0;
      }
      if (this.highlighter) {
        this.highlighter.syncScroll();
      }
    });
  }

  renderSnippets(snippets) {
    if (!this.snippetsBar) return;
    this.snippetsBar.innerHTML = '';
    snippets.forEach(snip => {
      const btn = document.createElement('button');
      btn.className = 'snippet-btn';
      btn.textContent = snip.label;
      btn.title = snip.description;
      btn.addEventListener('click', () => {
        this.insertSnippet(snip.code);
      });
      this.snippetsBar.appendChild(btn);
    });
  }

  insertSnippet(text) {
    const start = this.codeInput.selectionStart;
    const end = this.codeInput.selectionEnd;
    const val = this.codeInput.value;

    this.codeInput.value = val.substring(0, start) + text + val.substring(end);
    this.codeInput.selectionStart = this.codeInput.selectionEnd = start + text.length;
    this.codeInput.focus();

    this.syncLineNumbers();
    this.onCodeChange(this.getCode());
  }

  setCode(code) {
    this.codeInput.value = code;
    this.syncLineNumbers();
    this.highlighter.update();
  }

  getCode() {
    return this.codeInput.value;
  }

  syncLineNumbers() {
    const lines = this.codeInput.value.split('\n');
    if (lines.length !== this.lastLineCount) {
      this.lastLineCount = lines.length;
      let html = '';
      for (let i = 1; i <= lines.length; i++) {
        html += `<div data-line="${i}">${i}</div>`;
      }
      this.lineNumbers.innerHTML = html;
    }

    let maxCols = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > maxCols) maxCols = lines[i].length;
    }
    const containerW = this.editorScroll ? Math.max(300, this.editorScroll.clientWidth - 65) : 400;
    const computedW = Math.max(containerW, maxCols * 8.5 + 48);
    const computedH = lines.length * this.lineHeight + 80;

    this.codeInput.style.width = computedW + 'px';
    this.codeInput.style.height = computedH + 'px';

    if (this.highlighter && this.highlighter.overlay) {
      this.highlighter.overlay.style.width = computedW + 'px';
      this.highlighter.overlay.style.height = computedH + 'px';
    }
    if (this.activeLine) {
      this.activeLine.style.width = computedW + 'px';
    }
  }

  setActiveLine(lineIndex, isError = false, forceScroll = false) {
    if (!lineIndex || lineIndex < 1) return;
    this.activeLine.style.top = (Math.max(0, lineIndex - 1) * this.lineHeight + 10) + 'px';
    this.activeLine.classList.toggle('error-line', !!isError);

    // CRITICAL: If user is actively typing in codeInput, do NOT scroll away!
    if (document.activeElement === this.codeInput && !forceScroll) {
      return;
    }

    // Auto scroll editor if active line is outside viewport
    const targetY = (lineIndex - 1) * this.lineHeight;
    const scrollTop = this.editorScroll.scrollTop;
    const viewH = this.editorScroll.clientHeight;
    if (targetY < scrollTop || targetY > scrollTop + viewH - this.lineHeight * 2) {
      this.editorScroll.scrollTop = Math.max(0, targetY - viewH / 2);
    }
  }

  setStatus(msg, type = 'ok') {
    if (!this.parseStatus) return;
    this.parseStatus.textContent = msg;
    this.parseStatus.className = `status-pill status-${type}`;
  }
}
