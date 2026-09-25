const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

// The User details modal container
code = code.replace(/<div className="flex-1 flex flex-col bg-\[#1C1C1D\] text-white overflow-y-auto no-scrollbar font-inter">/g, 
'<div className="flex-1 flex flex-col bg-zinc-50 dark:bg-[#1C1C1D] text-zinc-900 dark:text-white overflow-y-auto no-scrollbar font-inter">');
code = code.replace(/<div className="sticky top-0 z-10 bg-\[#1C1C1D\] px-4 py-3 flex items-center justify-between">/g, 
'<div className="sticky top-0 z-10 bg-zinc-50 dark:bg-[#1C1C1D] px-4 py-3 flex items-center justify-between">');

// Colors
code = code.replace(/text-white/g, 'text-zinc-900 dark:text-white');
// careful with some text-white that are inside emerald/red bg
// the generic ones:
code = code.replace(/bg-zinc-800\/80/g, 'bg-white dark:bg-zinc-800/80 shadow-sm dark:shadow-none');
code = code.replace(/bg-zinc-800\/50/g, 'bg-white dark:bg-zinc-800/50 shadow-sm dark:shadow-none');
code = code.replace(/bg-[#333]/g, 'bg-zinc-200 dark:bg-[#333]');
code = code.replace(/border-black\/20/g, 'border-zinc-200 dark:border-white/10');
code = code.replace(/bg-zinc-800/g, 'bg-zinc-200 dark:bg-zinc-800');
code = code.replace(/border-zinc-700/g, 'border-zinc-300 dark:border-zinc-700');

fs.writeFileSync('pages/Messages.tsx', code);
