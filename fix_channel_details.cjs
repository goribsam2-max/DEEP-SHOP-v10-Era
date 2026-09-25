const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const regex = /showChannelDetailsModal \? \([\s\S]*?\) : \(\s*<>\s*\{\/\* Active Community Channel Header \*\/\}/;
const match = code.match(regex);
if (match) {
    let replaced = match[0];
    
    // Replace hardcoded dark colors
    replaced = replaced.replace(/bg-\[#1C1C1D\]/g, 'bg-zinc-50 dark:bg-[#1C1C1D]');
    replaced = replaced.replace(/text-white/g, 'text-zinc-900 dark:text-white');
    replaced = replaced.replace(/bg-zinc-800\/80/g, 'bg-white dark:bg-zinc-800/80 shadow-sm dark:shadow-none');
    replaced = replaced.replace(/bg-zinc-800\/50/g, 'bg-white dark:bg-zinc-800/50 shadow-sm dark:shadow-none');
    replaced = replaced.replace(/hover:bg-zinc-700\/50/g, 'hover:bg-zinc-100 dark:hover:bg-zinc-700/50');
    replaced = replaced.replace(/bg-zinc-700\/50/g, 'bg-zinc-100 dark:bg-zinc-700/50');
    replaced = replaced.replace(/border-black\/20/g, 'border-zinc-200 dark:border-white/10');
    replaced = replaced.replace(/bg-zinc-800/g, 'bg-zinc-200 dark:bg-zinc-800');
    replaced = replaced.replace(/border-zinc-700/g, 'border-zinc-300 dark:border-zinc-700');
    
    // Add onClick to edit button
    replaced = replaced.replace(/<button className="p-1 rounded-full text-zinc-900 dark:text-white transition">\s*\{activeChannel\.creatorId === user\?\.uid \? <Edit className="w-6 h-6" \/> : <MoreVertical className="w-6 h-6" \/>\}\s*<\/button>/, 
    `<button onClick={() => { if(activeChannel.creatorId === user?.uid) { setShowChannelDetailsModal(false); handleEditChannel(); } }} className="p-1 rounded-full text-zinc-900 dark:text-white transition">
        {activeChannel.creatorId === user?.uid ? <Edit className="w-6 h-6" /> : <MoreVertical className="w-6 h-6" />}
    </button>`);
    
    // Add link copy functionality
    replaced = replaced.replace(/t\.me\/\{activeChannel\.customLink\}/g, `\${window.location.origin}/messages?channel=\${activeChannel.id}`);
    replaced = replaced.replace(/<div className="flex items-center justify-between border-t border-zinc-200 dark:border-white\/10 p-4 cursor-pointer">/,
    `<div onClick={async () => {
        try {
            await navigator.clipboard.writeText(\`\${window.location.origin}/messages?channel=\${activeChannel.id}\`);
            notify("Link copied!", "success");
        } catch(e) {}
    }} className="flex items-center justify-between border-t border-zinc-200 dark:border-white/10 p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5 transition">`);
    
    // Remove Live stream and Add Story from creator view
    replaced = replaced.replace(/<button className="flex-1 flex flex-col items-center justify-center py-2 bg-white dark:bg-zinc-800\/80 shadow-sm dark:shadow-none rounded-2xl hover:bg-zinc-700 transition">\s*<div className="w-5 h-5 flex flex-col justify-center space-y-0\.5 mb-1\.5">[\s\S]*?<span className="text-\[11px\] font-bold text-zinc-900 dark:text-white">Live Stream<\/span>\s*<\/button>/, '');
    replaced = replaced.replace(/<button className="flex-1 flex flex-col items-center justify-center py-2 bg-white dark:bg-zinc-800\/80 shadow-sm dark:shadow-none rounded-2xl hover:bg-zinc-700 transition">\s*<div className="w-5 h-5 border-\[2\.5px\] border-zinc-900 dark:border-white rounded-full flex items-center justify-center mb-1\.5">\s*<Plus className="w-3 h-3 text-zinc-900 dark:text-white" \/>\s*<\/div>\s*<span className="text-\[11px\] font-bold text-zinc-900 dark:text-white">Add Story<\/span>\s*<\/button>/, '');

    // Replace mute buttons for proper styling in hover
    replaced = replaced.replace(/hover:bg-zinc-700/g, 'hover:bg-zinc-100 dark:hover:bg-zinc-700');

    // Make Share button copy the link
    replaced = replaced.replace(/<button className="flex-1 flex flex-col items-center justify-center py-2 bg-white dark:bg-zinc-800\/80 shadow-sm dark:shadow-none rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition">\s*<Forward className="w-5 h-5 text-zinc-900 dark:text-white mb-1\.5" \/>\s*<span className="text-\[11px\] font-bold text-zinc-900 dark:text-white">Share<\/span>\s*<\/button>/,
    `<button onClick={async () => {
        try {
            await navigator.clipboard.writeText(\`\${window.location.origin}/messages?channel=\${activeChannel.id}\`);
            notify("Link copied!", "success");
        } catch(e) {}
    }} className="flex-1 flex flex-col items-center justify-center py-2 bg-white dark:bg-zinc-800/80 shadow-sm dark:shadow-none rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-700 transition">
        <Forward className="w-5 h-5 text-zinc-900 dark:text-white mb-1.5" />
        <span className="text-[11px] font-bold text-zinc-900 dark:text-white">Share</span>
    </button>`);
    
    code = code.replace(match[0], replaced);
    fs.writeFileSync('pages/Messages.tsx', code);
    console.log("Replaced successfully");
} else {
    console.log("Match not found");
}
