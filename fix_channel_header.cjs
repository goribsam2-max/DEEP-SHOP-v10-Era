const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const target = `                      {/* Active Community Channel Header */}
                      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 z-10 shadow-sm cursor-pointer" onClick={() => setShowChannelDetailsModal(true)}>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSearchParams({}); }} 
                            className="md:hidden p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition shrink-0"
                            title="Back to Communities"
                          >
                              <ChevronLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                          </button>
                          
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 border border-zinc-200 dark:border-zinc-700">
                              <img src={activeChannel.imageUrl} alt={activeChannel.name} className="w-full h-full object-cover animate-fade-in" />
                          </div>
                          
                          <div className="min-w-0">
                              <h3 className="font-bold text-[15px] text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1">
                                  <span>{activeChannel.name}</span>
                                  <Sparkles className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500 shrink-0" />
                              </h3>
                              <p className="text-[10px] font-bold text-zinc-500 truncate flex items-center gap-1.5">
                                  <span>@{activeChannel.customLink}</span>
                                  <span>•</span>
                                  <span className="text-emerald-600 dark:text-emerald-400">{activeChannel.subscriberCount || 1} subscribers</span>
                              </p>
                          </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                          {userSubscription ? (
                              <button 
                                type="button"
                                onClick={() => handleToggleMuteChannel(activeChannel, userSubscription.muted)} 
                                className={cn(
                                  "p-2.5 rounded-xl transition",
                                  userSubscription.muted 
                                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600" 
                                    : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100"
                                )} 
                                title={userSubscription.muted ? "Unmute Channel" : "Mute Channel"}
                              >
                                  {userSubscription.muted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
                              </button>
                          ) : (
                              <button 
                                type="button"
                                onClick={() => handleSubscribeToChannel(activeChannel)} 
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1.5"
                              >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Subscribe</span>
                              </button>
                          )}
                          
                          <button 
                            type="button"
                            onClick={() => setShowChannelDetailsModal(true)} 
                            className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition" 
                            title="Channel Details"
                          >
                              <Info className="w-4.5 h-4.5" />
                          </button>
                      </div>`;

const replacement = `                      {/* Active Community Channel Header */}
                      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 z-10 shadow-sm cursor-pointer" onClick={() => setShowChannelDetailsModal(true)}>
                          <div className="flex items-center gap-3 min-w-0">
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSearchParams({}); }} 
                                className="md:hidden p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition shrink-0 -ml-2"
                                title="Back to Communities"
                              >
                                  <ArrowLeft className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
                              </button>
                              
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0">
                                  <img src={activeChannel.imageUrl} alt={activeChannel.name} className="w-full h-full object-cover" />
                              </div>
                              
                              <div className="min-w-0 flex-1">
                                  <h3 className="font-bold text-[16px] text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5 leading-tight">
                                      <span>{activeChannel.name}</span>
                                      <div className="flex items-center justify-center bg-[#2AABEE] rounded-full p-[2px]">
                                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                      </div>
                                  </h3>
                                  <p className="text-[13px] text-emerald-600 dark:text-emerald-400 truncate mt-0.5 leading-tight">
                                      {activeChannel.subscriberCount || 1} subscribers
                                  </p>
                              </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-4">
                              {userSubscription?.muted ? (
                                  <VolumeX className="w-5 h-5 text-zinc-400 mr-2" />
                              ) : (
                                  <Volume2 className="w-5 h-5 text-zinc-400 mr-2" />
                              )}
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setShowChannelDetailsModal(true); }} 
                                className="p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition" 
                                title="More Options"
                              >
                                  <MoreVertical className="w-6 h-6" />
                              </button>
                          </div>
                      </div>`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('pages/Messages.tsx', code);
    console.log("Header replaced");
} else {
    console.log("Target not found");
}
