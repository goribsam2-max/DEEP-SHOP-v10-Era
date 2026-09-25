const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const target = `                        if (isSystem) {`;
const replace = `                        if (msg.isDeletedForEveryone) {
                            return (
                                <div key={msg.id} className="flex justify-center my-4">
                                     <div className="border border-zinc-300 dark:border-zinc-700 rounded-xl px-4 py-2 text-[13px] text-zinc-500 italic bg-white/50 dark:bg-black/50 font-medium">
                                         Message is removed
                                     </div>
                                </div>
                            );
                        }
                        if (isSystem) {`;

code = code.replace(target, replace);
fs.writeFileSync('pages/Messages.tsx', code);
console.log("Deleted UI added");
