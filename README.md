# Recursion — Interactive C++ Pointer & Memory Visualizer

A fast, client-side, real-time C++ pointer, data structure, and dynamic memory visualizer. As you write C++ code, it interprets execution step-by-step and automatically renders live SVG memory diagrams showing nodes, pointers, tree hierarchies, stack frames, and heap allocations.

---

## 🚀 Quick Start (Running Locally)

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)

### Run with Vite Dev Server
```bash
# 1. Install dependencies (only Vite is required)
npm install

# 2. Start local server
npm run dev
```
Open **`http://localhost:3000`** in your browser.

*(Alternative without Node: run `python3 -m http.server 8000` and visit `http://localhost:8000`)*

---

## 📖 How to Use the Visualizer

### 1. Select a Pre-Built Algorithm or Start Blank
- **Algorithm Preset Dropdown**: Choose from 18+ categorized algorithms across:
  - **Singly Linked Lists**: Reverse List (LC 206), Cycle Detection (LC 141), Middle of List (LC 876), Swap Pairs (LC 24), Remove N-th Node (LC 19), Palindrome List (LC 234).
  - **Doubly Linked Lists**: Insert & Link Nodes with `prev` & `next` pointers.
  - **Binary Trees**: Invert Tree (LC 226), Max Depth (LC 104), Search BST (LC 700), Insert into BST (LC 701), Tree Max via Recursion.
  - **Pointers & Dynamic Memory**: `new` and `delete` lifecycle, memory leak warnings, Stack (LIFO), Queue (FIFO).
  - **Modern Language Features**: Partition demo with `do...while` loops and ternary expressions (`? :`).
- **+ Blank Scratchpad**: Open a clean slate to write custom C++ code from scratch without pre-existing templates.
- **Browse Examples**: Click to open a searchable catalog modal filtered by categories.

### 2. Writing C++ Code in the Editor
- **Live Execution**: Every code change automatically compiles, runs, and renders the diagram in real time.
- **Syntax Highlighting**: Real-time coloring for keywords, types, numbers, strings, and comments.
- **IntelliSense Autocomplete**: Type keywords like `ListNode`, `TreeNode`, `new`, or access fields via `->` and `.` to get instant autocomplete suggestions (`Tab` or `Enter` to select).
- **1-Click Snippets Toolbar**: Click buttons above the editor (`curr = curr->next;`, `ListNode* temp = ...;`, etc.) to insert common pointer patterns directly at your cursor.
- **Auto Bracket Matching**: Automatically completes `()`, `{}`, and `[]`.

### 3. Step-by-Step Execution Scrubber
- **Play / Pause (`Space`)**: Run the execution animation automatically.
- **Next (`Right Arrow`) / Prev (`Left Arrow`)**: Step forward or backward one execution line at a time.
- **Reset (`R`)**: Jump back to Step 0 (initial state).
- **Timeline Slider**: Drag the scrubber to instantly navigate to any step in the algorithm's lifecycle.
- **Speed Selector**: Adjust playback speed from `0.5x` to `3.0x`.
- **Explanation Banner**: Reads out human-friendly commentary of the exact pointer action happening at each step (e.g. `head->next = prev;`, `Dynamically allocated node n2`, `delete oldHead`).

### 4. Interactive Diagram Canvas
- **Pan**: Click and drag anywhere on the canvas background to pan.
- **Zoom**: Use the `+` / `−` zoom buttons or reset view with the `Reset View` button.
- **Node Badges**: Pointer variables (`head`, `curr`, `slow`, `fast`, `prev`, etc.) float above the target node in real time.
- **Memory Leak Warnings**: If a node is allocated on the heap but loses all incoming references without `delete`, it is highlighted in amber as a memory leak.
- **Freed Tombstones**: Calling `delete ptr;` turns the node into a red dashed tombstone showing that memory was returned.

### 5. Virtual Call Stack & Memory Inspector
- Displays active stack frames top-to-bottom.
- In recursive algorithms (e.g., Tree Inversion, Tree Max), see stack frames push on recursive descent and pop on return.
- Shows local variables, parameter values, pointer memory addresses (`&n0`), and heap allocation counts.

### 6. Cursor Line Synchronization
- Check **Follow Cursor** to sync the memory visualization to whichever line your cursor is clicked on in the code editor.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Play / Pause execution |
| `Right Arrow` | Step forward |
| `Left Arrow` | Step backward |
| `R` | Reset to step 0 |
| `Tab` / `Enter` | Accept autocomplete suggestion |
| `Escape` | Close autocomplete / Close examples modal |

---

## 🌐 Free 1-Click Deployment Guide

Because this application runs entirely client-side using standard web technologies, it can be hosted for free with zero configuration:

### Option A: GitHub Pages (Recommended)
1. Push this repository to GitHub.
2. Go to your repository **Settings** → **Pages**.
3. Under **Build and deployment** → **Source**, select **GitHub Actions** or **Deploy from a branch**.
   - If deploying from branch: Select `main` branch and folder `/dist` (after running `npm run build`), or configure GitHub Pages action for Vite.

### Option B: Vercel (1-Click Free Hosting)
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New Project** and import `ptr_visualizer`.
3. Vercel automatically detects Vite:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Click **Deploy** — your live URL is ready in seconds!

### Option C: Netlify
1. Go to [netlify.com](https://netlify.com) and click **Import from Git**.
2. Select your `ptr_visualizer` repository.
3. Build command: `npm run build`, Publish directory: `dist`.
4. Click **Deploy Site**.

---

## 📄 License
MIT License. Free for educational and personal use.
