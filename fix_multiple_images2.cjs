const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

// The input file needs 'multiple' attribute
code = code.replace(/<input type="file" ref=\{fileInputRef\} onChange=\{handleFileSelect\} className="hidden" accept="image\/\*" \/>/g,
`<input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" multiple />`);

// Replace `!newMessage.trim() && !attachment` with `!newMessage.trim() && attachments.length === 0`
code = code.replace(/!newMessage\.trim\(\) && !attachment/g, `!newMessage.trim() && attachments.length === 0`);
code = code.replace(/\(newMessage\.trim\(\) \|\| attachment\)/g, `(newMessage.trim() || attachments.length > 0)`);

// Previews rendering
const oldPreviewUI = `{previewUrl && (
                              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="mb-3 relative inline-block">
                                  <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-md">
                                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                  </div>
                                  <button onClick={() => { setAttachment(null); setPreviewUrl(''); }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-zinc-900 dark:text-white rounded-full flex items-center justify-center shadow-sm">
                                      <X className="w-3.5 h-3.5" />
                                  </button>
                              </motion.div>
                          )}`;

const newPreviewUI = `{previewUrls.length > 0 && (
    <div className="flex flex-wrap gap-2 mb-3">
        {previewUrls.map((url, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative inline-block">
                <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-md">
                    <img src={url} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <button onClick={() => { 
                    setAttachments(prev => prev.filter((_, i) => i !== idx));
                    setPreviewUrls(prev => prev.filter((_, i) => i !== idx));
                }} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-zinc-900 dark:text-white rounded-full flex items-center justify-center shadow-sm">
                    <X className="w-3.5 h-3.5" />
                </button>
            </motion.div>
        ))}
    </div>
)}`;

// There might be two places for this (Channel chat and P2P chat)
// The regex needs to match it. Actually they might differ slightly in spacing, let's use replace twice just in case.
code = code.replace(/\{previewUrl && \([\s\S]*?<\/motion\.div>\s*\)\}/g, newPreviewUI);


// Message rendering mapping
// For channels:
const oldChannelMsgImg = `{msg.imageUrl && (
                                              <div 
                                                  onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(isMenuOpen ? null : msg.id); }}
                                                  className="mb-1 rounded-2xl overflow-hidden border border-black\/5 dark:border-white\/5 shadow-sm max-w-\[280px\] cursor-pointer"
                                              >
                                                  <img src={msg.imageUrl} alt="Post Attachment" className="w-full object-cover" />
                                              </div>
                                          )}`;

const newMsgImg = `{(msg.images && msg.images.length > 0) ? (
                                              <div className="flex flex-wrap gap-1 mb-1 max-w-[280px]" onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(isMenuOpen ? null : msg.id); }}>
                                                  {msg.images.map((imgUrl: string, idx: number) => (
                                                      <div key={idx} className="rounded-2xl overflow-hidden border border-black/5 dark:border-white/5 shadow-sm max-w-[280px] cursor-pointer">
                                                          <img src={imgUrl} alt="Attachment" className="w-full object-cover" />
                                                      </div>
                                                  ))}
                                              </div>
                                          ) : msg.imageUrl && (
                                              <div 
                                                  onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(isMenuOpen ? null : msg.id); }}
                                                  className="mb-1 rounded-2xl overflow-hidden border border-black/5 dark:border-white/5 shadow-sm max-w-[280px] cursor-pointer"
                                              >
                                                  <img src={msg.imageUrl} alt="Attachment" className="w-full object-cover" />
                                              </div>
                                          )}`;
code = code.replace(/\{msg\.imageUrl && \([\s\S]*?<\/div>\s*\)\}/g, newMsgImg);

fs.writeFileSync('pages/Messages.tsx', code);
