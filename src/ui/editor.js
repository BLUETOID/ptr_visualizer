import { AutocompleteManager } from './autocomplete.js';
import { SyntaxHighlighter } from './syntaxHighlight.js';

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
      // 1. Support Tab indenting
      if (e.key === 'Tab' && !this.autocomplete.visible) {
        e.preventDefault();
        const start = this.codeInput.selectionStart;
        const end = this.codeInput.selectionEnd;
        const val = this.codeInput.value;
        this.codeInput.value = val.substring(0, start) + '    ' + val.substring(end);
        this.codeInput.selectionStart = this.codeInput.selectionEnd = start + 4;
        this.syncLineNumbers();
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.onCodeChange(this.getCode()), this.debounceMs);
        return;
      }

      // 2. Auto-closing brackets & quotes
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
        this.autocomplete.evaluateSuggestions();
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.onCodeChange(this.getCode()), this.debounceMs);
        return;
      }

      // 3. Skip over closing bracket if typed right before it
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

    // Handle scroll sync
    this.codeInput.addEventListener('scroll', () => {
      this.lineNumbers.scrollTop = this.codeInput.scrollTop;
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
    this.codeInput.style.height = (lines.length * this.lineHeight + 60) + 'px';
  }

  setActiveLine(lineIndex, isError = false) {
    if (!lineIndex || lineIndex < 1) return;
    this.activeLine.style.top = (Math.max(0, lineIndex - 1) * this.lineHeight + 10) + 'px';
    this.activeLine.classList.toggle('error-line', !!isError);

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
