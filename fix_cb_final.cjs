const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const targetStart = `      {/* Delete Message Bottom Sheet */}`;
const indexOfStart = code.indexOf(targetStart);

if (indexOfStart !== -1) {
    const stringToFind = ` Turn Off
                    </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>`;
    
    // Normalize spaces to find end
    const findEnd = (text, snippet) => {
        const regex = new RegExp(snippet.replace(/\\s+/g, '\\s+').replace(/[.*+?^$\\{\\}()|[\\]\\\\]/g, '\\$&'));
        const match = text.match(regex);
        return match ? match.index + match[0].length : -1;
    }
    
    const targetEndString = `Turn Off                    </button>                )}              </div>            </motion.div>          </div>        )}      </AnimatePresence>`;
    
    // We can just use the string literal since we know it
    const afterStart = code.substring(indexOfStart);
    const indexOfEnd = afterStart.indexOf("</AnimatePresence>", afterStart.indexOf("</AnimatePresence>") + 10) + "</AnimatePresence>".length;
    
    const blockToRemove = afterStart.substring(0, indexOfEnd);
    if(blockToRemove.includes('Delete Message Bottom Sheet')) {
         code = code.replace(blockToRemove, '      </div>');
         
         const eofTarget = `    </div>\n  );\n}`;
         code = code.replace(eofTarget, blockToRemove + '\n' + eofTarget);
         
         fs.writeFileSync('pages/Messages.tsx', code);
         console.log("Success");
    } else {
        console.log("Error logic");
    }
} else {
    console.log("Start not found");
}
