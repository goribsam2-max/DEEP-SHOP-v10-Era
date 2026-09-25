import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

old_search = """                         <button 
                           type="button"
                           className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition" 
                           title="Search Chat"
                         >
                             <Search className="w-5 h-5" />
                         </button>"""

new_search = """                         <button 
                           type="button"
                           onClick={() => setShowP2pSearch(!showP2pSearch)}
                           className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition" 
                           title="Search Chat"
                         >
                             <Search className="w-5 h-5" />
                         </button>"""

if old_search in content:
    content = content.replace(old_search, new_search)
    with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
        f.write(content)
    print("Fixed Search Icon in P2P chat")
else:
    print("Could not find search icon")
