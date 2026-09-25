with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    lines = f.readlines()

new_modal = """      {/* --- Create Community Channel Modal --- */}
      <AnimatePresence>
        {showCreateChannelModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateChannelModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="w-full max-w-md bg-white dark:bg-[#111111] rounded-3xl overflow-hidden relative z-10 font-inter shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#111111]/80 backdrop-blur-md z-20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-none mb-1">
                          {isEditingChannel ? 'Edit Channel' : 'New Channel'}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Broadcast your updates</p>
                    </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowCreateChannelModal(false)}
                  className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800/50 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5">
                {/* Cover Image Upload (Stylish) */}
                <div className="flex flex-col items-center justify-center">
                  <div 
                      onClick={() => { const el = document.getElementById('channel-img-upload'); if(el) el.click(); }}
                      className="w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-emerald-500/50 flex items-center justify-center cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition group relative bg-zinc-50 dark:bg-zinc-900"
                  >
                      {chanImagePreview ? (
                          <img src={chanImagePreview} alt="Preview" className="w-full h-full object-cover group-hover:opacity-50 transition" />
                      ) : (
                          <ImageIcon className="w-8 h-8 text-emerald-500/50 group-hover:text-emerald-500 transition" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-6 h-6 text-white" />
                      </div>
                  </div>
                  <input
                    id="channel-img-upload"
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setChanImageFile(e.target.files[0]);
                        setChanImagePreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                    className="hidden"
                  />
                  <p className="text-xs text-zinc-500 font-medium mt-3">Upload Cover Image</p>
                </div>

                <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                        Channel Name
                      </label>
                      <input
                        type="text"
                        value={chanName}
                        onChange={(e) => setChanName(e.target.value)}
                        placeholder="e.g. Vintage Gadgets Elite"
                        className="w-full text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-2xl px-4 py-3 outline-none focus:ring-2 ring-emerald-500/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                        Handle (Unique)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-[14px] text-zinc-400 text-sm font-bold">@</span>
                        <input
                          type="text"
                          value={chanLink}
                          onChange={(e) => setChanLink(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="vintage_elite"
                          className="w-full text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-2xl pl-8 pr-4 py-3 outline-none focus:ring-2 ring-emerald-500/50 text-zinc-900 dark:text-zinc-100 font-semibold placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5 ml-1">
                        Description
                      </label>
                      <textarea
                        value={chanDesc}
                        onChange={(e) => setChanDesc(e.target.value)}
                        placeholder="What is this channel about?"
                        rows={2}
                        className="w-full text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-2xl px-4 py-3 outline-none focus:ring-2 ring-emerald-500/50 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 resize-none transition-all"
                      />
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200 dark:border-zinc-700/30 rounded-2xl p-4 flex items-center justify-between">
                      <div className="space-y-1 max-w-[75%]">
                        <label className="block text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          Private Channel
                        </label>
                        <p className="text-[11px] text-zinc-500 leading-tight">
                          Hide from Community tab. Users can only join via link.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setChanIsPrivate(!chanIsPrivate)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${chanIsPrivate ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${chanIsPrivate ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>
                </div>
              </div>

              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/50 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateChannelModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white font-bold transition hover:bg-zinc-50 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCommunityChannel}
                  disabled={isSubmittingChannel || !chanName.trim() || !chanLink.trim()}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex justify-center items-center gap-2"
                >
                  {isSubmittingChannel ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                      <>{isEditingChannel ? 'Save' : 'Create'}</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>\n"""

del lines[5428:5566]
lines.insert(5428, new_modal)

with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
    f.writelines(lines)
print("Replaced create channel modal successfully")
