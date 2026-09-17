/**
 * C++ Parser (Recursive Descent AST Generator)
 */

export class ParseError extends Error {
  constructor(message, line, col) {
    super(message);
    this.name = 'ParseError';
    this.line = line;
    this.col = col;
  }
}

const KNOWN_TYPES = new Set([
  'int', 'bool', 'void', 'long', 'double', 'float',
  'ListNode', 'TreeNode', 'DoublyListNode', 'auto', 'char', 'unsigned', 'size_t'
]);

function peek(p) {
  return p.tokens[Math.min(p.pos, p.tokens.length - 1)];
}

function next(p) {
  const t = peek(p);
  if (p.pos < p.tokens.length - 1) p.pos++;
  return t;
}

function expect(p, value) {
  const t = peek(p);
  if (t.value !== value) {
    throw new ParseError(
      `Expected '${value}' but found '${t.value === null ? 'EOF' : t.value}'`,
      t.line,
      t.col
    );
  }
  return next(p);
}

function expectNotEOF(p) {
  const t = peek(p);
  if (t.type === 'eof') {
    throw new ParseError('Unexpected end of code', t.line, t.col);
  }
}

export function parseProgram(tokens) {
  const p = { tokens, pos: 0 };
  const functions = {};
  const structs = {};
  const order = [];
  const topLevelStmts = [];

  while (peek(p).type !== 'eof') {
    const t = peek(p);
    if (t.value === 'struct' || t.value === 'class') {
      try {
        const s = parseStruct(p);
        structs[s.name] = s;
        KNOWN_TYPES.add(s.name);
      } catch (err) {
        skipToSync(p);
      }
      continue;
    }

    const save = p.pos;
    try {
      const fn = parseFunctionDecl(p);
      functions[fn.name] = fn;
      order.push(fn.name);
      continue;
    } catch (e) {
      p.pos = save;
    }

    // Attempt to parse as top-level statement (for zero-boilerplate script mode)
    try {
      const stmt = parseStmt(p);
      topLevelStmts.push(stmt);
    } catch (err) {
      p.pos = save;
      next(p); // Skip one token to resynchronize
    }
  }

  // If top-level statements were written without a function wrapper, synthesize main()
  if (topLevelStmts.length > 0) {
    functions['main'] = {
      name: 'main',
      params: [],
      body: topLevelStmts,
      retType: { name: 'void', pointer: false },
      line: topLevelStmts[0].line,
      col: 1
    };
    order.unshift('main');
  }

  if (Object.keys(functions).length === 0 && tokens.length > 1) {
    const firstErr = tokens[0];
    throw new ParseError('Incomplete or invalid C++ syntax.', firstErr.line, firstErr.col);
  }

  return { functions, structs, order };
}

function skipToSync(p) {
  while (peek(p).type !== 'eof') {
    const t = next(p);
    if (t.value === ';') break;
  }
}

function parseStruct(p) {
  next(p); // 'struct' or 'class'
  const nameTok = next(p);
  if (nameTok.type !== 'id') {
    throw new ParseError('Expected struct name', nameTok.line, nameTok.col);
  }
  expect(p, '{');
  let depth = 1;
  while (depth > 0) {
    expectNotEOF(p);
    const t = next(p);
    if (t.value === '{') depth++;
    else if (t.value === '}') depth--;
  }
  if (peek(p).value === ';') next(p);
  return { name: nameTok.value };
}

function parseType(p) {
  const t = next(p);
  if (t.type !== 'id') {
    throw new ParseError(`Expected type name near line ${t.line}`, t.line, t.col);
  }
  let pointer = false;
  let reference = false;
  while (peek(p).value === '*' || peek(p).value === '&') {
    const op = next(p).value;
    if (op === '*') pointer = true;
    if (op === '&') reference = true;
  }
  return { name: t.value, pointer, reference, line: t.line, col: t.col };
}

function parseFunctionDecl(p) {
  const retType = parseType(p);
  const nameTok = next(p);
  if (nameTok.type !== 'id') {
    throw new ParseError('Expected function name', nameTok.line, nameTok.col);
  }
  expect(p, '(');
  const params = [];
  while (peek(p).value !== ')') {
    expectNotEOF(p);
    const t = parseType(p);
    const n = next(p);
    if (n.type !== 'id') {
      throw new ParseError('Expected parameter name', n.line, n.col);
    }
    params.push({ type: t, name: n.value, line: n.line });
    if (peek(p).value === ',') next(p);
    else break;
  }
  expect(p, ')');
  const body = parseBlock(p);
  return { name: nameTok.value, params, body, retType, line: nameTok.line, col: nameTok.col };
}

function parseBlock(p) {
  expect(p, '{');
  const stmts = [];
  while (peek(p).value !== '}') {
    expectNotEOF(p);
    stmts.push(parseStmt(p));
  }
  expect(p, '}');
  return stmts;
}

function parseArgList(p) {
  const args = [];
  while (peek(p).value !== ')') {
    expectNotEOF(p);
    args.push(parseExpr(p));
    if (peek(p).value === ',') next(p);
    else break;
  }
  return args;
}

