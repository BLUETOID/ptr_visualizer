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

const MAX_STEPS = 1000;

let heap = {};
let heapCounter = 0;
let colCounters = { left: -1, right: 0 };
let frames = [];
let timeline = [];
let lastRecordedLine = 1;
let knownFunctions = {};
let lastDsaAccess = null;
let cinBuffer = [];
let cumulativeStdout = '';

export function getCumulativeStdout() {
  return cumulativeStdout;
}

export function setCinInput(inputStr) {
  if (typeof inputStr === 'string') {
    cinBuffer = inputStr.trim().split(/\s+/).filter(Boolean).map(x => isNaN(Number(x)) ? x : Number(x));
  } else if (Array.isArray(inputStr)) {
    cinBuffer = [...inputStr];
  } else {
    cinBuffer = [];
  }
}

function readNextCinToken() {
  if (cinBuffer.length > 0) return { val: cinBuffer.shift(), eof: false };
  return { val: 0, eof: true };
}

export function resetEngineState(builtHeap = {}, builtCounter = 0, colRight = 0) {
  heap = JSON.parse(JSON.stringify(builtHeap));
  heapCounter = builtCounter;
  colCounters = { left: -1, right: colRight };
  frames = [];
  timeline = [];
  lastRecordedLine = 1;
  knownFunctions = {};
  lastDsaAccess = null;
  cinBuffer = [];
  cumulativeStdout = '';
}

export function allocNode(structType, val = 0, opts = {}) {
  const id = 'n' + (heapCounter++);
  let nodeVal = val !== undefined ? val : 0;
  if ((structType === 'ListNode' || structType === 'TreeNode' || structType === 'DoublyListNode') && typeof nodeVal === 'string' && nodeVal.length === 1) {
    nodeVal = nodeVal.charCodeAt(0);
  }
  const node = {
    id,
    structType: structType || 'ListNode',
    val: nodeVal,
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
  if (v && v.isCinStream) return !v.eof;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  return true;
}

export function valueDesc(v) {
  if (v === null || v === undefined) return 'nullptr';
  if (Array.isArray(v)) return `[${v.map(valueDesc).join(', ')}]`;
  if (v && v.isPair) return `(${valueDesc(v.first)}, ${valueDesc(v.second)})`;
  if (v && v.isStack) return `stack[${v.elements.map(valueDesc).join(', ')}]`;
  if (v && v.isQueue) return `queue[${v.elements.map(valueDesc).join(', ')}]`;
  if (v && v.isPriorityQueue) return `priority_queue[${v.elements.map(valueDesc).join(', ')}]`;
  if (v && v.isSet) return `set{${v.elements.map(valueDesc).join(', ')}}`;
  if (v && v.isMap) return `map{${Object.entries(v.entries).map(([k, val]) => `${k}: ${valueDesc(val)}`).join(', ')}}`;
  if (v && v.isDeque) return `deque[${v.elements.map(valueDesc).join(', ')}]`;
  if (v && v.isIterator) return `it[${v.index}]`;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'string') {
    const n = heap[v];
    if (n) {
      if (n.freed) return `[freed: ${v}]`;
      return `&${n.label || v} (val=${n.val})`;
    }
    if (v.length === 1) return `'${v}'`;
    return `"${v}"`;
  }
  return String(v);
}

