/**
 * Real-Time Syntax Highlighter for C++ Code
 * Uses an overlay div that mirrors the textarea content with colored <span> tokens.
 * The textarea keeps transparent text so the user can type normally,
 * while the overlay renders the same text with syntax coloring underneath the caret.
 */

const KEYWORDS = new Set([
  'if', 'else', 'while', 'for', 'do', 'return', 'break', 'continue',
  'switch', 'case', 'default', 'struct', 'class', 'new', 'delete',
  'void', 'const', 'static', 'typedef', 'using', 'namespace',
  'public', 'private', 'protected', 'virtual', 'override',
  'template', 'typename', 'inline', 'extern', 'sizeof'
]);

const TYPES = new Set([
  'int', 'bool', 'char', 'float', 'double', 'long', 'short',
  'unsigned', 'auto', 'size_t',
  'ListNode', 'TreeNode', 'DoublyListNode',
  'string', 'vector', 'map', 'set', 'queue', 'stack', 'pair'
]);

const CONSTANTS = new Set([
  'nullptr', 'NULL', 'true', 'false'
]);

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlightLine(line) {
  let result = '';
  let i = 0;

  while (i < line.length) {
    const c = line[i];

    // Single-line comment
    if (c === '/' && line[i + 1] === '/') {
      result += `<span class="hl-comment">${escapeHtml(line.substring(i))}</span>`;
      return result;
    }

    // String literal
    if (c === '"') {
      let j = i + 1;
      while (j < line.length && line[j] !== '"') {
        if (line[j] === '\\') j++;
        j++;
      }
      if (j < line.length) j++;
      result += `<span class="hl-string">${escapeHtml(line.substring(i, j))}</span>`;
      i = j;
      continue;
    }

    // Character literal
    if (c === "'") {
      let j = i + 1;
      while (j < line.length && line[j] !== "'") {
        if (line[j] === '\\') j++;
        j++;
      }
      if (j < line.length) j++;
      result += `<span class="hl-string">${escapeHtml(line.substring(i, j))}</span>`;
      i = j;
      continue;
    }

    // Preprocessor directive
    if (c === '#' && (i === 0 || line.substring(0, i).trim() === '')) {
      result += `<span class="hl-preprocessor">${escapeHtml(line.substring(i))}</span>`;
      return result;
    }

    // Numbers
    if (c >= '0' && c <= '9') {
      let j = i;
      while (j < line.length && /[0-9.xXabcdefABCDEF]/.test(line[j])) j++;
      result += `<span class="hl-number">${escapeHtml(line.substring(i, j))}</span>`;
      i = j;
      continue;
    }

    // Identifiers & keywords
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
      const word = line.substring(i, j);

      // Check if followed by '(' to detect function calls
      let afterWord = j;
      while (afterWord < line.length && line[afterWord] === ' ') afterWord++;
      const isCall = line[afterWord] === '(';

      if (KEYWORDS.has(word)) {
        result += `<span class="hl-keyword">${escapeHtml(word)}</span>`;
      } else if (TYPES.has(word)) {
        result += `<span class="hl-type">${escapeHtml(word)}</span>`;
      } else if (CONSTANTS.has(word)) {
        result += `<span class="hl-constant">${escapeHtml(word)}</span>`;
      } else if (isCall) {
        result += `<span class="hl-function">${escapeHtml(word)}</span>`;
      } else {
        result += `<span class="hl-plain">${escapeHtml(word)}</span>`;
      }
      i = j;
      continue;
    }

    // Arrow operator
    if (c === '-' && line[i + 1] === '>') {
      result += `<span class="hl-operator">-&gt;</span>`;
      i += 2;
      // The field after -> gets member coloring
      let j = i;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
      if (j > i) {
        result += `<span class="hl-member">${escapeHtml(line.substring(i, j))}</span>`;
        i = j;
      }
      continue;
    }

    // Dot member access
    if (c === '.' && i > 0 && /[A-Za-z0-9_)]/.test(line[i - 1]) && i + 1 < line.length && /[A-Za-z_]/.test(line[i + 1])) {
      result += `<span class="hl-operator">.</span>`;
      i++;
      let j = i;
      while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
      if (j > i) {
        result += `<span class="hl-member">${escapeHtml(line.substring(i, j))}</span>`;
        i = j;
      }
      continue;
    }

    // Multi-char operators
    if (i + 1 < line.length) {
      const two = line.substring(i, i + 2);
      if (['==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '<<', '>>'].includes(two)) {
        result += `<span class="hl-operator">${escapeHtml(two)}</span>`;
        i += 2;
        continue;
      }
    }

    // Single-char operators
    if ('=+-*/%<>!&|^~?:'.includes(c)) {
      result += `<span class="hl-operator">${escapeHtml(c)}</span>`;
      i++;
      continue;
    }

    // Punctuation
    if ('(){}[];,.'.includes(c)) {
      result += `<span class="hl-punctuation">${escapeHtml(c)}</span>`;
      i++;
      continue;
    }

    // Whitespace and other
    result += escapeHtml(c);
    i++;
  }

  return result;
}

