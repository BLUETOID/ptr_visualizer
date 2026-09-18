/**
 * C++ Step Interpreter with Virtual Heap, Stack Frames, and Memory Safety Checks
 */

export class InterpError extends Error {
  constructor(msg, line) {
    super(msg);
    this.name = 'InterpError';
    this.line = line;
  }
}

export class NullDerefError extends InterpError {}
export class DanglingPointerError extends InterpError {}
export class StepLimitError extends Error {}
export class ReturnSignal { constructor(value) { this.value = value; } }
export class BreakSignal {}
export class ContinueSignal {}

const MAX_STEPS = 250;

let heap = {};
let heapCounter = 0;
let colCounters = { left: -1, right: 0 };
let frames = [];
let timeline = [];
let lastRecordedLine = 1;
let knownFunctions = {};

export function resetEngineState(builtHeap = {}, builtCounter = 0, colRight = 0) {
  heap = JSON.parse(JSON.stringify(builtHeap));
  heapCounter = builtCounter;
  colCounters = { left: -1, right: colRight };
  frames = [];
  timeline = [];
  lastRecordedLine = 1;
  knownFunctions = {};
}

export function allocNode(structType, val = 0, opts = {}) {
  const id = 'n' + (heapCounter++);
  const node = {
    id,
    structType: structType || 'ListNode',
    val: val !== undefined ? val : 0,
    stackAllocated: !!opts.stackAllocated,
    label: opts.label || null,
    freed: false
  };

  if (structType === 'TreeNode') {
    node.left = null;
    node.right = null;
  } else if (structType === 'DoublyListNode') {
    node.prev = null;
    node.next = null;
    node.col = opts.stackAllocated ? colCounters.left-- : colCounters.right++;
  } else {
    // Default ListNode
    node.next = null;
    node.col = opts.stackAllocated ? colCounters.left-- : colCounters.right++;
  }

  heap[id] = node;
  return id;
}

export function freeNode(id, line) {
  if (!id || !heap[id]) {
    throw new InterpError(`Cannot delete invalid pointer '${id}'`, line);
  }
  if (heap[id].freed) {
    throw new InterpError(`Double free detected: memory at '${id}' was already deleted!`, line);
  }
  if (heap[id].stackAllocated) {
    throw new InterpError(`Cannot delete stack-allocated object '${heap[id].label || id}'`, line);
  }
  heap[id].freed = true;
  heap[id].freedAtLine = line;
}

function getVar(name) {
  for (let i = frames.length - 1; i >= 0; i--) {
    if (name in frames[i].vars) {
      return frames[i].vars[name];
    }
  }
  return undefined;
}

function setVar(name, value, kind) {
  const curFrame = frames[frames.length - 1];
  curFrame.vars[name] = { value, kind };
}

function truthy(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  return true;
}

export function valueDesc(v) {
  if (v === null || v === undefined) return 'nullptr';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') {
    const n = heap[v];
    if (n) {
      if (n.freed) return `[freed: ${v}]`;
      return `&${n.label || v} (val=${n.val})`;
    }
    return v;
  }
  return String(v);
}

export function exprToStr(n) {
  if (!n) return '';
  switch (n.type) {
    case 'Num': return String(n.value);
    case 'Bool': return String(n.value);
    case 'Null': return 'nullptr';
    case 'String': return `"${n.value}"`;
    case 'Ident': return n.name;
    case 'Member': return `${exprToStr(n.obj)}->${n.field}`;
    case 'AddressOf': return `&${exprToStr(n.arg)}`;
    case 'Deref': return `*${exprToStr(n.arg)}`;
    case 'New': return `new ${n.typeName}(${n.args.map(exprToStr).join(', ')})`;
    case 'Call': return `${exprToStr(n.callee)}(${n.args.map(exprToStr).join(', ')})`;
    case 'Unary': return `${n.op}${exprToStr(n.arg)}`;
    case 'Logical': return `${exprToStr(n.left)} ${n.op} ${exprToStr(n.right)}`;
    case 'Binary': return `${exprToStr(n.left)} ${n.op} ${exprToStr(n.right)}`;
    case 'Assign': return `${exprToStr(n.left)} ${n.op} ${exprToStr(n.right)}`;
    case 'Ternary': return `${exprToStr(n.cond)} ? ${exprToStr(n.thenExpr)} : ${exprToStr(n.elseExpr)}`;
    case 'PreIncDec': return `${n.op}${exprToStr(n.arg)}`;
    case 'PostIncDec': return `${exprToStr(n.arg)}${n.op}`;
    default: return '?';
  }
}

