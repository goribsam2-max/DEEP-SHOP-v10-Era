const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const regex = /if\s*\(msg\.isDeletedForEveryone\)\s*\{\s*return\s*\(\s*<div key=\{msg\.id\} className="flex justify-center my-4">\s*<div className="border border-zinc-300 dark:border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2 text-\[13px\] text-zinc-500 italic bg-white\/50 dark:bg-black\/50 font-medium">\s*Message is removed\s*<\/div>\s*<\/div>\s*\);\s*\}/;

const newDeletedHTML = `if (msg.isDeletedForEveryone) {
                            return (
                                <div key={msg.id} className={\`flex w-full mb-1 \${isMe ? 'justify-end' : 'justify-start'}\`}>
                                     <div className={\`flex max-w-[85%] sm:max-w-[75%] \${isMe ? 'flex-row-reverse' : 'flex-row'}\`}>
                                         {!isMe && (
                                             <div className="w-7 h-7 shrink-0 mr-2 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800/50 mt-auto shadow-sm">
                                                 {showAvatar ? (
                                                     activeChat?.otherUser?.photoURL ? 
                                                         <img src={activeChat.otherUser.photoURL} alt="Avatar" className="w-full h-full object-cover" /> :
                                                         <div className="w-full h-full flex items-center justify-center text-xs font-bold text-emerald-500 bg-emerald-900/30">
                                                             {(activeChat?.otherUser?.displayName || 'U')[0].toUpperCase()}
                                                         </div>
                                                 ) : <div className="w-full h-full bg-transparent" />}
                                             </div>
                                         )}
                                         <div className="flex flex-col relative">
                                             <div className={\`px-4 py-2 text-[15px] \${isMe ? 'bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-3xl rounded-tr-sm text-zinc-500 italic' : 'bg-transparent border border-zinc-300 dark:border-zinc-700 rounded-3xl rounded-tl-sm text-zinc-500 italic'}\`}>
                                                 <div className="flex items-center gap-1.5 opacity-70">
                                                     <Trash className="w-3.5 h-3.5" />
                                                     <span>This message was deleted</span>
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                </div>
                            );
                         }`;

code = code.replace(regex, newDeletedHTML);

fs.writeFileSync('pages/Messages.tsx', code);
