import { tokenize } from '../src/core/lexer.js';
import { parseProgram } from '../src/core/parser.js';
import { runProgram, resetEngineState } from '../src/core/interpreter.js';

console.log('[START] Verifying LeetCode & Character Features...');
let passed = 0;
let total = 0;

function assert(cond, msg) {
  total++;
  if (!cond) {
    console.error(`  [FAIL] ${msg}`);
    throw new Error(msg);
  }
  passed++;
  console.log(`  [PASS] ${msg}`);
}

// 1. Stack of char and push '(' shows '(' (not 40)
{
  const code = `
void main() {
    stack<char> st;
    st.push('(');
    st.push(')');
    char topCh = st.top();
    bool isParen = (topCh == ')');
}
`;
  const ast = parseProgram(tokenize(code));
  resetEngineState({}, 0, 0);
  const timeline = runProgram(ast.functions.main, [], ast.functions);
  const lastStep = timeline[timeline.length - 1];
  const st = lastStep.frames[0].vars.st.value;
  assert(st.elements[0] === '(', "stack<char> element 0 must be '(' and not 40");
  assert(st.elements[1] === ')', "stack<char> element 1 must be ')'");
  assert(lastStep.frames[0].vars.topCh.value === ')', "topCh must be ')'");
  assert(lastStep.frames[0].vars.isParen.value === true, "topCh == ')' must be true");
}

// 2. Character arithmetic: 'b' - 'a' == 1, '5' - '0' == 5
{
  const code = `
void main() {
    int diff = 'b' - 'a';
    int digit = '5' - '0';
    int maxVal = INT_MAX;
    int minVal = INT_MIN;
}
`;
  const ast = parseProgram(tokenize(code));
  resetEngineState({}, 0, 0);
  const timeline = runProgram(ast.functions.main, [], ast.functions);
  const vars = timeline[timeline.length - 1].frames[0].vars;
  assert(vars.diff.value === 1, "'b' - 'a' must evaluate to 1");
  assert(vars.digit.value === 5, "'5' - '0' must evaluate to 5");
  assert(vars.maxVal.value === 2147483647, "INT_MAX must evaluate to 2147483647");
  assert(vars.minVal.value === -2147483648, "INT_MIN must evaluate to -2147483648");
}

// 3. Built-in helpers: tolower, toupper, isalnum, isalpha, isdigit, to_string, stoi
{
  const code = `
void main() {
    char lower = tolower('A');
    char upper = toupper('b');
    bool alnum = isalnum('8');
    bool alpha = isalpha('z');
    bool dig = isdigit('9');
    string s = to_string(123);
    int num = stoi("456");
}
`;
  const ast = parseProgram(tokenize(code));
  resetEngineState({}, 0, 0);
  const timeline = runProgram(ast.functions.main, [], ast.functions);
  const vars = timeline[timeline.length - 1].frames[0].vars;
  assert(vars.lower.value === 'a', "tolower('A') must evaluate to 'a'");
  assert(vars.upper.value === 'B', "toupper('b') must evaluate to 'B'");
  assert(vars.alnum.value === true, "isalnum('8') must be true");
  assert(vars.alpha.value === true, "isalpha('z') must be true");
  assert(vars.dig.value === true, "isdigit('9') must be true");
  assert(vars.s.value === '123', "to_string(123) must be '123'");
  assert(vars.num.value === 456, "stoi('456') must be 456");
}

// 4. Casting: (int)'A' == 65, (char)66 == 'B'
{
  const code = `
void main() {
    int codeA = (int)'A';
    char chB = (char)66;
}
`;
  const ast = parseProgram(tokenize(code));
  resetEngineState({}, 0, 0);
  const timeline = runProgram(ast.functions.main, [], ast.functions);
  const vars = timeline[timeline.length - 1].frames[0].vars;
  assert(vars.codeA.value === 65, "(int)'A' must be 65");
  assert(vars.chB.value === 'B', "(char)66 must be 'B'");
}

// 5. class Solution parsing and execution
{
  const code = `
class Solution {
public:
    bool isValid(string s) {
        stack<char> st;
        for (char c : s) {
            if (c == '(') st.push(c);
            else {
                if (st.empty()) return false;
                st.pop();
            }
        }
        return st.empty();
    }
};

void main() {
    Solution sol;
    bool ok = sol.isValid("()");
}
`;
  const ast = parseProgram(tokenize(code));
  assert(ast.functions['isValid'] !== undefined, "class Solution method isValid must be parsed into functions");
  resetEngineState({}, 0, 0);
  const timeline = runProgram(ast.functions.main, [], ast.functions);
  const vars = timeline[timeline.length - 1].frames[0].vars;
  assert(vars.ok.value === true, "sol.isValid('()') must return true");
}

console.log(`\nAll LeetCode & Character tests passed! (${passed}/${total})`);