export function exprToStr(n) {
  if (!n) return '';
  switch (n.type) {
    case 'Num': return String(n.value);
    case 'Char': return `'${n.value}'`;
    case 'Bool': return String(n.value);
    case 'Null': return 'nullptr';
    case 'String': return `"${n.value}"`;
    case 'Ident': return n.name;
    case 'Member': return `${exprToStr(n.obj)}->${n.field}`;
    case 'Index': return `${exprToStr(n.obj)}[${exprToStr(n.index)}]`;
    case 'ArrayInit': return `{${n.elements.map(exprToStr).join(', ')}}`;
    case 'AddressOf': return `&${exprToStr(n.arg)}`;
    case 'Deref': return `*${exprToStr(n.arg)}`;
    case 'New': return `new ${n.typeName}(${n.args.map(exprToStr).join(', ')})`;
    case 'Call': return `${exprToStr(n.callee)}(${n.args.map(exprToStr).join(', ')})`;
    case 'Unary': return `${n.op}${exprToStr(n.arg)}`;
    case 'Logical': return `${exprToStr(n.left)} ${n.op} ${exprToStr(n.right)}`;
    case 'Binary': return `${exprToStr(n.left)} ${n.op} ${exprToStr(n.right)}`;
    case 'Assign': return `${exprToStr(n.left)} ${n.op} ${exprToStr(n.right)}`;
    case 'Ternary': return `${exprToStr(n.cond)} ? ${exprToStr(n.thenExpr)} : ${exprToStr(n.elseExpr)}`;
    case 'Cast': return `(${n.targetType})(${exprToStr(n.expr)})`;
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
  const snapMeta = {
    ...meta,
    leaks,
    stdout: cumulativeStdout
  };
  if (lastDsaAccess) {
    snapMeta.dsaAccess = lastDsaAccess;
    lastDsaAccess = null;
  }

  timeline.push({
    lineIndex: line,
    heap: JSON.parse(JSON.stringify(heap)),
    frames: JSON.parse(JSON.stringify(frames)),
    explanation,
    meta: snapMeta
  });

  if (timeline.length >= MAX_STEPS) {
    throw new StepLimitError(`Loop step limit (${MAX_STEPS}) reached. Stopped to avoid freeze.`);
  }
}

function evalExpr(node) {
  switch (node.type) {
    case 'Num': return node.value;
    case 'Char': return node.value;
    case 'Bool': return node.value;
    case 'Null': return null;
    case 'String': return node.value;
    case 'Cast': {
      const v = evalExpr(node.expr);
      if (node.targetType === 'int' || node.targetType === 'long' || node.targetType === 'size_t' || node.targetType === 'unsigned') {
        if (typeof v === 'string' && v.length === 1) return v.charCodeAt(0);
        return Math.trunc(Number(v) || 0);
      }
      if (node.targetType === 'char') {
        if (typeof v === 'number') return String.fromCharCode(v);
        return String(v).slice(0, 1);
      }
      if (node.targetType === 'bool') return truthy(v);
      if (node.targetType === 'string' || node.targetType === 'std::string') return String(v);
      return v;
    }
    case 'Ternary': return truthy(evalExpr(node.cond)) ? evalExpr(node.thenExpr) : evalExpr(node.elseExpr);
    case 'Ident': {
      if (node.name === 'null' || node.name === 'NULL' || node.name === 'nullptr') return null;
      if (node.name === 'INT_MAX' || node.name === 'INT32_MAX') return 2147483647;
      if (node.name === 'INT_MIN' || node.name === 'INT32_MIN') return -2147483648;
      if (node.name === 'cout' || node.name === 'std::cout') {
        return { isStream: true, buffer: [] };
      }
      if (node.name === 'cin' || node.name === 'std::cin') {
        return { isCinStream: true };
      }
      if (node.name === 'endl' || node.name === 'std::endl') {
        return '\n';
      }
      const v = getVar(node.name);
      if (!v) throw new InterpError(`Undefined variable '${node.name}'`, node.line);
      return v.value;
    }
    case 'Member': {
      if (node.obj && (node.obj.name === 'cin' || node.obj.name === 'std::cin' || node.obj.name === 'ios_base')) {
        return 0;
      }
      const base = evalExpr(node.obj);
      if (base && base.isCinStream) {
        if (node.field === 'tie') return 0;
      }
      if (typeof base === 'string' && node.field === 'c_str') {
        return base;
      }
      if (base && base.isPair) {
        if (node.field === 'first') return base.first;
        if (node.field === 'second') return base.second;
        throw new InterpError(`pair has no member '${node.field}'`, node.line);
      }
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
      const type = node.typeName;
      if (type.startsWith('string') || type.startsWith('std::string')) {
        return args[0] !== undefined ? String(args[0]) : '';
      }
      if (type.startsWith('vector') || type.startsWith('std::vector')) {
        const sz = args[0] ? Number(args[0]) : 0;
        const defVal = args.length > 1 ? args[1] : 0;
        const res = [];
        for (let i = 0; i < sz; i++) res.push(Array.isArray(defVal) ? [...defVal] : defVal);
        return res;
      }
      if (type.startsWith('pair') || type.startsWith('std::pair')) {
        return { isPair: true, first: args[0] ?? 0, second: args[1] ?? 0 };
      }
      if (type.startsWith('queue') || type.startsWith('std::queue')) return { isQueue: true, elements: [], isChar: type.includes('<char') };
      if (type.startsWith('stack') || type.startsWith('std::stack')) return { isStack: true, elements: [], isChar: type.includes('<char') };
      if (type.startsWith('deque') || type.startsWith('std::deque')) return { isDeque: true, elements: [], isChar: type.includes('<char') };
      if (type.startsWith('priority_queue') || type.startsWith('std::priority_queue')) return { isPriorityQueue: true, elements: [], isMinHeap: type.includes('greater') };
      return allocNode(type, args.length ? args[0] : 0, {});
    }
    case 'ArrayInit': {
      return node.elements.map(evalExpr);
    }
    case 'Index': {
      const target = evalExpr(node.obj);
      const idx = evalExpr(node.index);
      if (Array.isArray(target)) {
        lastDsaAccess = { type: 'read', arrayName: exprToStr(node.obj), index: idx, value: target[idx] };
        return target[idx];
      }
      if (typeof target === 'string') {
        const ch = target[idx] !== undefined ? target[idx] : '';
        lastDsaAccess = { type: 'read', arrayName: exprToStr(node.obj), index: idx, value: ch };
        return ch;
      }
      if (target && target.isMap) {
        if (!(idx in target.entries)) {
          target.entries[idx] = 0;
        }
        lastDsaAccess = { type: 'read', containerName: exprToStr(node.obj), key: idx, value: target.entries[idx], containerType: 'map' };
        return target.entries[idx];
      }
      throw new InterpError(`Cannot index into non-array value`, node.line);
    }
    case 'Call': {
      if (node.callee.type === 'Member') {
        const target = evalExpr(node.callee.obj);
        const method = node.callee.field;

        // Cin methods (e.g. cin.tie(NULL))
        if (target && target.isCinStream) {
          return 0;
        }

        // Pair methods
        if (target && target.isPair) {
          if (method === 'first') return target.first;
          if (method === 'second') return target.second;
        }

        // Priority Queue methods
        if (target && target.isPriorityQueue) {
          if (method === 'push') {
            const v = evalExpr(node.args[0]);
            target.elements.push(v);
            if (target.isMinHeap) {
              target.elements.sort((a, b) => a - b);
            } else {
              target.elements.sort((a, b) => b - a);
            }
            lastDsaAccess = { type: 'push', containerName: exprToStr(node.callee.obj), value: v, containerType: 'priority_queue' };
            return;
          }
          if (method === 'pop') {
            if (target.elements.length === 0) throw new InterpError('Calling .pop() on empty priority_queue', node.line);
            const popped = target.elements.shift();
            lastDsaAccess = { type: 'pop', containerName: exprToStr(node.callee.obj), value: popped, containerType: 'priority_queue' };
            return popped;
          }
          if (method === 'top') {
            if (target.elements.length === 0) throw new InterpError('Calling .top() on empty priority_queue', node.line);
            return target.elements[0];
          }
          if (method === 'empty') return target.elements.length === 0;
          if (method === 'size') return target.elements.length;
        }

        // Set & Unordered Set methods
        if (target && target.isSet) {
          if (method === 'insert') {
            const v = evalExpr(node.args[0]);
            if (!target.elements.includes(v)) {
              target.elements.push(v);
              target.elements.sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))));
            }
            lastDsaAccess = { type: 'insert', containerName: exprToStr(node.callee.obj), value: v, containerType: 'set' };
            return;
          }
          if (method === 'erase') {
            const v = evalExpr(node.args[0]);
            const idx = target.elements.indexOf(v);
            if (idx !== -1) target.elements.splice(idx, 1);
            return;
          }
          if (method === 'count') {
            const v = evalExpr(node.args[0]);
            return target.elements.includes(v) ? 1 : 0;
          }
          if (method === 'find') {
            const v = evalExpr(node.args[0]);
            const idx = target.elements.indexOf(v);
            return idx !== -1
              ? { isIterator: true, container: target.elements, index: idx }
              : { isIterator: true, container: target.elements, index: target.elements.length };
          }
          if (method === 'empty') return target.elements.length === 0;
          if (method === 'size') return target.elements.length;
          if (method === 'clear') { target.elements = []; return; }
        }

        // Map & Unordered Map methods
        if (target && target.isMap) {
          if (method === 'count') {
            const k = evalExpr(node.args[0]);
            return (k in target.entries) ? 1 : 0;
          }
          if (method === 'erase') {
            const k = evalExpr(node.args[0]);
            delete target.entries[k];
            return;
          }
          if (method === 'empty') return Object.keys(target.entries).length === 0;
          if (method === 'size') return Object.keys(target.entries).length;
          if (method === 'clear') { target.entries = {}; return; }
        }

        // Stack methods
        if (target && target.isStack) {
          if (method === 'push') {
            let v = evalExpr(node.args[0]);
            if (target.isChar && typeof v === 'number') {
              v = String.fromCharCode(v);
            }
            target.elements.push(v);
            lastDsaAccess = { type: 'push', containerName: exprToStr(node.callee.obj), value: v, containerType: 'stack' };
            return;
          }
          if (method === 'pop') {
            const popped = target.elements.pop();
            lastDsaAccess = { type: 'pop', containerName: exprToStr(node.callee.obj), value: popped, containerType: 'stack' };
            return;
          }
          if (method === 'top') {
            if (target.elements.length === 0) throw new InterpError('Calling .top() on empty stack', node.line);
            return target.elements[target.elements.length - 1];
          }
          if (method === 'empty') return target.elements.length === 0;
          if (method === 'size') return target.elements.length;
        }

        // Queue methods
        if (target && target.isQueue) {
          if (method === 'push') {
            let v = evalExpr(node.args[0]);
            if (target.isChar && typeof v === 'number') {
              v = String.fromCharCode(v);
            }
            target.elements.push(v);
            lastDsaAccess = { type: 'push', containerName: exprToStr(node.callee.obj), value: v, containerType: 'queue' };
            return;
          }
          if (method === 'pop') {
            const popped = target.elements.shift();
            lastDsaAccess = { type: 'pop', containerName: exprToStr(node.callee.obj), value: popped, containerType: 'queue' };
            return;
          }
          if (method === 'front') {
            if (target.elements.length === 0) throw new InterpError('Calling .front() on empty queue', node.line);
            return target.elements[0];
          }
          if (method === 'back') {
            if (target.elements.length === 0) throw new InterpError('Calling .back() on empty queue', node.line);
            return target.elements[target.elements.length - 1];
          }
          if (method === 'empty') return target.elements.length === 0;
          if (method === 'size') return target.elements.length;
        }

        // Deque methods
        if (target && target.isDeque) {
          if (method === 'push_back' || method === 'push') {
            const v = evalExpr(node.args[0]);
            target.elements.push(v);
            return;
          }
          if (method === 'push_front') {
            const v = evalExpr(node.args[0]);
            target.elements.unshift(v);
            return;
          }
          if (method === 'pop_back' || method === 'pop') return target.elements.pop();
          if (method === 'pop_front') return target.elements.shift();
          if (method === 'front') return target.elements[0];
          if (method === 'back') return target.elements[target.elements.length - 1];
          if (method === 'empty') return target.elements.length === 0;
          if (method === 'size') return target.elements.length;
        }

        // Vector / Array / String methods
        if (Array.isArray(target) || typeof target === 'string') {
          if (method === 'size' || method === 'length') return target.length;
          if (method === 'empty') return target.length === 0;
          if (method === 'front') return target[0];
          if (method === 'back') return target[target.length - 1];
          if (method === 'begin') return { isIterator: true, container: target, index: 0 };
          if (method === 'end') return { isIterator: true, container: target, index: target.length };
          if (method === 'clear') { target.length = 0; return; }
          if (Array.isArray(target)) {
            if (method === 'push_back' || method === 'push' || method === 'emplace_back') {
              let argVal = evalExpr(node.args[0]);
              if (target.isChar && typeof argVal === 'number') {
                argVal = String.fromCharCode(argVal);
              }
              target.push(argVal);
              lastDsaAccess = { type: 'push', arrayName: exprToStr(node.callee.obj), value: argVal, index: target.length - 1 };
              return target.length;
            }
            if (method === 'pop_back' || method === 'pop') {
              const popped = target.pop();
              lastDsaAccess = { type: 'pop', arrayName: exprToStr(node.callee.obj), value: popped, index: target.length };
              return popped;
            }
            if (method === 'erase') {
              const it = evalExpr(node.args[0]);
              if (it && it.isIterator && it.container === target) {
                target.splice(it.index, 1);
                return;
              }
            }
            if (method === 'resize') {
              const newSz = evalExpr(node.args[0]);
              const fillVal = node.args.length > 1 ? evalExpr(node.args[1]) : 0;
              while (target.length < newSz) target.push(fillVal);
              target.length = newSz;
              return;
            }
          }
          if (typeof target === 'string') {
            if (method === 'substr') {
              const pos = evalExpr(node.args[0]);
              const count = node.args.length > 1 ? evalExpr(node.args[1]) : undefined;
              return count !== undefined ? target.substr(pos, count) : target.substr(pos);
            }
            if (method === 'find') {
              const arg = evalExpr(node.args[0]);
              const strToFind = typeof arg === 'number' ? String.fromCharCode(arg) : String(arg);
              return target.indexOf(strToFind);
            }
            if (node.callee.obj.type === 'Ident') {
              const v = getVar(node.callee.obj.name);
              if (v && typeof v.value === 'string') {
                if (method === 'push_back' || method === 'push') {
                  const argVal = evalExpr(node.args[0]);
                  const ch = typeof argVal === 'number' ? String.fromCharCode(argVal) : String(argVal);
                  v.value += ch;
                  lastDsaAccess = { type: 'push', arrayName: node.callee.obj.name, value: ch, index: v.value.length - 1 };
                  return v.value.length;
                }
                if (method === 'pop_back' || method === 'pop') {
                  const popped = v.value.slice(-1);
                  v.value = v.value.slice(0, -1);
                  lastDsaAccess = { type: 'pop', arrayName: node.callee.obj.name, value: popped, index: v.value.length };
                  return popped;
                }
              }
            }
          }
        }
        if (knownFunctions[method]) {
          const args = node.args.map(evalExpr);
          return callFunction(knownFunctions[method], args, node.line);
        }
        throw new InterpError(`Cannot call method '${method}' on object`, node.line);
      }
      if (node.callee.type !== 'Ident') throw new InterpError('Function pointers not supported', node.line);
      const rawName = node.callee.name;
      const fnName = rawName.replace(/^std::/, '');
      if (fnName === 'sync_with_stdio' || rawName === 'ios_base::sync_with_stdio' || rawName.includes('sync_with_stdio')) {
        return 0;
      }
      if (fnName === 'freopen') {
        return 0;
      }
      if (fnName === 'tolower') {
        const c = evalExpr(node.args[0]);
        const ch = typeof c === 'number' ? String.fromCharCode(c) : String(c);
        return ch.toLowerCase();
      }
      if (fnName === 'toupper') {
        const c = evalExpr(node.args[0]);
        const ch = typeof c === 'number' ? String.fromCharCode(c) : String(c);
        return ch.toUpperCase();
      }
      if (fnName === 'isalnum') {
        const c = evalExpr(node.args[0]);
        const ch = typeof c === 'number' ? String.fromCharCode(c) : String(c);
        return /^[a-z0-9]$/i.test(ch);
      }
      if (fnName === 'isalpha') {
        const c = evalExpr(node.args[0]);
        const ch = typeof c === 'number' ? String.fromCharCode(c) : String(c);
        return /^[a-z]$/i.test(ch);
      }
      if (fnName === 'isdigit') {
        const c = evalExpr(node.args[0]);
        const ch = typeof c === 'number' ? String.fromCharCode(c) : String(c);
        return /^[0-9]$/.test(ch);
      }
      if (fnName === 'isspace') {
        const c = evalExpr(node.args[0]);
        const ch = typeof c === 'number' ? String.fromCharCode(c) : String(c);
        return /^\s$/.test(ch);
      }
      if (fnName === 'to_string') {
        const v = evalExpr(node.args[0]);
        return String(v);
      }
      if (fnName === 'stoi') {
        const v = evalExpr(node.args[0]);
        return parseInt(String(v), 10) || 0;
      }
      if (fnName === 'stoll') {
        const v = evalExpr(node.args[0]);
        return parseInt(String(v), 10) || 0;
      }
      if (fnName === 'sqrt') {
        return Math.floor(Math.sqrt(evalExpr(node.args[0])));
      }
      if (fnName === 'pow') {
        return Math.pow(evalExpr(node.args[0]), evalExpr(node.args[1]));
      }
      if (fnName === 'floor') {
        return Math.floor(evalExpr(node.args[0]));
      }
      if (fnName === 'ceil') {
        return Math.ceil(evalExpr(node.args[0]));
      }
      if (fnName === 'max') {
        const args = node.args.map(evalExpr);
        return Math.max(...args);
      }
      if (fnName === 'min') {
        const args = node.args.map(evalExpr);
        return Math.min(...args);
      }
      if (fnName === 'abs') {
        const args = node.args.map(evalExpr);
        return Math.abs(args[0]);
      }
      if (fnName === 'gcd' || fnName === '__gcd') {
        const a = Math.abs(evalExpr(node.args[0]));
        const b = Math.abs(evalExpr(node.args[1]));
        const gcdCalc = (x, y) => { while (y) { const t = y; y = x % y; x = t; } return x; };
        return gcdCalc(a, b);
      }
      if (fnName === 'lcm') {
        const a = Math.abs(evalExpr(node.args[0]));
        const b = Math.abs(evalExpr(node.args[1]));
        const gcdCalc = (x, y) => { while (y) { const t = y; y = x % y; x = t; } return x; };
        return (a * b) / (gcdCalc(a, b) || 1);
      }
      if (fnName === 'make_pair') {
        const v1 = evalExpr(node.args[0]);
        const v2 = evalExpr(node.args[1]);
        return { isPair: true, first: v1, second: v2 };
      }
      if (fnName === 'accumulate') {
        const a0 = evalExpr(node.args[0]);
        const a1 = evalExpr(node.args[1]);
        const initVal = evalExpr(node.args[2]) || 0;
        if (a0 && a0.isIterator && a1 && a1.isIterator && a0.container) {
          let sum = initVal;
          for (let i = a0.index; i < a1.index; i++) sum += a0.container[i];
          return sum;
        }
      }
      if (fnName === 'count') {
        const a0 = evalExpr(node.args[0]);
        const a1 = evalExpr(node.args[1]);
        const targetVal = evalExpr(node.args[2]);
        if (a0 && a0.isIterator && a1 && a1.isIterator && a0.container) {
          let cnt = 0;
          for (let i = a0.index; i < a1.index; i++) {
            if (a0.container[i] === targetVal) cnt++;
          }
          return cnt;
        }
      }
      if (fnName === 'lower_bound') {
        const a0 = evalExpr(node.args[0]);
        const a1 = evalExpr(node.args[1]);
        const targetVal = evalExpr(node.args[2]);
        if (a0 && a0.isIterator && a1 && a1.isIterator && a0.container) {
          for (let i = a0.index; i < a1.index; i++) {
            if (a0.container[i] >= targetVal) {
              return { isIterator: true, container: a0.container, index: i };
            }
          }
          return { isIterator: true, container: a0.container, index: a1.index };
        }
      }
      if (fnName === 'upper_bound') {
        const a0 = evalExpr(node.args[0]);
        const a1 = evalExpr(node.args[1]);
        const targetVal = evalExpr(node.args[2]);
        if (a0 && a0.isIterator && a1 && a1.isIterator && a0.container) {
          for (let i = a0.index; i < a1.index; i++) {
            if (a0.container[i] > targetVal) {
              return { isIterator: true, container: a0.container, index: i };
            }
          }
          return { isIterator: true, container: a0.container, index: a1.index };
        }
      }
      if (fnName === 'binary_search') {
        const a0 = evalExpr(node.args[0]);
        const a1 = evalExpr(node.args[1]);
        const targetVal = evalExpr(node.args[2]);
        if (a0 && a0.isIterator && a1 && a1.isIterator && a0.container) {
          for (let i = a0.index; i < a1.index; i++) {
            if (a0.container[i] === targetVal) return true;
          }
          return false;
        }
      }
      if (fnName === 'min_element') {
        const a0 = evalExpr(node.args[0]);
        const a1 = evalExpr(node.args[1]);
        if (a0 && a0.isIterator && a1 && a1.isIterator && a0.container) {
          let minIdx = a0.index;
          for (let i = a0.index + 1; i < a1.index; i++) {
            if (a0.container[i] < a0.container[minIdx]) minIdx = i;
          }
          return { isIterator: true, container: a0.container, index: minIdx };
        }
      }
      if (fnName === 'max_element') {
        const a0 = evalExpr(node.args[0]);
        const a1 = evalExpr(node.args[1]);
        if (a0 && a0.isIterator && a1 && a1.isIterator && a0.container) {
          let maxIdx = a0.index;
          for (let i = a0.index + 1; i < a1.index; i++) {
            if (a0.container[i] > a0.container[maxIdx]) maxIdx = i;
          }
          return { isIterator: true, container: a0.container, index: maxIdx };
        }
      }
      if (fnName === 'sort') {
        let container = null, startIdx = 0, endIdx = 0;
        if (node.args.length === 2) {
          const a0 = evalExpr(node.args[0]);
          const a1 = evalExpr(node.args[1]);
          if (a0 && a0.isIterator && a1 && a1.isIterator) {
            container = a0.container;
            startIdx = a0.index;
            endIdx = a1.index;
          } else if (Array.isArray(a0) && typeof a1 === 'number') {
            container = a0;
            startIdx = 0;
            endIdx = a1;
          }
        } else if (node.args.length === 1) {
          const a0 = evalExpr(node.args[0]);
          if (Array.isArray(a0)) {
            container = a0;
            startIdx = 0;
            endIdx = a0.length;
          }
        }
        if (container && Array.isArray(container)) {
          const sub = container.slice(startIdx, endIdx);
          sub.sort((a, b) => a - b);
          for (let i = 0; i < sub.length; i++) {
            container[startIdx + i] = sub[i];
          }
          lastDsaAccess = {
            type: 'sort',
            arrayName: node.args[0].obj ? exprToStr(node.args[0].obj) : exprToStr(node.args[0]),
            indices: [startIdx, Math.max(startIdx, endIdx - 1)]
          };
          return;
        }
      }
      if (fnName === 'reverse') {
        let container = null, startIdx = 0, endIdx = 0;
        if (node.args.length === 2) {
          const a0 = evalExpr(node.args[0]);
          const a1 = evalExpr(node.args[1]);
          if (a0 && a0.isIterator && a1 && a1.isIterator) {
            container = a0.container;
            startIdx = a0.index;
            endIdx = a1.index;
          } else if (Array.isArray(a0) && typeof a1 === 'number') {
            container = a0;
            startIdx = 0;
            endIdx = a1;
          }
        } else if (node.args.length === 1) {
          const a0 = evalExpr(node.args[0]);
          if (Array.isArray(a0)) {
            container = a0;
            startIdx = 0;
            endIdx = a0.length;
          }
        }
        if (container && Array.isArray(container)) {
          const sub = container.slice(startIdx, endIdx);
          sub.reverse();
          for (let i = 0; i < sub.length; i++) {
            container[startIdx + i] = sub[i];
          }
          lastDsaAccess = {
            type: 'reverse',
            arrayName: node.args[0].obj ? exprToStr(node.args[0].obj) : exprToStr(node.args[0]),
            indices: [startIdx, Math.max(startIdx, endIdx - 1)]
          };
          return;
        }
      }
      if (fnName === 'fill') {
        if (node.args.length === 3) {
          const a0 = evalExpr(node.args[0]);
          const a1 = evalExpr(node.args[1]);
          const fillVal = evalExpr(node.args[2]);
          if (a0 && a0.isIterator && a1 && a1.isIterator && a0.container) {
            for (let i = a0.index; i < a1.index; i++) {
              a0.container[i] = fillVal;
            }
            return;
          }
        }
      }
      if (fnName === 'swap') {
        if (node.args.length === 2) {
          const v1 = evalExpr(node.args[0]);
          const v2 = evalExpr(node.args[1]);
          assignTo(node.args[0], v2, node.line);
          assignTo(node.args[1], v1, node.line);
          if (node.args[0].type === 'Index' && node.args[1].type === 'Index') {
            lastDsaAccess = {
              type: 'swap',
              arrayName: exprToStr(node.args[0].obj),
              indices: [evalExpr(node.args[0].index), evalExpr(node.args[1].index)],
              values: [v2, v1]
            };
          }
          return;
        }
      }
      const fn = knownFunctions[rawName] || knownFunctions[fnName];
      if (!fn) throw new InterpError(`Undefined function '${rawName}'`, node.line);
      const args = node.args.map(evalExpr);
      return callFunction(fn, args, node.line);
    }
    case 'Unary': {
      const v = evalExpr(node.arg);
      if (node.op === '!') return !truthy(v);
      if (node.op === '-') return -v;
      if (node.op === '~') return ~Number(v);
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
        if (l && l.isCinStream) {
          const token = readNextCinToken();
          const val = token.val;
          const eof = token.eof;
          if (!eof) {
            if (node.right.type === 'Ident') {
              setVar(node.right.name, val, typeof val === 'number' ? 'scalar' : 'string');
              record(node.line, `cin >> ${node.right.name} (read ${val})`, {
                dsaAccess: { type: 'read', varName: node.right.name, value: val }
              });
            } else if (node.right.type === 'Index') {
              const arr = evalExpr(node.right.obj);
              const idx = evalExpr(node.right.index);
              if (Array.isArray(arr)) {
                arr[idx] = val;
                record(node.line, `cin >> ${exprToStr(node.right.obj)}[${idx}] (read ${val})`, {
                  dsaAccess: { type: 'write', arrayName: exprToStr(node.right.obj), index: idx, value: val }
                });
              }
            }
          }
          return { isCinStream: true, eof };
        }
        const r = evalExpr(node.right);
        return Number(l) >> Number(r);
      }
      const r = evalExpr(node.right);
      switch (node.op) {
        case '==': {
          if (l === r) return true;
          if (typeof l === 'string' && l.length === 1 && typeof r === 'number') {
            return l.charCodeAt(0) === r;
          }
          if (typeof r === 'string' && r.length === 1 && typeof l === 'number') {
            return l === r.charCodeAt(0);
          }
          return false;
        }
        case '!=': {
          if (l === r) return false;
          if (typeof l === 'string' && l.length === 1 && typeof r === 'number') {
            return l.charCodeAt(0) !== r;
          }
          if (typeof r === 'string' && r.length === 1 && typeof l === 'number') {
            return l !== r.charCodeAt(0);
          }
          return true;
        }
        case '<': {
          const numL = (typeof l === 'string' && l.length === 1 && typeof r === 'number') ? l.charCodeAt(0) : l;
          const numR = (typeof r === 'string' && r.length === 1 && typeof l === 'number') ? r.charCodeAt(0) : r;
          return numL < numR;
        }
        case '>': {
          const numL = (typeof l === 'string' && l.length === 1 && typeof r === 'number') ? l.charCodeAt(0) : l;
          const numR = (typeof r === 'string' && r.length === 1 && typeof l === 'number') ? r.charCodeAt(0) : r;
          return numL > numR;
        }
        case '<=': {
          const numL = (typeof l === 'string' && l.length === 1 && typeof r === 'number') ? l.charCodeAt(0) : l;
          const numR = (typeof r === 'string' && r.length === 1 && typeof l === 'number') ? r.charCodeAt(0) : r;
          return numL <= numR;
        }
        case '>=': {
          const numL = (typeof l === 'string' && l.length === 1 && typeof r === 'number') ? l.charCodeAt(0) : l;
          const numR = (typeof r === 'string' && r.length === 1 && typeof l === 'number') ? r.charCodeAt(0) : r;
          return numL >= numR;
        }
        case '&': return Number(l) & Number(r);
        case '|': return Number(l) | Number(r);
        case '^': return Number(l) ^ Number(r);
        case '+': {
          if (Array.isArray(l) && typeof r === 'number') {
            return { isIterator: true, container: l, index: r };
          }
          if (l && l.isIterator && typeof r === 'number') {
            return { isIterator: true, container: l.container, index: l.index + r };
          }
          if (typeof l === 'string' && (l.length !== 1 || typeof r === 'string')) {
            const rChar = (typeof r === 'number' && r >= 0 && r <= 255) ? String.fromCharCode(r) : String(r);
            return l + rChar;
          }
          if (typeof r === 'string' && (r.length !== 1 || typeof l === 'string')) {
            const lChar = (typeof l === 'number' && l >= 0 && l <= 255) ? String.fromCharCode(l) : String(l);
            return lChar + r;
          }
          if (typeof l === 'string' && l.length === 1 && typeof r === 'number') {
            return l.charCodeAt(0) + r;
          }
          if (typeof r === 'string' && r.length === 1 && typeof l === 'number') {
            return l + r.charCodeAt(0);
          }
          return l + r;
        }
        case '-': {
          if (l && l.isIterator && r && r.isIterator) {
            return l.index - r.index;
          }
          if (l && l.isIterator && typeof r === 'number') {
            return { isIterator: true, container: l.container, index: l.index - r };
          }
          const numL = (typeof l === 'string' && l.length === 1) ? l.charCodeAt(0) : Number(l);
          const numR = (typeof r === 'string' && r.length === 1) ? r.charCodeAt(0) : Number(r);
          return numL - numR;
        }
        case '*': return l * r;
        case '/': return r === 0 ? 0 : Math.trunc(l / r);
        case '%': return r === 0 ? 0 : l % r;
      }
      break;
    }
    case 'Assign': {
      let val = evalExpr(node.right);
      if (node.op === '+=') {
        const leftVal = evalExpr(node.left);
        if (typeof leftVal === 'string') {
          val = leftVal + ((typeof val === 'number' && val >= 0 && val <= 255) ? String.fromCharCode(val) : String(val));
        } else {
          val = leftVal + val;
        }
      }
      else if (node.op === '-=') val = evalExpr(node.left) - val;
      else if (node.op === '*=') val = evalExpr(node.left) * val;
      else if (node.op === '/=') val = val === 0 ? 0 : Math.trunc(evalExpr(node.left) / val);
      else if (node.op === '%=') val = val === 0 ? 0 : (evalExpr(node.left) % val);
      else if (node.op === '&=') val = Number(evalExpr(node.left)) & Number(val);
      else if (node.op === '|=') val = Number(evalExpr(node.left)) | Number(val);
      else if (node.op === '^=') val = Number(evalExpr(node.left)) ^ Number(val);
      else if (node.op === '<<=') val = Number(evalExpr(node.left)) << Number(val);
      else if (node.op === '>>=') val = Number(evalExpr(node.left)) >> Number(val);
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
      if (existing.kind === 'scalar' && typeof value === 'string' && value.length === 1) {
        value = value.charCodeAt(0);
      } else if (existing.kind === 'char' && typeof value === 'number') {
        value = String.fromCharCode(value);
      } else if (existing.kind === 'char' && typeof value === 'string') {
        value = value.slice(0, 1);
      }
      existing.value = value;
      if (Array.isArray(value)) existing.kind = 'array';
      else if (value === null || (typeof value === 'string' && (/^n\d+$/.test(value) || (heap && heap[value])))) existing.kind = 'pointer';
    } else {
      const isPtr = value === null || (typeof value === 'string' && (/^n\d+$/.test(value) || (heap && heap[value])));
      setVar(node.name, value, Array.isArray(value) ? 'array' : (isPtr ? 'pointer' : (typeof value === 'number' ? 'scalar' : 'pointer')));
    }
    return;
  }
  if (node.type === 'Index') {
    const target = evalExpr(node.obj);
    const idx = evalExpr(node.index);
    if (Array.isArray(target)) {
      target[idx] = value;
      // Trace root array name and multi-dimensional index
      let rootName = exprToStr(node.obj);
      let indices = [idx];
      let cur = node.obj;
      while (cur && cur.type === 'Index') {
        indices.unshift(evalExpr(cur.index));
        cur = cur.obj;
      }
      if (cur) rootName = exprToStr(cur);

      lastDsaAccess = {
        type: 'write',
        arrayName: rootName,
        index: idx,
        indices: indices.length > 1 ? indices : undefined,
        value: value
      };
      return;
    }
    if (typeof target === 'string') {
      const charVal = typeof value === 'number' ? String.fromCharCode(value) : String(value);
      if (node.obj.type === 'Ident') {
        const v = getVar(node.obj.name);
        if (v && typeof v.value === 'string') {
          const arr = v.value.split('');
          arr[idx] = charVal;
          v.value = arr.join('');
          lastDsaAccess = {
            type: 'write',
            arrayName: node.obj.name,
            index: idx,
            value: charVal
          };
          return;
        }
      } else if (node.obj.type === 'Index') {
        const parentArr = evalExpr(node.obj.obj);
        const parentIdx = evalExpr(node.obj.index);
        if (Array.isArray(parentArr) && typeof parentArr[parentIdx] === 'string') {
          const arr = parentArr[parentIdx].split('');
          arr[idx] = charVal;
          parentArr[parentIdx] = arr.join('');
          lastDsaAccess = {
            type: 'write',
            arrayName: exprToStr(node.obj),
            index: idx,
            value: charVal
          };
          return;
        }
      }
    }
    if (target && target.isMap) {
      target.entries[idx] = value;
      lastDsaAccess = {
        type: 'write',
        containerName: exprToStr(node.obj),
        key: idx,
        value: value,
        containerType: 'map'
      };
      return;
    }
    throw new InterpError('Cannot assign to index of non-array', line);
  }
  if (node.type === 'Member') {
    const base = evalExpr(node.obj);
    if (base && base.isPair) {
      if (node.field === 'first') { base.first = value; return; }
      if (node.field === 'second') { base.second = value; return; }
      throw new InterpError(`pair has no member '${node.field}'`, line);
    }
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
    if (decl.isArray) {
      if (decl.init && decl.init.type === 'ArrayInit') {
        value = decl.init.elements.map(evalExpr);
      } else {
        const size = decl.arraySize ? evalExpr(decl.arraySize) : 0;
        value = new Array(size).fill(0);
      }
      kind = 'array';
      desc = `${stmt.varType.name} ${decl.name}[] = ${valueDesc(value)}`;
    } else if (stmt.varType.name.startsWith('priority_queue') || stmt.varType.name.startsWith('std::priority_queue')) {
      const isMin = stmt.varType.name.includes('greater');
      value = { isPriorityQueue: true, elements: [], isMinHeap: isMin };
      kind = 'priority_queue';
      desc = `${stmt.varType.name} ${decl.name} = priority_queue[]`;
    } else if (stmt.varType.name.startsWith('set') || stmt.varType.name.startsWith('std::set') || stmt.varType.name.startsWith('unordered_set') || stmt.varType.name.startsWith('std::unordered_set')) {
      value = { isSet: true, elements: [] };
      kind = 'set';
      desc = `${stmt.varType.name} ${decl.name} = set{}`;
    } else if (stmt.varType.name.startsWith('map') || stmt.varType.name.startsWith('std::map') || stmt.varType.name.startsWith('unordered_map') || stmt.varType.name.startsWith('std::unordered_map')) {
      value = { isMap: true, entries: {} };
      kind = 'map';
      desc = `${stmt.varType.name} ${decl.name} = map{}`;
    } else if (stmt.varType.name.startsWith('stack') || stmt.varType.name.startsWith('std::stack')) {
      const isChar = stmt.varType.name.includes('<char');
      value = { isStack: true, elements: [], isChar };
      kind = 'stack';
      desc = `${stmt.varType.name} ${decl.name} = stack[]`;
    } else if (stmt.varType.name.startsWith('queue') || stmt.varType.name.startsWith('std::queue')) {
      const isChar = stmt.varType.name.includes('<char');
      value = { isQueue: true, elements: [], isChar };
      kind = 'queue';
      desc = `${stmt.varType.name} ${decl.name} = queue[]`;
    } else if (stmt.varType.name.startsWith('deque') || stmt.varType.name.startsWith('std::deque')) {
      const isChar = stmt.varType.name.includes('<char');
      value = { isDeque: true, elements: [], isChar };
      kind = 'deque';
      desc = `${stmt.varType.name} ${decl.name} = deque[]`;
    } else if (stmt.varType.name.startsWith('pair') || stmt.varType.name.startsWith('std::pair')) {
      if (decl.init && decl.init.type === 'ArrayInit') {
        const elems = decl.init.elements.map(evalExpr);
        value = { isPair: true, first: elems[0] ?? 0, second: elems[1] ?? 0 };
      } else if (decl.ctorArgs && decl.ctorArgs.length >= 2) {
        const args = decl.ctorArgs.map(evalExpr);
        value = { isPair: true, first: args[0], second: args[1] };
      } else if (decl.init) {
        value = evalExpr(decl.init);
      } else {
        value = { isPair: true, first: 0, second: 0 };
      }
      kind = 'pair';
      desc = `${stmt.varType.name} ${decl.name} = (${value.first}, ${value.second})`;
    } else if (stmt.varType.name.startsWith('vector') || stmt.varType.name.startsWith('std::vector')) {
      const isChar = stmt.varType.name.includes('<char');
      if (decl.init && decl.init.type === 'ArrayInit') {
        value = decl.init.elements.map(e => {
          const evaled = evalExpr(e);
          return (isChar && typeof evaled === 'number') ? String.fromCharCode(evaled) : evaled;
        });
      } else if (decl.ctorArgs && decl.ctorArgs.length > 0) {
        const sz = Number(evalExpr(decl.ctorArgs[0])) || 0;
        const isNestedVec = stmt.varType.name.includes('<vector') || stmt.varType.name.includes('<std::vector');
        const hasDef = decl.ctorArgs.length > 1;
        let defVal = hasDef ? evalExpr(decl.ctorArgs[1]) : (isNestedVec ? [] : (isChar ? '\0' : 0));
        if (isChar && typeof defVal === 'number') defVal = String.fromCharCode(defVal);
        value = [];
        for (let i = 0; i < sz; i++) {
          value.push(Array.isArray(defVal) ? [...defVal] : defVal);
        }
      } else if (decl.init) {
        value = evalExpr(decl.init);
      } else {
        value = [];
      }
      value.isChar = isChar;
      kind = 'array';
      desc = `${stmt.varType.name} ${decl.name} = ${valueDesc(value)}`;
    } else if (decl.ctorArgs) {
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
      if (decl.init) {
        value = evalExpr(decl.init);
      } else if (stmt.varType.name === 'string' || stmt.varType.name === 'std::string') {
        value = '';
      } else if (stmt.varType.name === 'char') {
        value = '\0';
      } else {
        value = 0;
      }

      if (stmt.varType.name === 'int' || stmt.varType.name === 'long' || stmt.varType.name === 'short' || stmt.varType.name === 'size_t' || stmt.varType.name === 'unsigned') {
        if (typeof value === 'string' && value.length === 1) {
          value = value.charCodeAt(0);
        } else {
          value = Math.trunc(Number(value) || 0);
        }
        kind = 'scalar';
      } else if (stmt.varType.name === 'char') {
        if (typeof value === 'number') {
          value = String.fromCharCode(value);
        } else if (typeof value === 'string') {
          value = value.slice(0, 1);
        }
        kind = 'char';
      } else if (stmt.varType.name === 'bool') {
        value = truthy(value);
        kind = 'scalar';
      } else {
        const isPtr = value === null || (typeof value === 'string' && (/^n\d+$/.test(value) || (heap && heap[value])));
        kind = Array.isArray(value) ? 'array' : (isPtr ? 'pointer' : (typeof value === 'object' ? 'object' : (typeof value === 'number' ? 'scalar' : 'string')));
      }
      desc = `${stmt.varType.name} ${decl.name} = ${valueDesc(value)}`;
    }
    setVar(decl.name, value, kind);
    record(stmt.line, desc, { highlight });
  }
}