function parseStmt(p) {
  const t = peek(p);
  if (t.value === '{') return { type: 'Block', body: parseBlock(p), line: t.line };
  if (t.value === 'if') return parseIf(p);
  if (t.value === 'while') return parseWhile(p);
  if (t.value === 'for') return parseFor(p);
  if (t.value === 'do') return parseDoWhile(p);
  if (t.value === 'return') {
    const line = next(p).line;
    let expr = null;
    if (peek(p).value !== ';') expr = parseExpr(p);
    expect(p, ';');
    return { type: 'Return', expr, line };
  }
  if (t.value === 'delete') {
    const line = next(p).line;
    const expr = parseExpr(p);
    expect(p, ';');
    return { type: 'Delete', expr, line };
  }
  if (t.value === 'break') {
    const line = next(p).line;
    expect(p, ';');
    return { type: 'Break', line };
  }
  if (t.value === 'continue') {
    const line = next(p).line;
    expect(p, ';');
    return { type: 'Continue', line };
  }

  // Variable declaration check
  if (t.type === 'id' && KNOWN_TYPES.has(t.value)) {
    return parseVarDeclStmt(p);
  }

  const line = t.line;
  const expr = parseExpr(p);
  expect(p, ';');
  return { type: 'ExprStmt', expr, line };
}

function parseVarDeclStmt(p) {
  const line = peek(p).line;
  const varType = parseType(p);
  const nameTok = next(p);
  if (nameTok.type !== 'id') {
    throw new ParseError('Expected variable name', nameTok.line, nameTok.col);
  }

  let init = null;
  let ctorArgs = null;
  if (peek(p).value === '(') {
    next(p);
    ctorArgs = parseArgList(p);
    expect(p, ')');
  } else if (peek(p).value === '=') {
    next(p);
    init = parseExpr(p);
  }

  const decls = [{ name: nameTok.value, init, ctorArgs, isPointer: varType.pointer }];

  // Support multiple declarations in same statement: ListNode *p = head, *q = nullptr;
  while (peek(p).value === ',') {
    next(p);
    let subPointer = varType.pointer;
    if (peek(p).value === '*') {
      next(p);
      subPointer = true;
    }
    const subNameTok = next(p);
    if (subNameTok.type !== 'id') throw new ParseError('Expected variable name after comma', subNameTok.line, subNameTok.col);
    let subInit = null, subCtor = null;
    if (peek(p).value === '(') {
      next(p);
      subCtor = parseArgList(p);
      expect(p, ')');
    } else if (peek(p).value === '=') {
      next(p);
      subInit = parseExpr(p);
    }
    decls.push({ name: subNameTok.value, init: subInit, ctorArgs: subCtor, isPointer: subPointer });
  }

  expect(p, ';');
  return { type: 'VarDeclGroup', varType, decls, line };
}

function parseIf(p) {
  const line = next(p).line;
  expect(p, '(');
  const cond = parseExpr(p);
  expect(p, ')');
  const thenStmt = parseStmt(p);
  let elseStmt = null;
  if (peek(p).value === 'else') {
    next(p);
    elseStmt = parseStmt(p);
  }
  return { type: 'If', cond, thenStmt, elseStmt, line };
}

function parseWhile(p) {
  const line = next(p).line;
  expect(p, '(');
  const cond = parseExpr(p);
  expect(p, ')');
  const body = parseStmt(p);
  return { type: 'While', cond, body, line };
}

function parseForInit(p) {
  if (peek(p).type === 'id' && KNOWN_TYPES.has(peek(p).value)) {
    return parseVarDeclStmt(p); // parseVarDeclStmt consumes the trailing ';'
  }
  const line = peek(p).line;
  const expr = parseExpr(p);
  expect(p, ';');
  return { type: 'ExprStmt', expr, line };
}

function parseFor(p) {
  const line = next(p).line;
  expect(p, '(');
  let init = null;
  if (peek(p).value === ';') {
    next(p);
  } else {
    init = parseForInit(p);
  }
  let cond = null;
  if (peek(p).value !== ';') cond = parseExpr(p);
  expect(p, ';');
  let step = null;
  if (peek(p).value !== ')') step = parseExpr(p);
  expect(p, ')');
  const body = parseStmt(p);
  return { type: 'For', init, cond, step, body, line };
}

function parseDoWhile(p) {
  const line = next(p).line; // consume 'do'
  const body = parseStmt(p);
  expect(p, 'while');
  expect(p, '(');
  const cond = parseExpr(p);
  expect(p, ')');
  expect(p, ';');
  return { type: 'DoWhile', cond, body, line };
}

function parseExpr(p) {
  return parseAssignment(p);
}

function parseAssignment(p) {
  const left = parseTernary(p);
  const v = peek(p).value;
  if (v === '=' || v === '+=' || v === '-=') {
    const op = next(p).value;
    const right = parseAssignment(p);
    return { type: 'Assign', op, left, right, line: left.line };
  }
  return left;
}

