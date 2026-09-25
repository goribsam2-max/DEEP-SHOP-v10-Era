import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

modal_code = """
      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChatModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <button
                onClick={() => setShowNewChatModal(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition text-zinc-500"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">New Message</h3>
              <p className="text-sm text-zinc-500 mb-6">Enter a user's email address or mobile number to start chatting.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 uppercase tracking-wider">User Email or Phone</label>
                  <input
                    type="text"
                    value={newChatInput}
                    onChange={(e) => setNewChatInput(e.target.value)}
                    placeholder="e.g. user@example.com or +1234567890"
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#4E4AEB]/50 focus:border-[#4E4AEB] outline-none transition"
                  />
                </div>
                
                <button
                  onClick={handleStartNewChat}
                  disabled={isSearchingUser || !newChatInput.trim()}
                  className="w-full py-3 bg-[#4E4AEB] hover:bg-[#3d39db] disabled:opacity-50 text-white rounded-xl font-bold text-sm transition"
                >
                  {isSearchingUser ? 'Searching...' : 'Start Chat'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Custom Clear / Delete Chat Modal */}
      <AnimatePresence>
        {showClearChatModal && activeChat && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowClearChatModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 text-center">Clear Chat History</h3>
              <p className="text-sm text-zinc-500 mb-6 text-center">Are you sure you want to clear this chat history? This action cannot be undone.</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                      handleClearChat(activeChat.id);
                      setShowClearChatModal(false);
                  }}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition"
                >
                  Clear for me
                </button>
                <button
                  onClick={() => {
                      handleClearChatForEveryone(activeChat.id);
                      setShowClearChatModal(false);
                  }}
                  className="w-full py-3 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl font-bold text-sm transition"
                >
                  Clear for everyone
                </button>
                <button
                  onClick={() => setShowClearChatModal(false)}
                  className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl font-bold text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
"""

match = re.search(r'(\s*</AnimatePresence>\s*</div>\s*\);\s*})', content)
if match:
    new_content = content[:match.start()] + modal_code + content[match.start():]
    with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
        f.write(new_content)
    print("Injected Modals")
else:
    print("Could not find injection point")