/**
 * Scan heap and identify unreachable allocated nodes (memory leaks)
 */
function findMemoryLeaks() {
  const reachable = new Set();
  const queue = [];

  // Roots: all pointer variables in all active frames
  frames.forEach(f => {
    Object.values(f.vars).forEach(v => {
      if (v.kind === 'pointer' && typeof v.value === 'string' && heap[v.value] && !heap[v.value].freed) {
        if (!reachable.has(v.value)) {
          reachable.add(v.value);
          queue.push(v.value);
        }
      }
    });
  });

  // BFS traverse outgoing edges
  while (queue.length > 0) {
    const curId = queue.shift();
    const node = heap[curId];
    if (!node || node.freed) continue;

    const neighbors = [];
    if (node.next) neighbors.push(node.next);
    if (node.prev) neighbors.push(node.prev);
    if (node.left) neighbors.push(node.left);
    if (node.right) neighbors.push(node.right);

    for (const nxt of neighbors) {
      if (typeof nxt === 'string' && heap[nxt] && !heap[nxt].freed && !reachable.has(nxt)) {
        reachable.add(nxt);
        queue.push(nxt);
      }
    }
  }

  const leaks = [];
  Object.values(heap).forEach(node => {
    if (!node.freed && !node.stackAllocated && !reachable.has(node.id)) {
      leaks.push(node.id);
    }
  });

  return leaks;
}

function record(line, explanation, meta = {}) {
  lastRecordedLine = line;
  const leaks = findMemoryLeaks();

  timeline.push({
    lineIndex: line,
    heap: JSON.parse(JSON.stringify(heap)),
    frames: JSON.parse(JSON.stringify(frames)),
    explanation,
    meta: {
      ...meta,
      leaks
    }
  });

  if (timeline.length >= MAX_STEPS) {
    throw new StepLimitError(`Loop step limit (${MAX_STEPS}) reached. Stopped to avoid freeze.`);
  }
}

