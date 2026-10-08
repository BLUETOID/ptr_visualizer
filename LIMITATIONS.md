# PtrViz Visualizer: Complete System Limitations & Architectural Boundaries

> **Purpose:** This document provides an exhaustive, transparent inventory of all current technical limitations, unsupported C++ language features, parser edge-cases, and visualization constraints in the PtrViz visualizer.

---

## 1. Executive Summary

PtrViz is a **specialized in-browser C++ execution engine and visualizer** built from scratch in vanilla JavaScript. It is designed specifically for **DSA education, interview preparation (LeetCode), and algorithm visualization** (Linked Lists, Binary Trees, Arrays, Strings, Stacks, Queues, Graphs, Sets, and Maps).

Because it uses a custom recursive-descent parser and JavaScript virtual machine rather than a full binary compiler (such as Clang or GCC via WebAssembly), it executes a **focused, high-utility subset of modern C++**. Code written with features outside this subset will either throw parse errors or fail to execute.

---

## 2. Syntax, Lexer & Tokenizer Limitations

### 2.1 Parenthesis & Delimiter Grammar Handling
- **Character Literals with Delimiters**:
  - Character literals representing delimiters like `'('`, `')'`, `'{'`, `'}'`, `'['`, `']'`, `','`, and `';'` (e.g., `st.push('('); st.push(')');`) are parsed cleanly with dedicated `isPunct` discrimination. Punctuation delimiters and character values never collide.
- **Mid-Typing Expression State**:
  - In incomplete expressions like `if (` or `int x = (`, the parser catches incomplete code states (`Writing code...`) without throwing false-positive syntax errors, resuming live animation once closing parentheses are typed.

### 2.2 First-Class Character & String Literals
- **First-Class `char` Support**:
  - Single-quoted character literals (`'a'`, `'('`, `'0'`) are tokenized as first-class `char` tokens with glyph preservation and ASCII mapping (`numValue`).
  - Containers such as `stack<char>`, `vector<char>`, `queue<char>`, and variables declared as `char c = '(';` visually render and inspect as character glyphs (e.g., `'('`, `')'`), resolving the previous ASCII code (40) display issue.
  - Character arithmetic (`'b' - 'a' == 1`, `'5' - '0' == 5`, `c >= 'a' && c <= 'z'`) and type casting (`(int)'A' == 65`, `(char)66 == 'B'`) work seamlessly.
- **Escape Sequences**:
  - Supported: `\n`, `\t`, `\\`, `\"`, `\'`, `\0`.
  - Unsupported: Hexadecimal (`\x1b`), Octal (`\033`), Unicode codepoints (`\u0041`), and raw string literals `R"(...)"`.

