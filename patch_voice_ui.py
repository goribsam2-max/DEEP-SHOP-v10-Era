import re

with open('pages/Messages.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """
                        <div className="flex items-center gap-3 w-full bg-zinc-50 dark:bg-[#0a0a0a] pt-2 relative">
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" multiple />
                            
                            {isRecording ? (
                              <div className="flex-1 flex items-center justify-between bg-zinc-100 dark:bg-zinc-800/80 px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-700/50 shadow-inner">
                                  <div className="flex items-center gap-3 text-red-500 font-semibold text-sm">
                                      <div className="flex items-center gap-1.5 animate-pulse">
                                          <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                          <div className="flex gap-0.5 items-center h-4">
                                            {[1,2,3,4,5].map(i => (
                                              <div key={i} className={`w-1 bg-red-500 rounded-full animate-pulse`} style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
                                            ))}
                                          </div>
                                      </div>
                                      <span className="tabular-nums font-mono">
                                          {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                                      </span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                      <span className="text-xs text-zinc-400 animate-pulse hidden sm:block">&lt; Slide to cancel</span>
                                      <button onClick={cancelRecording} className="text-zinc-500 hover:text-red-500 transition-colors bg-white dark:bg-zinc-700 p-1.5 rounded-full shadow-sm">
                                          <X className="w-5 h-5" />
                                      </button>
                                  </div>
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center bg-white dark:bg-zinc-800 px-4 py-2 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-zinc-100 dark:border-zinc-700/50">
                                  <textarea
                                      value={newMessage}
                                      onChange={(e) => setNewMessage(e.target.value)}
                                      onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                              e.preventDefault();
                                              handleSendMessage();
                                          }
                                      }}
                                      placeholder="Message"
                                      className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2 text-[15px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 placeholder:font-medium leading-tight h-[40px]"
                                      rows={1}
                                  />
                                  <button onClick={() => fileInputRef.current?.click()} className="ml-2 text-zinc-400 hover:text-indigo-600 transition-colors shrink-0" title="Attach">
                                      <Paperclip className="w-5 h-5 transform -rotate-45" />
                                  </button>
                              </div>
                            )}
                            
                            <div className="relative flex items-center justify-center h-12">
                                {isRecording && (
                                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-800 text-zinc-500 rounded-full p-2 shadow-lg border border-zinc-200 dark:border-zinc-700 animate-bounce">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                )}
                                <button 
                                    onMouseDown={(e) => {
                                        if (!isRecording && !newMessage.trim() && previewUrls.length === 0) {
                                            startRecording();
                                        }
                                    }}
                                    onMouseUp={() => {
                                        if (isRecording) {
                                            stopRecording();
                                            setTimeout(() => handleSendMessage(), 500);
                                        }
                                    }}
                                    onTouchStart={(e) => {
                                        if (!isRecording && !newMessage.trim() && previewUrls.length === 0) {
                                            startRecording();
                                        }
                                    }}
                                    onTouchEnd={() => {
                                        if (isRecording) {
                                            stopRecording();
                                            setTimeout(() => handleSendMessage(), 500);
                                        }
                                    }}
                                    onClick={() => {
                                        if (newMessage.trim() || previewUrls.length > 0) {
                                            handleSendMessage();
                                        }
                                    }}
                                    disabled={isUploadingAttachment}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all shadow-[0_4px_12px_rgba(79,70,229,0.3)] ${
                                        (newMessage.trim() || previewUrls.length > 0 || isRecording) ? 'bg-[#4E4AEB] hover:bg-[#3d39db] hover:scale-105 active:scale-95 text-white' : 'bg-[#4E4AEB] text-white hover:scale-105 active:scale-95'
                                    }`}
                                >
                                    {isRecording ? (
                                        <Send className="w-5 h-5 ml-0.5" />
                                    ) : newMessage.trim() || previewUrls.length > 0 ? (
                                        <Send className="w-5 h-5 ml-0.5" />
                                    ) : (
                                        <Mic className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>
"""

old_ui_start = """<div className="flex items-center gap-3 w-full bg-zinc-50 dark:bg-[#0a0a0a] pt-2">"""
old_ui_end = """</div>\n                    )}"""
# Since it might be tricky to regex exact HTML, let's use a robust replace
pattern = re.compile(r'<div className="flex items-center gap-3 w-full bg-zinc-50 dark:bg-\[#0a0a0a\] pt-2">.*?</button>\n                        </div>', re.DOTALL)

new_content = pattern.sub(replacement.strip(), content)

with open('pages/Messages.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Updated Messages.tsx")
