/**
 * C++ Lexer with line and column tracking
 */
export function tokenize(src) {
  const tokens = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const isDigit = c => c >= '0' && c <= '9';
  const isIdStart = c => /[A-Za-z_]/.test(c);
  const isIdPart = c => /[A-Za-z0-9_]/.test(c);
  const multi = ['->', '::', '<<', '>>', '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-='];

  while (i < src.length) {
    const c = src[i];

    // Newlines
    if (c === '\n') {
      line++;
      col = 1;
      i++;
      continue;
    }

    // Whitespace
    if (/\s/.test(c)) {
      i++;
      col++;
      continue;
    }

    // Single-line comments
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') {
        i++;
      }
      continue;
    }

    // Multi-line comments
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      col += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') {
          line++;
          col = 1;
        } else {
          col++;
        }
        i++;
      }
      if (i < src.length) {
        i += 2;
        col += 2;
      }
      continue;
    }

    // Preprocessor directives (e.g. #include <iostream>)
    if (c === '#') {
      while (i < src.length && src[i] !== '\n') {
        i++;
      }
      continue;
    }

    const startCol = col;

    // String literals
    if (c === '"') {
      let str = '';
      i++;
      col++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\' && i + 1 < src.length) {
          const esc = src[i + 1];
          if (esc === 'n') str += '\n';
          else if (esc === 't') str += '\t';
          else if (esc === '\\') str += '\\';
          else if (esc === '"') str += '"';
          else str += esc;
          i += 2;
          col += 2;
        } else {
          if (src[i] === '\n') { line++; col = 1; }
          else { col++; }
          str += src[i];
          i++;
        }
      }
      if (i < src.length) { i++; col++; } // skip closing "
      tokens.push({ type: 'string', value: str, line, col: startCol });
      continue;
    }

    // Character literals
    if (c === "'") {
      let ch = '';
      i++;
      col++;
      if (i < src.length && src[i] === '\\') {
        const esc = src[i + 1];
        if (esc === 'n') ch = '\n';
        else if (esc === 't') ch = '\t';
        else if (esc === '\\') ch = '\\';
        else if (esc === "'") ch = "'";
        else ch = esc;
        i += 2;
        col += 2;
      } else if (i < src.length) {
        ch = src[i];
        i++;
        col++;
      }
      if (i < src.length && src[i] === "'") { i++; col++; }
      tokens.push({ type: 'num', value: ch.charCodeAt(0) || 0, line, col: startCol });
      continue;
    }

    // Numbers
    if (isDigit(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const numStr = src.slice(i, j);
      tokens.push({ type: 'num', value: parseFloat(numStr), line, col: startCol });
      col += (j - i);
      i = j;
      continue;
    }

    // Identifiers & Keywords
    if (isIdStart(c)) {
      let j = i;
      while (j < src.length && isIdPart(src[j])) j++;
      const idStr = src.slice(i, j);
      tokens.push({ type: 'id', value: idStr, line, col: startCol });
      col += (j - i);
      i = j;
      continue;
    }

    // Multi-character operators
    let matched = false;
    for (const m of multi) {
      if (src.startsWith(m, i)) {
        tokens.push({ type: 'punct', value: m, line, col: startCol });
        i += m.length;
        col += m.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Single character punctuation
    tokens.push({ type: 'punct', value: c, line, col: startCol });
    i++;
    col++;
  }

  tokens.push({ type: 'eof', value: null, line, col });
  return tokens;
}