function evalExpr(node) {
  switch (node.type) {
    case 'Num': return node.value;
    case 'Bool': return node.value;
    case 'Null': return null;
    case 'String': return node.value;
    case 'Ternary': return truthy(evalExpr(node.cond)) ? evalExpr(node.thenExpr) : evalExpr(node.elseExpr);
    case 'Ident': {
      if (node.name === 'null' || node.name === 'NULL' || node.name === 'nullptr') return null;
      if (node.name === 'cout' || node.name === 'std::cout') {
        return { isStream: true, buffer: [] };
      }
      if (node.name === 'endl' || node.name === 'std::endl') {
        return '\n';
      }
      const v = getVar(node.name);
      if (!v) throw new InterpError(`Undefined variable '${node.name}'`, node.line);
      return v.value;
    }
    case 'Member': {
      const base = evalExpr(node.obj);
      if (base === null || base === undefined) {
        throw new NullDerefError(`Null Pointer Dereference: '${exprToStr(node.obj)}' is nullptr!`, node.line);
      }
      const n = heap[base];
      if (!n) throw new InterpError(`Invalid memory address '${base}'`, node.line);
      if (n.freed) {
        throw new DanglingPointerError(
          `Dangling Pointer Error: accessing freed node '${base}' via '${exprToStr(node.obj)}->${node.field}'`,
          node.line
        );
      }
      if (!(node.field in n)) {
        throw new InterpError(`Type '${n.structType}' has no field '${node.field}'`, node.line);
      }
      return n[node.field];
    }
    case 'AddressOf': return evalExpr(node.arg);
    case 'Deref': return evalExpr(node.arg);
    case 'New': {
      const args = node.args.map(evalExpr);
      return allocNode(node.typeName, args.length ? args[0] : 0, {});
    }
    case 'Call': {
      if (node.callee.type !== 'Ident') throw new InterpError('Function pointers not supported', node.line);
      const fn = knownFunctions[node.callee.name];
      if (!fn) throw new InterpError(`Undefined function '${node.callee.name}'`, node.line);
      const args = node.args.map(evalExpr);
      return callFunction(fn, args, node.line);
    }
    case 'Unary': {
      const v = evalExpr(node.arg);
      if (node.op === '!') return !truthy(v);
      if (node.op === '-') return -v;
      break;
    }
    case 'Logical': {
      const l = evalExpr(node.left);
      if (node.op === '&&') return truthy(l) ? truthy(evalExpr(node.right)) : false;
      return truthy(l) ? true : truthy(evalExpr(node.right));
    }
    case 'Binary': {
      const l = evalExpr(node.left);
      if (node.op === '<<') {
        if (l && l.isStream) {
          const r = evalExpr(node.right);
          let text = '';
          if (r === null || r === undefined) text = 'nullptr';
          else if (typeof r === 'object' && r.isStream) text = '';
          else text = String(r);
          l.buffer.push(text);
          return l;
        }
        const r = evalExpr(node.right);
        return Number(l) << Number(r);
      }
      if (node.op === '>>') {
        const r = evalExpr(node.right);
        return Number(l) >> Number(r);
      }
      const r = evalExpr(node.right);
      switch (node.op) {
        case '==': return l === r;
        case '!=': return l !== r;
        case '<': return l < r;
        case '>': return l > r;
        case '<=': return l <= r;
        case '>=': return l >= r;
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return r === 0 ? 0 : Math.trunc(l / r);
        case '%': return r === 0 ? 0 : l % r;
      }
      break;
    }
    case 'Assign': {
      let val = evalExpr(node.right);
      if (node.op === '+=') val = evalExpr(node.left) + val;
      if (node.op === '-=') val = evalExpr(node.left) - val;
      assignTo(node.left, val, node.line);
      return val;
    }
    case 'PreIncDec': {
      const old = evalExpr(node.arg);
      const nv = node.op === '++' ? old + 1 : old - 1;
      assignTo(node.arg, nv, node.line);
      return nv;
    }
    case 'PostIncDec': {
      const old = evalExpr(node.arg);
      const nv = node.op === '++' ? old + 1 : old - 1;
      assignTo(node.arg, nv, node.line);
      return old;
    }
  }
  throw new InterpError('Cannot evaluate expression', node.line);
}

function assignTo(node, value, line) {
  if (node.type === 'Ident') {
    const existing = getVar(node.name);
    if (existing) {
      existing.value = value;
    } else {
      setVar(node.name, value, typeof value === 'number' ? 'scalar' : 'pointer');
    }
    return;
  }
  if (node.type === 'Member') {
    const base = evalExpr(node.obj);
    if (base === null || base === undefined) {
      throw new NullDerefError(`Null Pointer Dereference: cannot assign to '${exprToStr(node.obj)}->${node.field}'`, line);
    }
    const n = heap[base];
    if (!n) throw new InterpError('Invalid pointer target', line);
    if (n.freed) {
      throw new DanglingPointerError(`Dangling Pointer Error: cannot assign to deleted node '${base}'`, line);
    }
    n[node.field] = value;
    return;
  }
  throw new InterpError('Invalid lvalue assignment target', line);
}

function execVarDeclGroup(stmt) {
  for (const decl of stmt.decls) {
    let value, kind, desc, highlight = [];
    if (decl.ctorArgs) {
      const args = decl.ctorArgs.map(evalExpr);
      const id = allocNode(stmt.varType.name, args.length ? args[0] : 0, {
        stackAllocated: true,
        label: decl.name
      });
      value = id;
      kind = 'pointer';
      desc = `Stack node '${decl.name}' created (${stmt.varType.name}, val=${heap[id].val})`;
      highlight = [id];
    } else if (decl.isPointer || stmt.varType.pointer) {
      value = decl.init ? evalExpr(decl.init) : null;
      kind = 'pointer';
      desc = `${decl.name} = ${decl.init ? exprToStr(decl.init) : 'nullptr'} → ${valueDesc(value)}`;
      if (typeof value === 'string') highlight = [value];
    } else {
      value = decl.init ? evalExpr(decl.init) : 0;
      kind = 'scalar';
      desc = `${stmt.varType.name} ${decl.name} = ${valueDesc(value)}`;
    }
    setVar(decl.name, value, kind);
    record(stmt.line, desc, { highlight });
  }
}

