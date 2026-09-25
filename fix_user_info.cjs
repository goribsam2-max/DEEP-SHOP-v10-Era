const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const target = `{showUserInfoModal && activeChat && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl font-inter flex flex-col relative"
            >
              <div className="p-4 flex items-center justify-between">
                <button onClick={() => setShowUserInfoModal(false)} className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                  <ArrowLeft className="w-6 h-6 text-zinc-900 dark:text-white" />
                </button>
                <div className="relative">
                  <button onClick={() => setShowUserMenu(!showUserMenu)} className="p-2 -mr-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                    <MoreVertical className="w-6 h-6 text-zinc-900 dark:text-white" />
                  </button>
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 py-2 z-50"
                      >
                        <button className="w-full text-left px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-between">
                          <span>Auto-Delete</span>
                          <ChevronLeft className="w-4 h-4 rotate-180" />
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          Block user
                        </button>
                        <button className="w-full text-left px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2">
                          <PinOff className="w-4 h-4" />
                          Disable Sharing
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="flex flex-col items-center pt-2 pb-6 px-6 border-b border-zinc-100 dark:border-zinc-800">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 mb-4 border border-zinc-200 dark:border-zinc-700">
                  {activeChat.otherUser?.photoURL ? (
                    <img src={activeChat.otherUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30">
                      {(activeChat.otherUser?.displayName || activeChat.otherUser?.shopName || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                  {activeChat.otherUser?.shopName || activeChat.otherUser?.displayName || 'Unknown User'}
                </h2>
                <p className="text-sm text-zinc-500 mt-1">last seen recently</p>
                
                <div className="flex items-center gap-3 mt-6 w-full px-4">
                  <button onClick={() => setShowUserInfoModal(false)} className="flex-1 flex flex-col items-center justify-center py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">
                    <MessageSquareShare className="w-5 h-5 text-zinc-900 dark:text-white mb-1.5" />
                    <span className="text-[11px] font-bold text-zinc-900 dark:text-white">Message</span>
                  </button>
                  <button className="flex-1 flex flex-col items-center justify-center py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">
                    <VolumeX className="w-5 h-5 text-zinc-900 dark:text-white mb-1.5" />
                    <span className="text-[11px] font-bold text-zinc-900 dark:text-white">Mute</span>
                  </button>
                  <button onClick={() => { setShowUserInfoModal(false); startCall('audio'); }} className="flex-1 flex flex-col items-center justify-center py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">
                    <Phone className="w-5 h-5 text-zinc-900 dark:text-white mb-1.5" />
                    <span className="text-[11px] font-bold text-zinc-900 dark:text-white">Call</span>
                  </button>
                </div>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-[#1C1C1D]">
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-zinc-100 dark:border-zinc-800">
                  <p className="text-base text-zinc-900 dark:text-zinc-100">{activeChat.otherUser?.email || "Unknown"}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{activeChat.otherUser?.email ? "Email" : "Mobile"}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}`;

