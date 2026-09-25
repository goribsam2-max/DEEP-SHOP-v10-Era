with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    lines = f.readlines()

new_modal = """      {/* --- Privacy & Chat Settings Modal --- */}
      <AnimatePresence>
        {showPrivacySettingsModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPrivacySettingsModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl overflow-hidden relative z-10 font-inter shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#111111]/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-none mb-1">
                          Privacy & Settings
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Manage your communication</p>
                    </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowPrivacySettingsModal(false)}
                  className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5">
                <div className="space-y-3">
                    <h4 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1">
                        Direct Messages
                    </h4>
                    
                    <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Allow Direct Messages
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Anyone can send you a message. If turned off, users will see a privacy notice.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                            const newStatus = !privacySettings.allowDirectMessages;
                            setPrivacySettings({ ...privacySettings, allowDirectMessages: newStatus });
                            if (user) await updateDoc(doc(db, 'users', user.uid), { 'privacy.allowDirectMessages': newStatus });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.allowDirectMessages ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.allowDirectMessages ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Online Status
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Show others when you are online in chats.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                            const newStatus = !privacySettings.showOnlineStatus;
                            setPrivacySettings({ ...privacySettings, showOnlineStatus: newStatus });
                            if (user) await updateDoc(doc(db, 'users', user.uid), { 'privacy.showOnlineStatus': newStatus });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.showOnlineStatus ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.showOnlineStatus ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between opacity-50 cursor-not-allowed">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Read Receipts
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Let others know when you've read their messages. (Coming Soon)
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled
                        className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed rounded-full border-2 border-transparent bg-indigo-500 transition-colors duration-200 ease-in-out"
                      >
                        <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-5" />
                      </button>
                    </div>
                </div>

                <div className="space-y-3 pt-2">
                    <h4 className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider ml-1">
                        Notifications
                    </h4>
                    
                    <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Push Notifications
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Receive alerts for new messages and calls.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                            const newStatus = !privacySettings.pushNotifications;
                            setPrivacySettings({ ...privacySettings, pushNotifications: newStatus });
                            if (user) await updateDoc(doc(db, 'users', user.uid), { 'privacy.pushNotifications': newStatus });
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${privacySettings.pushNotifications ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${privacySettings.pushNotifications ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>
                </div>
              </div>

              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50">
                <button
                  type="button"
                  onClick={() => setShowPrivacySettingsModal(false)}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20 transition flex justify-center items-center"
                >
                  Close Settings
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>\n"""

del lines[5800:5954]
lines.insert(5800, new_modal)

with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
    f.writelines(lines)
print("Replaced settings modal successfully")