function execExprStmt(stmt) {
  const expr = stmt.expr;
  if (expr.type === 'Assign') {
    const rightVal = evalExpr(expr.right);
    let newVal = rightVal;
    if (expr.op === '+=') newVal = evalExpr(expr.left) + rightVal;
    if (expr.op === '-=') newVal = evalExpr(expr.left) - rightVal;
    const leftStr = exprToStr(expr.left);
    let baseId = null, field = null;
    if (expr.left.type === 'Member') {
      baseId = evalExpr(expr.left.obj);
      field = expr.left.field;
    }
    assignTo(expr.left, newVal, stmt.line);
    const highlight = [];
    if (typeof newVal === 'string') highlight.push(newVal);
    if (baseId) highlight.push(baseId);

    record(stmt.line, `${leftStr} ${expr.op} ${valueDesc(rightVal)}  →  now ${valueDesc(newVal)}`, {
      highlight,
      changedEdge: baseId ? { id: baseId, field } : null
    });
  } else if (expr.type === 'PreIncDec' || expr.type === 'PostIncDec') {
    evalExpr(expr);
    record(stmt.line, `${exprToStr(expr)}`, {});
  } else {
    const res = evalExpr(expr);
    if (res && res.isStream) {
      const out = res.buffer.join('');
      record(stmt.line, `cout << ${out}`, { output: out });
    } else {
      record(stmt.line, `Executed: ${exprToStr(expr)}`, {});
    }
  }
}

function execDelete(stmt) {
  const ptrVal = evalExpr(stmt.expr);
  if (ptrVal === null || ptrVal === undefined) {
    record(stmt.line, `delete nullptr (no-op)`, {});
    return;
  }
  freeNode(ptrVal, stmt.line);
  record(stmt.line, `delete ${exprToStr(stmt.expr)}: freed memory at [${ptrVal}]`, {
    highlight: [ptrVal],
    freedNode: ptrVal
  });
}

function execStmtOrBlock(s) {
  if (s.type === 'Block') s.body.forEach(executeStmt);
  else executeStmt(s);
}

function execIf(stmt) {
  const condVal = truthy(evalExpr(stmt.cond));
  record(stmt.line, `if (${exprToStr(stmt.cond)}) → ${condVal}`, { kind: 'condition' });
  if (condVal) execStmtOrBlock(stmt.thenStmt);
  else if (stmt.elseStmt) execStmtOrBlock(stmt.elseStmt);
}

function execWhile(stmt) {
  while (true) {
    const condVal = truthy(evalExpr(stmt.cond));
    record(stmt.line, `while (${exprToStr(stmt.cond)}) → ${condVal}`, { kind: 'condition' });
    if (!condVal) break;
    try {
      execStmtOrBlock(stmt.body);
    } catch (e) {
      if (e instanceof BreakSignal) break;
      if (e instanceof ContinueSignal) continue;
      throw e;
    }
  }
}

function execFor(stmt) {
  if (stmt.init) executeStmt(stmt.init);
  while (true) {
    let condVal = true;
    if (stmt.cond) {
      condVal = truthy(evalExpr(stmt.cond));
      record(stmt.line, `for condition: ${exprToStr(stmt.cond)} → ${condVal}`, { kind: 'condition' });
    }
    if (!condVal) break;
    try {
      execStmtOrBlock(stmt.body);
    } catch (e) {
      if (e instanceof BreakSignal) break;
      if (!(e instanceof ContinueSignal)) throw e;
    }
    if (stmt.step) {
      evalExpr(stmt.step);
      record(stmt.line, `Step: ${exprToStr(stmt.step)}`, { kind: 'step' });
    }
  }
}

