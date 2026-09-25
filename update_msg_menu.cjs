const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const targetMenu = `                  <button 
                      onClick={() => {
                          setActiveMessageMenuId(null);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-2xl transition text-rose-600 dark:text-rose-500 font-semibold text-[15px]"
                  >
                      <AlertCircle className="w-5 h-5" />
                      Report
                  </button>`;
                  
const replaceMenu = `                  <button 
                      onClick={() => {
                          const id = activeMessageMenuId;
                          setActiveMessageMenuId(null);
                          setTimeout(() => window.dispatchEvent(new CustomEvent('open-delete-message', { detail: { msgId: id }})), 50);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-2xl transition text-rose-600 dark:text-rose-500 font-semibold text-[15px]"
                  >
                      <Trash className="w-5 h-5" />
                      Remove
                  </button>
                  <button 
                      onClick={() => {
                          setActiveMessageMenuId(null);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-2xl transition text-rose-600 dark:text-rose-500 font-semibold text-[15px]"
                  >
                      <AlertCircle className="w-5 h-5" />
                      Report
                  </button>`;

if(code.includes(targetMenu)) {
    code = code.replace(targetMenu, replaceMenu);
    fs.writeFileSync('pages/Messages.tsx', code);
    console.log("Menu replaced");
} else {
    console.log("Menu Target not found");
}
