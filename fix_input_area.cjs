const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const target = `                     </AnimatePresence>
                     
                     <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700">`;

const replace = `                     </AnimatePresence>
                     
                     {activeChat.blockedBy?.length > 0 ? (
                         <div className="flex justify-center items-center py-3 bg-zinc-100 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 text-sm font-medium">
                             {activeChat.blockedBy.includes(user?.uid) ? "You blocked this user." : "You have been blocked."}
                         </div>
                     ) : (
                     <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700">`;

const targetEnd = `                         </button>
                     </div>
                 </div>
             </>
         )}
      </div>`;

const replaceEnd = `                         </button>
                     </div>
                     )}
                 </div>
             </>
         )}
      </div>`;

if(code.includes(target) && code.includes(targetEnd)) {
    code = code.replace(target, replace);
    code = code.replace(targetEnd, replaceEnd);
    fs.writeFileSync('pages/Messages.tsx', code);
    console.log("Input area fixed");
} else {
    console.log("Target not found");
}
