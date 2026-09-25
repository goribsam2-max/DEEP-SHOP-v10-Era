import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

# Replace the input area
old_input = """                     <div className="flex items-center gap-3 w-full bg-zinc-50 dark:bg-[#0a0a0a] pt-2">
                         <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" multiple />
                         
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
                         
                         <button 
                             onClick={handleSendMessage}
                             disabled={isUploadingAttachment || (!newMessage.trim() && previewUrls.length === 0)}
                             className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all shadow-[0_4px_12px_rgba(79,70,229,0.3)] ${
                                 (newMessage.trim() || previewUrls.length > 0) ? 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 active:scale-95 text-white' : 'bg-indigo-600 text-white'
                             }`}
                         >
                             {newMessage.trim() || previewUrls.length > 0 ? (
                                 <Send className="w-5 h-5 ml-0.5" />
                             ) : (
                                 <Mic className="w-5 h-5" />
                             )}
                         </button>
                     </div>"""

new_input = """                     <div className="flex items-center gap-3 w-full bg-zinc-50 dark:bg-[#0a0a0a] pt-2">
                         <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" multiple />
                         
                         {isRecording ? (
                           <div className="flex-1 flex items-center justify-between bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-full border border-red-100 dark:border-red-900/50">
                               <div className="flex items-center gap-2 text-red-500 animate-pulse font-medium text-sm">
                                   <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                   Recording {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
                               </div>
                               <button onClick={cancelRecording} className="text-zinc-400 hover:text-red-500 transition-colors">
                                   <X className="w-5 h-5" />
                               </button>
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
                         
                         <button 
                             onClick={() => {
                                 if (isRecording) {
                                     stopRecording();
                                     // wait a bit for blob to be created, then send
                                     setTimeout(() => handleSendMessage(), 500);
                                 } else if (newMessage.trim() || previewUrls.length > 0) {
                                     handleSendMessage();
                                 } else {
                                     startRecording();
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
                     </div>"""

if old_input in content:
    content = content.replace(old_input, new_input)
    with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
        f.write(content)
    print("Replaced P2P chat input area")
else:
    print("Could not find P2P chat input area")