/**
 * Full-source highlighting supporting multi-line comments
 */
export function highlightCode(source) {
  const lines = source.split('\n');
  const highlightedLines = [];
  let inBlockComment = false;

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];

    if (inBlockComment) {
      const endIdx = line.indexOf('*/');
      if (endIdx !== -1) {
        inBlockComment = false;
        const commentPart = line.substring(0, endIdx + 2);
        const rest = line.substring(endIdx + 2);
        highlightedLines.push(
          `<span class="hl-comment">${escapeHtml(commentPart)}</span>${highlightLine(rest)}`
        );
      } else {
        highlightedLines.push(`<span class="hl-comment">${escapeHtml(line)}</span>`);
      }
      continue;
    }

    // Check for block comment start
    const blockStart = line.indexOf('/*');
    if (blockStart !== -1 && !lineHasStringAt(line, blockStart)) {
      const blockEnd = line.indexOf('*/', blockStart + 2);
      if (blockEnd !== -1) {
        // Block comment starts and ends on same line
        const before = line.substring(0, blockStart);
        const comment = line.substring(blockStart, blockEnd + 2);
        const after = line.substring(blockEnd + 2);
        highlightedLines.push(
          `${highlightLine(before)}<span class="hl-comment">${escapeHtml(comment)}</span>${highlightLine(after)}`
        );
      } else {
        // Block comment starts but doesn't end
        inBlockComment = true;
        const before = line.substring(0, blockStart);
        const comment = line.substring(blockStart);
        highlightedLines.push(
          `${highlightLine(before)}<span class="hl-comment">${escapeHtml(comment)}</span>`
        );
      }
      continue;
    }

    highlightedLines.push(highlightLine(line));
  }

  return highlightedLines.join('\n');
}

/**
 * Check if position is inside a string literal (basic heuristic)
 */
function lineHasStringAt(line, pos) {
  let inStr = false;
  for (let i = 0; i < pos; i++) {
    if (line[i] === '"' && (i === 0 || line[i - 1] !== '\\')) {
      inStr = !inStr;
    }
  }
  return inStr;
}

/**
 * SyntaxHighlighter class: manages the overlay div and keeps it synced
 * with the textarea.
 */
export class SyntaxHighlighter {
  constructor(textarea) {
    this.textarea = textarea;
    this.overlay = null;
    this.createOverlay();
    this.bindSync();
    this.update();
  }

  createOverlay() {
    const parent = this.textarea.parentElement;
    this.overlay = document.createElement('div');
    this.overlay.className = 'editor-highlight-overlay';
    this.overlay.setAttribute('aria-hidden', 'true');

    // Insert overlay BEFORE the textarea so it renders behind
    parent.insertBefore(this.overlay, this.textarea);

    // Make textarea text transparent
    this.textarea.classList.add('syntax-enabled');
  }

  bindSync() {
    this.textarea.addEventListener('input', () => this.update());
    this.textarea.addEventListener('scroll', () => this.syncScroll());

    // MutationObserver to catch programmatic value changes
    this._lastValue = this.textarea.value;
    this._pollTimer = setInterval(() => {
      if (this.textarea.value !== this._lastValue) {
        this._lastValue = this.textarea.value;
        this.update();
      }
    }, 100);
  }

  update() {
    const source = this.textarea.value;
    this._lastValue = source;
    // Add a trailing newline so the overlay height matches the textarea
    this.overlay.innerHTML = highlightCode(source) + '\n';
    if (this.textarea.style.height) {
      this.overlay.style.height = this.textarea.style.height;
    }
    this.syncScroll();
  }

  syncScroll() {
    this.overlay.scrollTop = this.textarea.scrollTop;
    this.overlay.scrollLeft = this.textarea.scrollLeft;
  }

  destroy() {
    clearInterval(this._pollTimer);
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.textarea.classList.remove('syntax-enabled');
  }
}