function parseTernary(p) {
  const cond = parseLogicalOr(p);
  if (peek(p).value === '?') {
    next(p);
    const thenExpr = parseExpr(p);
    expect(p, ':');
    const elseExpr = parseTernary(p);
    return { type: 'Ternary', cond, thenExpr, elseExpr, line: cond.line };
  }
  return cond;
}

function parseLogicalOr(p) {
  let left = parseLogicalAnd(p);
  while (peek(p).value === '||') {
    next(p);
    const right = parseLogicalAnd(p);
    left = { type: 'Logical', op: '||', left, right, line: left.line };
  }
  return left;
}

function parseLogicalAnd(p) {
  let left = parseEquality(p);
  while (peek(p).value === '&&') {
    next(p);
    const right = parseEquality(p);
    left = { type: 'Logical', op: '&&', left, right, line: left.line };
  }
  return left;
}

function parseEquality(p) {
  let left = parseRelational(p);
  while (peek(p).value === '==' || peek(p).value === '!=') {
    const op = next(p).value;
    const right = parseRelational(p);
    left = { type: 'Binary', op, left, right, line: left.line };
  }
  return left;
}

function parseRelational(p) {
  let left = parseAdditive(p);
  while (['<', '>', '<=', '>='].includes(peek(p).value)) {
    const op = next(p).value;
    const right = parseAdditive(p);
    left = { type: 'Binary', op, left, right, line: left.line };
  }
  return left;
}

function parseAdditive(p) {
  let left = parseMultiplicative(p);
  while (peek(p).value === '+' || peek(p).value === '-') {
    const op = next(p).value;
    const right = parseMultiplicative(p);
    left = { type: 'Binary', op, left, right, line: left.line };
  }
  return left;
}

function parseMultiplicative(p) {
  let left = parseUnary(p);
  while (['*', '/', '%'].includes(peek(p).value)) {
    const op = next(p).value;
    const right = parseUnary(p);
    left = { type: 'Binary', op, left, right, line: left.line };
  }
  return left;
}

function parseUnary(p) {
  const v = peek(p).value;
  if (v === '!') {
    const line = next(p).line;
    const arg = parseUnary(p);
    return { type: 'Unary', op: '!', arg, line };
  }
  if (v === '-') {
    const line = next(p).line;
    const arg = parseUnary(p);
    return { type: 'Unary', op: '-', arg, line };
  }
  if (v === '&') {
    const line = next(p).line;
    const arg = parseUnary(p);
    return { type: 'AddressOf', arg, line };
  }
  if (v === '*') {
    const line = next(p).line;
    const arg = parseUnary(p);
    return { type: 'Deref', arg, line };
  }
  if (v === '++' || v === '--') {
    const op = next(p).value;
    const line = peek(p).line;
    const arg = parseUnary(p);
    return { type: 'PreIncDec', op, arg, line };
  }
  return parsePostfix(p);
}

function parsePostfix(p) {
  let expr = parsePrimary(p);
  while (true) {
    const v = peek(p).value;
    if (v === '->' || v === '.') {
      next(p);
      const f = next(p);
      if (f.type !== 'id') {
        throw new ParseError(`Expected field name after '${v}'`, f.line, f.col);
      }
      expr = { type: 'Member', obj: expr, field: f.value, line: expr.line };
    } else if (v === '(') {
      next(p);
      const args = parseArgList(p);
      expect(p, ')');
      expr = { type: 'Call', callee: expr, args, line: expr.line };
    } else if (v === '++' || v === '--') {
      next(p);
      expr = { type: 'PostIncDec', op: v, arg: expr, line: expr.line };
    } else {
      break;
    }
  }
  return expr;
}

function parsePrimary(p) {
  const t = peek(p);
  if (t.type === 'num') {
    next(p);
    return { type: 'Num', value: t.value, line: t.line };
  }
  if (t.type === 'string') {
    next(p);
    return { type: 'String', value: t.value, line: t.line };
  }
  if (t.value === 'nullptr' || t.value === 'NULL') {
    next(p);
    return { type: 'Null', line: t.line };
  }
  if (t.value === 'true') {
    next(p);
    return { type: 'Bool', value: true, line: t.line };
  }
  if (t.value === 'false') {
    next(p);
    return { type: 'Bool', value: false, line: t.line };
  }
  if (t.value === 'new') {
    next(p);
    const typeTok = next(p);
    let args = [];
    if (peek(p).value === '(') {
      next(p);
      args = parseArgList(p);
      expect(p, ')');
    }
    return { type: 'New', typeName: typeTok.value, args, line: t.line };
  }
  if (t.value === '(') {
    next(p);
    const e = parseExpr(p);
    expect(p, ')');
    return e;
  }
  if (t.type === 'id') {
    next(p);
    return { type: 'Ident', name: t.value, line: t.line };
  }
  throw new ParseError(`Unexpected token '${t.value}'`, t.line, t.col);
}
