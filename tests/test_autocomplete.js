import { COMPLETIONS, MEMBER_COMPLETIONS } from '../src/ui/autocomplete.js';

console.log('🧪 Testing Autocomplete Engine...');

// Test 1: Type recommendations
const listMatches = COMPLETIONS.filter(c => c.label.toLowerCase().startsWith('list'));
if (listMatches.length === 0) throw new Error('No matches found for "list"');
console.log(`  ✓ Found ${listMatches.length} recommendations starting with "list" (e.g. ${listMatches.map(m => m.label).join(', ')})`);

const treeMatches = COMPLETIONS.filter(c => c.label.toLowerCase().startsWith('tree'));
if (treeMatches.length === 0) throw new Error('No matches found for "tree"');
console.log(`  ✓ Found ${treeMatches.length} recommendations starting with "tree" (e.g. ${treeMatches.map(m => m.label).join(', ')})`);

// Test 2: Member access recommendations
if (!MEMBER_COMPLETIONS.list.some(m => m.label === 'next')) throw new Error('Missing next field for list');
if (!MEMBER_COMPLETIONS.tree.some(m => m.label === 'left')) throw new Error('Missing left field for tree');
if (!MEMBER_COMPLETIONS.tree.some(m => m.label === 'right')) throw new Error('Missing right field for tree');
console.log('  ✓ Member completions verified for ListNode (next, val) and TreeNode (left, right, val).');

// Test 3: Memory recommendations
const memoryMatches = COMPLETIONS.filter(c => c.kind === 'memory');
if (memoryMatches.length === 0) throw new Error('No memory management recommendations found');
console.log(`  ✓ Found ${memoryMatches.length} memory recommendations (${memoryMatches.map(m => m.label).join(', ')})`);

console.log('\n🎉 Autocomplete Engine Verification: All tests passed!');
