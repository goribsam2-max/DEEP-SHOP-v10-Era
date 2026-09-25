import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

# I will just use regex to replace the Clear History and Delete Chat buttons.
match = re.search(r'(<button\s+onClick=\{\(\) => \{\s*setShowPrivateChatMenu\(false\);\s*confirm\(\{.*?\}\);\s*\}\}.*?Clear History</span>\s*</button>\s*\{/\* Delete Chat \*/\}\s*<button\s+onClick=\{\(\) => \{\s*setShowPrivateChatMenu\(false\);\s*confirm\(\{.*?\}\);\s*\}\}.*?Delete Chat</span>\s*</button>)', content, re.DOTALL)

if match:
    new_btns = """<button 
                                   onClick={() => {
                                     setShowPrivateChatMenu(false);
                                     setShowClearChatModal(true);
                                   }}
                                   className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-xl transition-colors"
                                 >
                                   <Clock className="w-4 h-4" />
                                   <span>Clear History</span>
                                 </button>

                                 {/* Delete Chat */}
                                 <button 
                                   onClick={() => {
                                     setShowPrivateChatMenu(false);
                                     setShowClearChatModal(true);
                                   }}
                                   className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                   <span>Delete Chat</span>
                                 </button>"""
    
    content = content[:match.start()] + new_btns + content[match.end():]
    with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
        f.write(content)
    print("Replaced buttons")
else:
    print("Could not find regex match")