### 2.3 Preprocessor & Macro Constraints
- **Regex-Based Macro Expansion**:
  - Preprocessor `#define` directives are processed via a single-pass regex preprocessor before tokenization.
  - **Supported**: Simple constants (`#define INF 1e9`), limits (`INT_MAX`, `INT_MIN`), and single-line parameterized macros (`#define all(x) (x).begin(), (x).end()`, `#define sz(x) ((int)(x).size())`).
  - **Unsupported**:
    - Multi-line macros using backslash line continuations (`\`).
    - Conditional compilation directives: `#ifdef`, `#ifndef`, `#if`, `#elif`, `#else`, `#endif`.
    - `#include` directives are ignored or skipped—standard LeetCode headers (`<bits/stdc++.h>`, `<iostream>`, `<vector>`, `<stack>`, `<string>`) are built into the visualizer automatically.

### 2.4 Code Editor Indentation & Formatting
- **Smart Indentation Engine**:
  - `Enter` automatically preserves current indentation depth.
  - An opening `{` triggers automatic +4 space indentation for the subsequent line.
  - Hitting `Enter` between `{}` automatically expands into a standard 3-line block with the cursor indented on the middle line and the closing brace aligned.
  - `Backspace` on 4-space boundaries smartly unindents by a full indentation level (4 spaces).
  - `Tab` and `Shift+Tab` support single-line and multi-line indent/unindent operations without losing cursor state.

---

## 3. Grammar & Parser Limitations

### 3.1 LeetCode Classes & Object-Oriented Programming (OOP)
- **LeetCode `class Solution` Support**:
  - Supported: LeetCode `class Solution` templates with `public:` member functions (e.g. `bool isValid(string s)`, `int maxProfit(vector<int>& prices)`, `ListNode* reverseList(ListNode* head)`). Methods are automatically registered and can be called via `sol.isValid("()")` or run directly.
  - Supported: C-style `struct` definitions (`ListNode`, `TreeNode`, `DoublyListNode`) with pointers and values.
  - Unsupported:
    - Complex inheritance (`class Dog : public Animal`).
    - Virtual functions and vtables.
    - Operator overloading (`bool operator<(const Node& other) const`).
    - Templates declared by users (`template <typename T> void fn()`). Standard template containers (`vector<T>`, `stack<T>`, `queue<T>`, `pair<T1, T2>`) are fully supported.

### 3.2 Types & Casts
- **C-Style Casts Only**:
  - Simple casts like `(int)x`, `(long long)val`, or `(double)n` are supported.
  - Named C++ casts are **unsupported**: `static_cast<T>()`, `dynamic_cast<T>()`, `reinterpret_cast<T>()`, and `const_cast<T>()`.
- **User-Defined Templates**:
  - Template *instantiation* of built-in containers is supported: `vector<int>`, `vector<vector<int>>`, `pair<int, int>`, `priority_queue<int, vector<int>, greater<int>>`.
  - User-defined template declarations are **unsupported**:
    ```cpp
    // NOT SUPPORTED:
    template <typename T>
    T myMax(T a, T b) { return a > b ? a : b; }
    ```
- **Type Aliases**:
  - Supported: Basic `using ll = long long;`, `using vi = vector<int>;`, `typedef int integer;`.
  - Unsupported: Complex templated `using` aliases with template parameters (`template<typename T> using Vec = vector<T>;`).

### 3.3 Pointer & Reference Semantics
- **Single-Level Pointers Only**:
  - Supported: `ListNode* head`, `TreeNode* root`, `int* ptr`.
  - Unsupported: Multi-level pointers (`int** matrix`, `ListNode** head_ref`). To represent 2D structures, use `vector<vector<int>>` or arrays.
- **Pointer Arithmetic**:
  - Supported: Dynamic allocation with `new` and `delete`, arrow member access (`curr->next`), and null checks (`curr != nullptr`).
  - Unsupported: Raw byte address offsets (`ptr + 4`, `*(ptr + i)`, `ptr++` on raw pointer blocks). Use array indexing `arr[i]` instead.
- **Function Pointers & Lambdas**:
  - Function pointers (`void (*fn)(int)`) and lambda expressions (`[](int a, int b) { return a < b; }`) are **unsupported**.

### 3.4 Control Flow Statements
- **Supported Control Flow**:
  - `if`, `else if`, `else`.
  - `while`, `do ... while`.
  - `for` loops with standard headers (`for (int i = 0; i < n; i++)`).
  - Range-based for loops (`for (int x : adj[u])`, `for (char c : s)`).
  - `return`, `break`, `continue`.
  - Ternary operator (`cond ? a : b`).
- **Unsupported Control Flow**:
  - `switch`, `case`, `default` statements (use `if-else` chains instead).
  - `goto` and line labels.
  - `try`, `catch`, `throw` exception handling.

---

## 4. Virtual Machine & Execution Limitations

### 4.1 Memory Model & Virtual Heap
- **Synthetic Memory Addresses**:
  - Memory addresses displayed in the visualizer (e.g., `0x1020`, `0x1040`) are virtual IDs generated for diagram clarity, not real 64-bit hardware physical memory addresses.
- **Stack & Variable Lifetime**:
  - Variables declared inside local blocks (loops, if branches) currently persist in the call frame until the enclosing function returns. Lexical block-scoped destructors are not simulated.
- **Reference Binding**:
  - References (`int& x = y;`) are simulated. While range-for by value works reliably, complex multi-aliasing references may evaluate as copies in certain nested expressions.

### 4.2 Step Execution & Infinite Loop Guard
- **Execution Step Ceiling**:
  - The interpreter enforces a default limit of **1,000 execution steps** per simulation run.
  - Algorithms that execute more than 1,000 steps (e.g. an infinite `while (true)` loop or processing an array with $10^5$ iterations) will be safely halted to prevent freezing the web browser tab.
- **Pedagogical Scale vs. Production Scale**:
  - PtrViz is calibrated for educational inputs ($N \le 30$ elements). Attempting to run inputs of size $N = 100,000$ (as found in competitive programming platforms like Codeforces or LeetCode judge servers) will exceed browser memory and step limits.

### 4.3 I/O Stream Emulation
- **Non-Interactive Input Stream**:
  - `cin >>` reads sequentially from the topbar **"Initial Array / Input Stream"** field (space or bracket separated tokens).
  - Interactive prompts that block execution waiting for keyboard input in the middle of a loop are not supported; all inputs must be provided in the input field prior to running.
- **Supported Streams**:
  - `cout <<` with `endl` or `"\n"`, `cin >>`.
  - `cin.tie(NULL)` and `ios_base::sync_with_stdio(false)` are parsed as no-ops.
  - `printf` / `scanf` format specifiers (`%d`, `%s`) are **unsupported**.

---

## 5. Standard Template Library (STL) Limitations

| STL Feature | Supported Capabilities | Unsupported Capabilities |
| :--- | :--- | :--- |
| **`std::vector`** | `.push_back()`, `.pop_back()`, `.size()`, `.empty()`, `.front()`, `.back()`, `.clear()`, `.resize()`, `[i]`, 2D vectors | `.emplace()`, `.insert(pos)`, `.assign()`, custom allocators |
| **`std::string`** | `s[i]`, `.length()`, `.size()`, `.substr()`, `.find()`, `.push_back()`, `.pop_back()`, `+`, `+=` | Regex (`std::regex`), `.replace()`, `.compare()` |
| **`std::stack`** | `.push()`, `.pop()`, `.top()`, `.size()`, `.empty()` | Container adapters with custom underlying containers |
| **`std::queue`** | `.push()`, `.pop()`, `.front()`, `.back()`, `.size()`, `.empty()` | Priority queues acting as queues |
| **`std::deque`** | `.push_front()`, `.push_back()`, `.pop_front()`, `.pop_back()`, `.front()`, `.back()`, `.size()`, `.empty()` | Random insertion |
| **`std::priority_queue`** | Max-heap (default), min-heap (`greater<int>`), `.push()`, `.pop()`, `.top()`, `.size()`, `.empty()` | Custom comparator structs/lambdas |
| **`std::set`** | `.insert()`, `.erase()`, `.count()`, `.find()`, `.size()`, `.empty()`, `.clear()` | `lower_bound()` / `upper_bound()` member calls, multisets |
| **`std::map`** | `mp[key] = val`, `mp[key]`, `.count()`, `.erase()`, `.size()`, `.empty()`, `.clear()` | `.find()` returning iterator pairs, multimaps |
| **`std::pair`** | `p.first`, `p.second`, `make_pair(a, b)`, `{a, b}` | `std::tuple`, structured bindings (`auto [u, v] = p;`) |
| **Iterators** | Simulated index references for `.begin()` and `.end()` in `sort` & `reverse` | Bidirectional pointer arithmetic (`it + 3`, `*it`), `rbegin()`, `rend()` |
| **Algorithms** | `std::sort`, `std::reverse`, `min`, `max`, `abs`, `__gcd`, `lcm`, `fill`, `accumulate`, `lower_bound`, `upper_bound`, `binary_search` | `std::transform`, `std::next_permutation`, `std::unique`, custom lambda comparators |

---

## 6. Visualization & UI Limitations

### 6.1 Unified Studio Multi-Band Layout
- **Unified Studio Architecture**:
  - Pointers & Nodes and Containers & STL are now unified into a single coherent visualizer canvas.
  - When code involves both STL containers and heap pointer structures (e.g., Tree BFS with `queue<TreeNode*>`, Merge K Sorted Lists with `priority_queue<ListNode*>`, or LRU Cache with `unordered_map` and Doubly Linked List), the canvas uses a dynamic multi-band vertical layout:
    - **Upper Band ($Y \approx 25$)**: Active STL containers (Queues, Stacks, Priority Queues, Deques, Maps, Arrays).
    - **Lower Band ($Y \approx 240$)**: Heap nodes (Binary Trees, Singly/Doubly Linked Lists).
    - **Node Linking**: Pointer addresses held within container elements are rendered as `Node <val>` badges and feature interactive hover highlighting directly linking to the target heap node.
- **Single Mode Focus**:
  - When only STL containers or only heap structures exist, the visualizer automatically renders in full-height single-band mode with optimal vertical centering.

### 6.2 Visual Canvas Capacity & Layout
- **Tree Layout**:
  - Binary tree layout is optimized for balanced or semi-balanced trees with up to depth 5–6 ($2^5$ leaf span). Deep skewed trees (e.g. 15 nodes in a line) may require panning. $N$-ary trees (`vector<Node*> children`) are not auto-laid out as visual trees.
- **Graph Layout**:
  - Graphs are rendered via the **Adjacency List** visualizer (`adj[u] -> [neighbors]`). Arbitrary general graphs are not currently laid out as force-directed physics node graphs.
- **Horizontal Screen Density**:
  - Displaying arrays with more than 30–40 elements requires horizontal SVG panning and zooming.

---

## 7. Recommended Workarounds & Best Practices

To ensure code runs reliably in PtrViz, follow these conventions:

| What Fails | Recommended Workaround |
| :--- | :--- |
| `switch (val) { case 1: ... }` | Use `if (val == 1) { ... } else if (val == 2) { ... }` |
| `int** matrix = new int*[n];` | Use `vector<vector<int>> matrix(n, vector<int>(m, 0));` |
| `std::sort(v.begin(), v.end(), cmp)` | Use default `sort(v.begin(), v.end())` or manual bubble/insertion sort |
| `for (int i = 0, j = n - 1; ...)` | Declare variables outside: `int i = 0, j = n - 1; for (; i < j; i++, j--)` |
| `printf("%d\n", x);` | Use `cout << x << "\n";` |
| `class Solution { public: ... };` | Remove `public:` and replace `class` with `struct` or write top-level functions |
| `auto [u, v] = q.front();` | Use `pair<int, int> p = q.front(); int u = p.first; int v = p.second;` |
| Infinite loop / $> 1000$ steps | Reduce input size to $N \le 20$ elements in the input field |