const replacement = `{showUserInfoModal && activeChat && (
          <div className="fixed inset-0 z-[10000] flex flex-col bg-[#1C1C1D] text-white overflow-y-auto no-scrollbar font-inter">
              {/* Telegram-style User Info Header */}
              <div className="sticky top-0 z-10 bg-[#1C1C1D] px-4 py-3 flex items-center justify-between">
                  <button 
                      onClick={() => setShowUserInfoModal(false)}
                      className="p-1 rounded-full text-white transition"
                  >
                      <ArrowLeft className="w-6 h-6" />
                  </button>
                  <div className="relative">
                      <button onClick={() => setShowUserMenu(!showUserMenu)} className="p-1 rounded-full text-white transition">
                          <MoreVertical className="w-6 h-6" />
                      </button>
                      <AnimatePresence>
                        {showUserMenu && (
                          <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 rounded-xl shadow-lg border border-zinc-700 py-2 z-50 overflow-hidden"
                          >
                            <button onClick={() => {
                                setShowUserMenu(false);
                                // Open auto delete menu
                                setTimeout(() => window.dispatchEvent(new CustomEvent('open-auto-delete')), 50);
                            }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-700 flex items-center justify-between transition">
                              <div className="flex items-center gap-3">
                                <Clock className="w-5 h-5 text-zinc-400" />
                                <span>Auto-Delete</span>
                              </div>
                            </button>
                            <button onClick={async () => {
                                setShowUserMenu(false);
                                const isBlocked = activeChat.blockedBy?.includes(user?.uid);
                                try {
                                    if(isBlocked) {
                                        await updateDoc(doc(db, 'p2p_chats', activeChat.id), {
                                            blockedBy: activeChat.blockedBy.filter((id) => id !== user?.uid)
                                        });
                                        notify("User unblocked", "success");
                                    } else {
                                        const currentBlocked = activeChat.blockedBy || [];
                                        await updateDoc(doc(db, 'p2p_chats', activeChat.id), {
                                            blockedBy: [...currentBlocked, user?.uid]
                                        });
                                        notify("User blocked", "info");
                                    }
                                } catch(e) {
                                    console.error(e);
                                    notify("Failed to update block status", "error");
                                }
                            }} className="w-full text-left px-4 py-3 text-sm text-rose-500 hover:bg-zinc-700 flex items-center gap-3 transition">
                              <AlertCircle className="w-5 h-5" />
                              <span>{activeChat.blockedBy?.includes(user?.uid) ? "Unblock user" : "Block user"}</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                  </div>
              </div>
              
              <div className="p-4 sm:p-6 w-full max-w-2xl mx-auto flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800 mb-4 border border-zinc-700">
                    {activeChat.otherUser?.photoURL ? (
                      <img src={activeChat.otherUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-emerald-500 bg-emerald-900/30">
                        {(activeChat.otherUser?.displayName || activeChat.otherUser?.shopName || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-1.5">
                      {activeChat.otherUser?.shopName || activeChat.otherUser?.displayName || 'Unknown User'}
                  </h2>
                  <p className="text-zinc-400 text-sm mt-1">last seen recently</p>
                  
                  <div className="flex items-center gap-3 mt-6 w-full">
                      <button onClick={() => setShowUserInfoModal(false)} className="flex-1 flex flex-col items-center justify-center py-2 bg-zinc-800/80 rounded-2xl hover:bg-zinc-700 transition">
                          <MessageSquareShare className="w-5 h-5 text-white mb-1.5" />
                          <span className="text-[11px] font-bold text-white">Message</span>
                      </button>
                      <button className="flex-1 flex flex-col items-center justify-center py-2 bg-zinc-800/80 rounded-2xl hover:bg-zinc-700 transition">
                          <VolumeX className="w-5 h-5 text-white mb-1.5" />
                          <span className="text-[11px] font-bold text-white">Mute</span>
                      </button>
                      <button onClick={() => { setShowUserInfoModal(false); startCall('audio'); }} className="flex-1 flex flex-col items-center justify-center py-2 bg-zinc-800/80 rounded-2xl hover:bg-zinc-700 transition">
                          <Phone className="w-5 h-5 text-white mb-1.5" />
                          <span className="text-[11px] font-bold text-white">Call</span>
                      </button>
                      <button onClick={() => { setShowUserInfoModal(false); startCall('video'); }} className="flex-1 flex flex-col items-center justify-center py-2 bg-zinc-800/80 rounded-2xl hover:bg-zinc-700 transition">
                          <Video className="w-5 h-5 text-white mb-1.5" />
                          <span className="text-[11px] font-bold text-white">Video</span>
                      </button>
                  </div>

                  <div className="w-full mt-6 bg-zinc-800/50 rounded-[20px] flex flex-col">
                      <div className="p-4 text-left border-b border-black/20">
                          <p className="text-[15px] text-white mb-0.5">{activeChat.otherUser?.email || "No email provided"}</p>
                          <p className="text-[12px] text-zinc-500">{activeChat.otherUser?.email ? "Email" : "Contact info"}</p>
                      </div>
                      <div className="p-4 text-left">
                          <p className="text-[15px] text-white mb-0.5">@{activeChat.otherUser?.displayName?.toLowerCase().replace(/ /g, '') || 'user'}</p>
                          <p className="text-[12px] text-zinc-500">Username</p>
                      </div>
                  </div>
                  
                  <div className="w-full mt-4 flex items-center justify-center p-2 mb-20">
                      <div className="bg-zinc-800/80 rounded-[20px] flex p-[2px]">
                          <button className="px-8 py-1.5 rounded-[18px] bg-[#333] text-sm text-white font-medium">Media</button>
                          <button className="px-8 py-1.5 rounded-[18px] text-sm text-zinc-400 font-medium hover:text-white transition">Links</button>
                      </div>
                  </div>
              </div>
          </div>
        )}`;

if (code.includes(target)) {
    // Escape target correctly for string replacement
    code = code.replace(target, replacement);
    fs.writeFileSync('pages/Messages.tsx', code);
    console.log("User profile replaced");
} else {
    console.log("Target not found");
}