function execExprStmt(stmt) {
  const expr = stmt.expr;
  if (expr.type === 'Assign') {
    const leftVal = evalExpr(expr.left);
    const rightVal = evalExpr(expr.right);
    let newVal = rightVal;
    if (expr.op === '+=') {
      if (typeof leftVal === 'string') {
        newVal = leftVal + ((typeof rightVal === 'number' && rightVal >= 0 && rightVal <= 255) ? String.fromCharCode(rightVal) : String(rightVal));
      } else {
        newVal = leftVal + rightVal;
      }
    }
    else if (expr.op === '-=') newVal = leftVal - rightVal;
    else if (expr.op === '*=') newVal = leftVal * rightVal;
    else if (expr.op === '/=') newVal = rightVal === 0 ? 0 : Math.trunc(evalExpr(expr.left) / rightVal);
    else if (expr.op === '%=') newVal = rightVal === 0 ? 0 : (evalExpr(expr.left) % rightVal);
    else if (expr.op === '&=') newVal = Number(evalExpr(expr.left)) & Number(rightVal);
    else if (expr.op === '|=') newVal = Number(evalExpr(expr.left)) | Number(rightVal);
    else if (expr.op === '^=') newVal = Number(evalExpr(expr.left)) ^ Number(rightVal);
    else if (expr.op === '<<=') newVal = Number(evalExpr(expr.left)) << Number(rightVal);
    else if (expr.op === '>>=') newVal = Number(evalExpr(expr.left)) >> Number(rightVal);

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
      cumulativeStdout += out;
      record(stmt.line, `cout << ${out}`, { output: out, stdout: cumulativeStdout });
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
    case 'RangeFor': {
      const containerVal = evalExpr(stmt.container);
      let list = [];
      if (typeof containerVal === 'string') {
        list = containerVal.split('');
      } else if (Array.isArray(containerVal)) {
        list = containerVal;
      } else if (containerVal && containerVal.elements) {
        list = containerVal.elements;
      } else if (containerVal && containerVal.isMap) {
        list = Object.entries(containerVal.entries || {}).map(([k, v]) => ({
          isPair: true,
          first: isNaN(Number(k)) ? k : Number(k),
          second: v
        }));
      }
      for (let idx = 0; idx < list.length; idx++) {
        const item = list[idx];
        const itemKind = stmt.varType.name === 'char' || (typeof item === 'string' && item.length === 1)
          ? 'char'
          : (typeof item === 'object' ? 'object' : 'scalar');
        setVar(stmt.varName, item, itemKind);
        record(stmt.line, `for (${stmt.varName} : ${exprToStr(stmt.container)}) [${stmt.varName} = ${valueDesc(item)}]`, {
          dsaAccess: { type: 'read', arrayName: exprToStr(stmt.container), index: idx, value: item }
        });
        try {
          execStmtOrBlock(stmt.body);
        } catch (e) {
          if (e instanceof BreakSignal) break;
          if (e instanceof ContinueSignal) continue;
          throw e;
        }
      }
      return;
    }
    case 'DoWhile': return execDoWhile(stmt);
    case 'Return': return execReturn(stmt);
    case 'Block': stmt.body.forEach(executeStmt); return;
    case 'Break': throw new BreakSignal();
    case 'Continue': throw new ContinueSignal();
    case 'EmptyStmt': return;
    default: throw new InterpError('Unsupported statement type', stmt.line);
  }
}

