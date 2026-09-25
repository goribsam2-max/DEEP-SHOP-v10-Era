import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

# Replace the private chat one
old_btn = """                          <button 
                            type="button"
                            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition" 
                            title="Search Chat"
                          >"""
new_btn = """                          <button 
                            type="button"
                            onClick={() => setShowP2pSearch(!showP2pSearch)}
                            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition" 
                            title="Search Chat"
                          >"""
content = content.replace(old_btn, new_btn)

# Replace the community chat one too just in case
old_btn2 = """                              <button 
                                type="button"
                                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition hidden sm:flex" 
                                title="Search Chat"
                              >"""
new_btn2 = """                              <button 
                                type="button"
                                onClick={() => setShowP2pSearch(!showP2pSearch)}
                                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition hidden sm:flex" 
                                title="Search Chat"
                              >"""
content = content.replace(old_btn2, new_btn2)

with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
    f.write(content)
print("Updated Search buttons")