function execDoWhile(stmt) {
  while (true) {
    try {
      execStmtOrBlock(stmt.body);
    } catch (e) {
      if (e instanceof BreakSignal) break;
      if (e instanceof ContinueSignal) { /* fall through to condition check */ }
      else throw e;
    }
    const condVal = truthy(evalExpr(stmt.cond));
    record(stmt.line, `do...while (${exprToStr(stmt.cond)}) → ${condVal}`, { kind: 'condition' });
    if (!condVal) break;
  }
}

function execReturn(stmt) {
  const val = stmt.expr ? evalExpr(stmt.expr) : null;
  record(stmt.line, `return ${valueDesc(val)}`, {
    kind: 'return',
    highlight: typeof val === 'string' ? [val] : []
  });
  throw new ReturnSignal(val);
}

function executeStmt(stmt) {
  switch (stmt.type) {
    case 'VarDeclGroup': return execVarDeclGroup(stmt);
    case 'ExprStmt': return execExprStmt(stmt);
    case 'Delete': return execDelete(stmt);
    case 'If': return execIf(stmt);
    case 'While': return execWhile(stmt);
    case 'For': return execFor(stmt);
    case 'DoWhile': return execDoWhile(stmt);
    case 'Return': return execReturn(stmt);
    case 'Block': stmt.body.forEach(executeStmt); return;
    case 'Break': throw new BreakSignal();
    case 'Continue': throw new ContinueSignal();
    default: throw new InterpError('Unsupported statement type', stmt.line);
  }
}

function callFunction(fn, argVals, callLine) {
  if (frames.length > 50) throw new StepLimitError('Recursion stack overflow (max depth 50)');
  frames.push({ name: fn.name, vars: {} });
  fn.params.forEach((param, i) => {
    setVar(param.name, argVals[i], param.type.pointer ? 'pointer' : 'scalar');
  });

  record(
    fn.body.length ? fn.body[0].line : callLine,
    `→ Call ${fn.name}(${fn.params.map((pp, i) => `${pp.name}=${valueDesc(argVals[i])}`).join(', ')})`,
    { frameChange: true }
  );

  let retVal = null;
  try {
    fn.body.forEach(executeStmt);
  } catch (e) {
    if (e instanceof ReturnSignal) {
      retVal = e.value;
    } else {
      frames.pop();
      throw e;
    }
  }

  record(callLine, `← Return from ${fn.name} with ${valueDesc(retVal)}`, {
    frameChange: true,
    highlight: typeof retVal === 'string' ? [retVal] : []
  });

  frames.pop();
  return retVal;
}

export function runProgram(fn, argVals, allFunctions = {}) {
  knownFunctions = allFunctions;
  frames = [{ name: fn.name, vars: {} }];
  timeline = [];

  fn.params.forEach((param, i) => {
    setVar(param.name, argVals[i], param.type.pointer ? 'pointer' : 'scalar');
  });

  try {
    record(
      fn.body.length ? fn.body[0].line : 1,
      `Start ${fn.name}(${fn.params.map((pp, i) => `${pp.name}=${valueDesc(argVals[i])}`).join(', ')})`,
      { frameChange: true }
    );
    fn.body.forEach(executeStmt);
    record(lastRecordedLine, 'Execution finished successfully (end of function).', { kind: 'end' });
  } catch (e) {
    if (e instanceof ReturnSignal) {
      record(lastRecordedLine, `Function returned ${valueDesc(e.value)}`, {
        kind: 'end',
        highlight: typeof e.value === 'string' ? [e.value] : []
      });
    } else if (e instanceof NullDerefError || e instanceof DanglingPointerError) {
      record(e.line || lastRecordedLine, `[Memory Error] ${e.message}`, { error: true, errorType: 'memory' });
    } else if (e instanceof StepLimitError) {
      timeline.push({
        lineIndex: lastRecordedLine,
        heap: JSON.parse(JSON.stringify(heap)),
        frames: JSON.parse(JSON.stringify(frames)),
        explanation: `[Step Limit] ${e.message}`,
        meta: { error: true, errorType: 'steplimit', leaks: findMemoryLeaks() }
      });
    } else if (e instanceof InterpError) {
      record(e.line || lastRecordedLine, `[Runtime Error] ${e.message}`, { error: true, errorType: 'interp' });
    } else {
      throw e;
    }
  }

  return timeline;
}
