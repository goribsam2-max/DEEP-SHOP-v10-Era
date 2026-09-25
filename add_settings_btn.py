import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

old_btns = """                  <div className="flex items-center gap-2.5 shrink-0">
                      <button 
                          onClick={() => setShowP2pSearch(!showP2pSearch)} """

new_btns = """                  <div className="flex items-center gap-2.5 shrink-0">
                      <button 
                          onClick={() => setShowPrivacySettingsModal(true)} 
                          className="w-10 h-10 rounded-full flex items-center justify-center transition-all bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-sm text-zinc-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 active:scale-95"
                          title="Settings"
                      >
                          <Settings className="w-5 h-5" />
                      </button>
                      <button 
                          onClick={() => setShowP2pSearch(!showP2pSearch)} """

content = content.replace(old_btns, new_btns)

with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
    f.write(content)
print("Added settings button")
