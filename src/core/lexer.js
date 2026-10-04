export function preprocessMacros(src) {
  if (!src || !src.includes('#define')) return src;
  const lines = src.split('\n');
  const defines = [];
  const cleanLines = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#define')) {
      const matchMacro = trimmed.match(/^#define\s+([A-Za-z0-9_]+)\(([^)]+)\)\s+(.*)$/);
      if (matchMacro) {
        const args = matchMacro[2].split(',').map(s => s.trim());
        defines.push({ name: matchMacro[1], args, body: matchMacro[3].trim() });
      } else {
        const matchConst = trimmed.match(/^#define\s+([A-Za-z0-9_]+)\s+(.*)$/);
        if (matchConst) {
          defines.push({ name: matchConst[1], args: null, body: matchConst[2].trim() });
        }
      }
      cleanLines.push('// [MACRO] ' + line);
    } else {
      cleanLines.push(line);
    }
  }

  return cleanLines.map(line => {
    if (line.startsWith('// [MACRO]')) return line;
    let res = line;
    for (const def of defines) {
      if (def.args) {
        const regex = new RegExp('\\b' + def.name + '\\(([^)]+)\\)', 'g');
        res = res.replace(regex, (m, argStr) => {
          const actualArgs = argStr.split(',').map(s => s.trim());
          let resBody = def.body;
          def.args.forEach((formal, idx) => {
            const val = actualArgs[idx] || '';
            resBody = resBody.replace(new RegExp('\\b' + formal + '\\b', 'g'), val);
          });
          return resBody;
        });
      } else {
        const regex = new RegExp('\\b' + def.name + '\\b', 'g');
        res = res.replace(regex, def.body);
      }
    }
    return res;
  }).join('\n');
}

/**
 * C++ Lexer with line and column tracking
 */
export function tokenize(src) {
  src = preprocessMacros(src);
  const tokens = [];
  let i = 0;
  let line = 1;
  let col = 1;

  const isDigit = c => c >= '0' && c <= '9';
  const isIdStart = c => /[A-Za-z_]/.test(c);
  const isIdPart = c => /[A-Za-z0-9_]/.test(c);
  const multi = [
    '<<=', '>>=',
    '->', '::', '<<', '>>', '==', '!=', '<=', '>=', '&&', '||', '++', '--',
    '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^='
  ];

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

    // Preprocessor directives (e.g. #include <iostream>, #pragma)
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
      tokens.push({ type: 'char', value: ch, numValue: ch.charCodeAt(0) || 0, line, col: startCol });
      continue;
    }

    // Numbers: hex (0x...), binary (0b...), decimal, scientific (1e9, 2.5e-3), and suffixes (LL, ULL, f)
    if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
      let j = i;
      if (src[i] === '0' && (src[i + 1] === 'x' || src[i + 1] === 'X')) {
        j += 2;
        while (j < src.length && /[0-9a-fA-F]/.test(src[j])) j++;
      } else if (src[i] === '0' && (src[i + 1] === 'b' || src[i + 1] === 'B')) {
        j += 2;
        while (j < src.length && /[01]/.test(src[j])) j++;
      } else {
        while (j < src.length && /[0-9.]/.test(src[j])) j++;
        if (j < src.length && (src[j] === 'e' || src[j] === 'E')) {
          j++;
          if (j < src.length && (src[j] === '+' || src[j] === '-')) j++;
          while (j < src.length && /[0-9]/.test(src[j])) j++;
        }
      }
      const rawNum = src.slice(i, j);
      let parsedNum = Number(rawNum);
      if (isNaN(parsedNum)) {
        parsedNum = parseFloat(rawNum) || 0;
      }
      // Consume integer/float suffixes (e.g. LL, ULL, L, U, f)
      while (j < src.length && /[uUlLfF]/.test(src[j])) {
        j++;
      }
      tokens.push({ type: 'num', value: parsedNum, line, col: startCol });
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