function callFunction(fn, argVals, callLine) {
  if (frames.length > 50) throw new StepLimitError('Recursion stack overflow (max depth 50)');
  frames.push({ name: fn.name, vars: {} });
  fn.params.forEach((param, i) => {
    let rawVal = argVals[i];
    if (rawVal === undefined && param.defaultVal) {
      rawVal = evalExpr(param.defaultVal);
    }
    const k = Array.isArray(rawVal) || param.isArray ? 'array' : (param.type.pointer ? 'pointer' : (param.type.name === 'char' ? 'char' : 'scalar'));
    setVar(param.name, rawVal, k);
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

export function runProgram(fn, argVals, allFunctions = {}, cinInput = null) {
  knownFunctions = allFunctions;
  frames = [{ name: fn.name, vars: {} }];
  timeline = [];
  if (cinInput !== null && cinInput !== undefined) {
    setCinInput(cinInput);
  }

  fn.params.forEach((param, i) => {
    let rawVal = argVals[i];
    if (rawVal === undefined) {
      if (param.defaultVal) {
        rawVal = evalExpr(param.defaultVal);
      } else if (param.type.name === 'string' || param.type.name === 'std::string') {
        rawVal = '()[]{}';
      } else if (param.type.name.startsWith('vector') || param.isArray) {
        rawVal = [1, 2, 3];
      } else {
        rawVal = 0;
      }
    }
    const k = Array.isArray(rawVal) || param.isArray ? 'array' : (param.type.pointer ? 'pointer' : (param.type.name === 'char' ? 'char' : 'scalar'));
    setVar(param.name, rawVal, k);
  });

  // Automatically bind pointer variables (head2, head3, etc.) for additional multi-list heads
  if (argVals && argVals.length > fn.params.length) {
    for (let i = fn.params.length; i < argVals.length; i++) {
      const rawVal = argVals[i];
      if (rawVal !== undefined && rawVal !== null) {
        const varName = (fn.params.length === 0 && i === 0) ? 'head' : `head${i + 1}`;
        setVar(varName, rawVal, 'pointer');
      }
    }
  }

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
