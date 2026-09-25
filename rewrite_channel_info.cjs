const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const regex = /showChannelDetailsModal \? \([\s\S]*?\) : \(\s*<>/;

const replacement = `showChannelDetailsModal ? (
                 <div className="flex-1 flex flex-col bg-[#1C1C1D] text-white overflow-y-auto no-scrollbar font-inter">
                     {/* Telegram-style Channel Info Header */}
                     <div className="sticky top-0 z-10 bg-[#1C1C1D] px-4 py-3 flex items-center justify-between">
                         <button 
                             onClick={() => setShowChannelDetailsModal(false)}
                             className="p-1 rounded-full text-white transition"
                         >
                             <ArrowLeft className="w-6 h-6" />
                         </button>
                         <button className="p-1 rounded-full text-white transition">
                             {activeChannel.creatorId === user?.uid ? <Edit className="w-6 h-6" /> : <MoreVertical className="w-6 h-6" />}
                         </button>
                     </div>
                     <div className="p-4 sm:p-6 w-full max-w-2xl mx-auto flex flex-col items-center">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-800 mb-4 border border-zinc-700">
                            <img src={activeChannel.imageUrl} alt="Channel cover" className="w-full h-full object-cover" />
                        </div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-1.5">
                            {activeChannel.name}
                            <div className="flex items-center justify-center bg-[#2AABEE] rounded-full p-[2px]">
                                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                        </h2>
                        <p className="text-zinc-400 text-sm mt-1">{activeChannel.creatorId === user?.uid ? 'public channel' : \`\${activeChannel.subscriberCount || 1} subscribers\`}</p>
                        
                        <div className="flex items-center justify-center gap-6 mt-6 w-full">
                            {activeChannel.creatorId === user?.uid ? (
                                <>
                                    <button className="flex-1 flex flex-col items-center justify-center py-2 bg-zinc-800/80 rounded-2xl hover:bg-zinc-700 transition">
                                        <div className="w-5 h-5 flex flex-col justify-center space-y-0.5 mb-1.5">
                                            <div className="w-full h-[3px] bg-white rounded-full"></div>
                                            <div className="w-full h-[3px] bg-white rounded-full"></div>
                                            <div className="w-full h-[3px] bg-white rounded-full"></div>
                                        </div>
                                        <span className="text-[11px] font-bold text-white">Live Stream</span>
                                    </button>
                                    <button onClick={() => handleToggleMuteChannel(activeChannel, userSubscription?.muted)} className="flex-1 flex flex-col items-center justify-center py-2 bg-zinc-800/80 rounded-2xl hover:bg-zinc-700 transition">
                                        <VolumeX className="w-5 h-5 text-white mb-1.5" />
                                        <span className="text-[11px] font-bold text-white">{userSubscription?.muted ? "Unmute" : "Mute"}</span>
                                    </button>
                                    <button className="flex-1 flex flex-col items-center justify-center py-2 bg-zinc-800/80 rounded-2xl hover:bg-zinc-700 transition">
                                        <div className="w-5 h-5 border-[2.5px] border-white rounded-full flex items-center justify-center mb-1.5">
                                            <Plus className="w-3 h-3 text-white" />
                                        </div>
                                        <span className="text-[11px] font-bold text-white">Add Story</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => { if(!userSubscription) handleSubscribeToChannel(activeChannel); else handleUnsubscribeFromChannel(activeChannel); }} className="flex-1 flex flex-col items-center justify-center py-2 bg-zinc-800/80 rounded-2xl hover:bg-zinc-700 transition">
                                        {userSubscription ? <X className="w-5 h-5 text-white mb-1.5" /> : <User className="w-5 h-5 text-white mb-1.5" />}
                                        <span className="text-[11px] font-bold text-white">{userSubscription ? "Leave" : "Join"}</span>
                                    </button>
                                    <button onClick={() => handleToggleMuteChannel(activeChannel, userSubscription?.muted)} className="flex-1 flex flex-col items-center justify-center py-2 bg-zinc-800/80 rounded-2xl hover:bg-zinc-700 transition">
                                        <VolumeX className="w-5 h-5 text-white mb-1.5" />
                                        <span className="text-[11px] font-bold text-white">{userSubscription?.muted ? "Unmute" : "Mute"}</span>
                                    </button>
                                    <button className="flex-1 flex flex-col items-center justify-center py-2 bg-zinc-800/80 rounded-2xl hover:bg-zinc-700 transition">
                                        <Forward className="w-5 h-5 text-white mb-1.5" />
                                        <span className="text-[11px] font-bold text-white">Share</span>
                                    </button>
                                    <button className="flex-1 flex flex-col items-center justify-center py-2 bg-zinc-800/80 rounded-2xl hover:bg-zinc-700 transition">
                                        <AlertCircle className="w-5 h-5 text-white mb-1.5" />
                                        <span className="text-[11px] font-bold text-white">Report</span>
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="w-full mt-6 bg-zinc-800/50 rounded-[20px] flex flex-col">
                            <div className="p-4 text-left cursor-pointer">
                                <p className="text-[15px] text-white mb-1">
                                    <span className="font-bold">👑 {activeChannel.name} 👑</span><br/>
                                    {activeChannel.description || "Welcome to our exclusive product broadcast channel. Join for periodic updates, visual arrivals, and direct chat links!"}
                                </p>
                                <p className="text-[12px] text-zinc-500">Description</p>
                            </div>
                            <div className="flex items-center justify-between border-t border-black/20 p-4 cursor-pointer">
                                <div>
                                    <p className="text-[15px] text-white">t.me/{activeChannel.customLink}</p>
                                    <p className="text-[12px] text-zinc-500">Invite Link</p>
                                </div>
                                <div className="p-1"><div className="w-8 h-8 rounded bg-zinc-700/50 flex items-center justify-center"><Link className="w-4 h-4 text-white" /></div></div>
                            </div>
                        </div>

                        {activeChannel.creatorId === user?.uid && (
                            <div className="w-full mt-4 bg-zinc-800/50 rounded-[20px] flex flex-col py-1">
                                <div className="flex items-center justify-between p-3.5 hover:bg-zinc-700/50 cursor-pointer transition">
                                    <div className="flex items-center gap-4">
                                        <Users className="w-6 h-6 text-zinc-400" />
                                        <span className="text-[15px] text-white">Subscribers</span>
                                    </div>
                                    <span className="text-[15px] text-[#2AABEE]">{activeChannel.subscriberCount || 1}</span>
                                </div>
                                <div className="flex items-center justify-between p-3.5 hover:bg-zinc-700/50 cursor-pointer transition border-t border-black/20">
                                    <div className="flex items-center gap-4">
                                        <Star className="w-6 h-6 text-zinc-400" />
                                        <span className="text-[15px] text-white">Administrators</span>
                                    </div>
                                    <span className="text-[15px] text-[#2AABEE]">1</span>
                                </div>
                                <div className="flex items-center justify-between p-3.5 hover:bg-zinc-700/50 cursor-pointer transition border-t border-black/20">
                                    <div className="flex items-center gap-4">
                                        <User className="w-6 h-6 text-zinc-400" />
                                        <span className="text-[15px] text-white">Removed Users</span>
                                    </div>
                                    <span className="text-[15px] text-[#2AABEE]">1</span>
                                </div>
                                <div className="flex items-center justify-between p-3.5 hover:bg-zinc-700/50 cursor-pointer transition border-t border-black/20">
                                    <div className="flex items-center gap-4">
                                        <svg className="w-6 h-6 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                        <span className="text-[15px] text-white">Channel Settings</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="w-full mt-4 flex items-center justify-center p-2 mb-20">
                            <div className="bg-zinc-800/80 rounded-[20px] flex p-[2px]">
                                <button className="px-8 py-1.5 rounded-[18px] bg-[#333] text-sm text-white font-medium">Media</button>
                                <button className="px-8 py-1.5 rounded-[18px] text-sm text-zinc-400 font-medium hover:text-white transition">Links</button>
                            </div>
                        </div>
                     </div>
                 </div>
             ) : (
                 <>`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('pages/Messages.tsx', code);
    console.log("Replaced via regex");
} else {
    console.log("Regex not found");
}
