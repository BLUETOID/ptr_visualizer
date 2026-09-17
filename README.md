# Recursion — Interactive C++ Pointer & Memory Visualizer

A client-side, real-time C++ pointer, data structure, and dynamic memory visualizer. As you write C++ code, the engine simulates execution step-by-step and automatically renders SVG memory diagrams showing nodes, pointer links, tree hierarchies, stack frames, and heap allocations.

---

## Quick Start (Running Locally)

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)

### Run with Vite Dev Server
```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev
```
Open **`http://localhost:3000`** in your browser.

*(Alternative without Node: run `python3 -m http.server 8000` and visit `http://localhost:8000`)*

---

## User Guide

### 1. Selecting an Algorithm or Blank Scratchpad
- **Algorithm Preset Dropdown**: Access 18+ pre-configured algorithms categorized by data structure:
  - **Singly Linked Lists**: Reverse List (LC 206), Cycle Detection (LC 141), Middle of List (LC 876), Swap Pairs (LC 24), Remove N-th Node (LC 19), Palindrome List (LC 234).
  - **Doubly Linked Lists**: Insert & Link Nodes with bidirectional pointers.
  - **Binary Trees**: Invert Tree (LC 226), Max Depth (LC 104), Search BST (LC 700), Insert into BST (LC 701), Tree Max via Recursion.
  - **Pointers & Dynamic Memory**: Dynamic allocation with `new` and `delete`, memory leak detection, Stack (LIFO), Queue (FIFO).
  - **Modern Language Features**: Partition demo with `do...while` loops and ternary expressions (`? :`).
- **+ Blank Scratchpad**: Open an empty workspace to write custom C++ code from scratch.
- **Browse Examples**: Open a modal catalog to search and filter presets by category.

### 2. Writing C++ Code in the Editor
- **Live Re-Simulation**: Code edits trigger automatic re-parsing, interpretation, and diagram rendering.
- **Syntax Highlighting**: Real-time coloring for keywords, types, numbers, strings, and comments.
- **IntelliSense Autocomplete**: Type prefixes like `ListNode`, `TreeNode`, `new`, or member operators (`->`, `.`) to trigger completions (`Tab` or `Enter` to insert).
- **Snippets Toolbar**: Insert common pointer manipulation patterns directly at the caret position.
- **Bracket Pair Matching**: Auto-closes parentheses, braces, and square brackets.

### 3. Step-by-Step Execution Scrubber
- **Play / Pause (`Space`)**: Animate execution step-by-step.
- **Next (`Right Arrow`) / Prev (`Left Arrow`)**: Step forward or backward by one statement.
- **Reset (`R`)**: Return to Step 0 (initial state).
- **Timeline Slider**: Scrub to any execution snapshot.
- **Speed Selector**: Set animation speed from `0.5x` to `3.0x`.
- **Explanation Banner**: Displays a breakdown of the specific pointer assignment or memory action occurring at each step.

### 4. Interactive Diagram Canvas
- **Pan**: Click and drag on the canvas to move the viewport.
- **Zoom**: Use the `+` and `−` buttons, or click `Reset View` to center the diagram.
- **Pointer Badges**: Pointers (`head`, `curr`, `slow`, `fast`, `prev`, etc.) float above target nodes in real time.
- **Memory Leak Detector**: Orphaned heap nodes lacking active pointer references are highlighted in amber.
- **Deallocation Indicators**: Freed nodes (`delete ptr;`) display tombstone styling indicating returned memory.

### 5. Virtual Call Stack & Memory Inspector
- Displays active stack frames top-down.
- Inspect recursive call stacks (e.g., Tree Inversion, Tree Max) as frames push on entry and pop on return.
- Inspect local variables, parameters, pointer references (`&n0`), and active allocation metrics.

### 6. Cursor Line Synchronization
- Toggle **Follow Cursor** to automatically synchronize the memory diagram to the line where your cursor is positioned.

---

## Keyboard Shortcuts

| Shortcut | Description |
|---|---|
| `Space` | Play / Pause execution |
| `Right Arrow` | Step forward |
| `Left Arrow` | Step backward |
| `R` | Reset to step 0 |
| `Tab` / `Enter` | Accept autocomplete recommendation |
| `Escape` | Dismiss autocomplete popup / close modal |

---

## Free Hosting & Deployment

This visualizer runs entirely in the browser and requires no backend server.

### Option A: GitHub Pages
1. Push this repository to GitHub.
2. In your repository on GitHub, navigate to **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. The included workflow (`.github/workflows/deploy.yml`) automatically builds and publishes the site to `https://<username>.github.io/<repo>/`.

### Option B: Vercel
1. Visit [vercel.com](https://vercel.com) and log in with GitHub.
2. Import the repository.
3. Keep default settings (Vite build: `npm run build`, output: `dist`).
4. Click **Deploy**.

### Option C: Netlify
1. Log in to [netlify.com](https://netlify.com) and import the repository.
2. Set build command to `npm run build` and publish directory to `dist`.
3. Click **Deploy Site**.

---

## License

MIT License. Free for personal, academic, and open-source use.
