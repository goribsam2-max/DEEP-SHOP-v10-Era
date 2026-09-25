import re

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

# I will replace the image + text rendering blocks with a unified block.
old_block_p2p = """                                     {(msg.images && msg.images.length > 0) ? (
                                              <div className="flex flex-wrap gap-1 mb-1 max-w-[280px]" onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(isMenuOpen ? null : msg.id); }}>
                                                  {msg.images.map((imgUrl: string, idx: number) => (
                                                      <div key={idx} className="rounded-2xl overflow-hidden border border-black/5 dark:border-white/5 shadow-sm max-w-[280px] cursor-pointer">
                                                          <img src={imgUrl} alt="Attachment" className="w-full object-cover" />
                                                      </div>
                                                  ))}
                                              </div>
                                          ) : msg.imageUrl && (
                                              <div onClick={(e) => { e.stopPropagation(); setLightboxImage(msg.imageUrl); setLightboxZoom(1); setLightboxOffset({ x: 0, y: 0 }); setLightboxMessageId(msg.id); }} className="mb-1 rounded-2xl overflow-hidden border border-black/5 dark:border-white/5 shadow-sm max-w-[280px] cursor-pointer">
                                                  <img src={msg.imageUrl} alt="Attachment" className="w-full object-cover" />
                                              </div>
                                          )}
                                     
                                     {msg.text && (
                                         <div 
                                             onDoubleClick={(e) => { e.stopPropagation(); handleReactToMessage(msg.id, '❤️'); }}
                                             onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(isMenuOpen ? null : msg.id); }}
                                             className={`px-4 py-2.5 rounded-2xl shadow-sm cursor-pointer select-none relative ${isMe ? 'bg-[#e6c1e3] text-zinc-900 rounded-br-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm'}`}
                                         >
                                             <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                                                 {renderTextWithLinks(msg.text, isMe)}
                                             </p>
                                             <LinkPreviewCard text={msg.text} isMe={isMe} />
                                         </div>
                                     )}"""

new_block_p2p = """                                     
                                     <div className="flex items-center gap-2 group/msg">
                                       {!isMe && (msg.imageUrl || (msg.images && msg.images.length > 0)) && (
                                          <button onClick={() => { setForwardingMessage(msg); setShowForwardModal(true); }} className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10" title="Forward">
                                            <Forward className="w-4 h-4 text-zinc-500" />
                                          </button>
                                       )}
                                       
                                       <div 
                                             onDoubleClick={(e) => { e.stopPropagation(); handleReactToMessage(msg.id, '❤️'); }}
                                             onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(isMenuOpen ? null : msg.id); }}
                                             className={`px-1 py-1 rounded-2xl shadow-sm cursor-pointer select-none relative flex flex-col gap-1 max-w-[280px] ${isMe ? 'bg-[#e6c1e3] text-zinc-900 rounded-br-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm'}`}
                                         >
                                           {(msg.images && msg.images.length > 0) ? (
                                              <div className="flex flex-wrap gap-1">
                                                  {msg.images.map((imgUrl: string, idx: number) => (
                                                      <div key={idx} onClick={(e) => { e.stopPropagation(); setLightboxImage(imgUrl); setLightboxZoom(1); setLightboxOffset({ x: 0, y: 0 }); setLightboxMessageId(msg.id); }} className="rounded-[12px] overflow-hidden">
                                                          <img src={imgUrl} alt="Attachment" className="w-full object-cover" />
                                                      </div>
                                                  ))}
                                              </div>
                                          ) : msg.imageUrl && (
                                              <div onClick={(e) => { e.stopPropagation(); setLightboxImage(msg.imageUrl); setLightboxZoom(1); setLightboxOffset({ x: 0, y: 0 }); setLightboxMessageId(msg.id); }} className="rounded-[12px] overflow-hidden">
                                                  <img src={msg.imageUrl} alt="Attachment" className="w-full object-cover" />
                                              </div>
                                          )}
                                          
                                          {msg.text && (
                                             <div className="px-3 pb-1.5 pt-1">
                                                <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                                                    {renderTextWithLinks(msg.text, isMe)}
                                                </p>
                                                <LinkPreviewCard text={msg.text} isMe={isMe} />
                                             </div>
                                          )}
                                         </div>
                                         
                                         {isMe && (msg.imageUrl || (msg.images && msg.images.length > 0)) && (
                                          <button onClick={() => { setForwardingMessage(msg); setShowForwardModal(true); }} className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10" title="Forward">
                                            <Forward className="w-4 h-4 text-zinc-500" />
                                          </button>
                                         )}
                                     </div>"""

content = content.replace(old_block_p2p, new_block_p2p)


old_block_ch = """                                     {(msg.images && msg.images.length > 0) ? (
                                              <div className="flex flex-wrap gap-1 mb-1 max-w-[280px]" onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(isMenuOpen ? null : msg.id); }}>
                                                  {msg.images.map((imgUrl: string, idx: number) => (
                                                      <div key={idx} className="rounded-2xl overflow-hidden border border-black/5 dark:border-white/5 shadow-sm max-w-[280px] cursor-pointer">
                                                          <img src={imgUrl} alt="Attachment" className="w-full object-cover" />
                                                      </div>
                                                  ))}
                                              </div>
                                          ) : msg.imageUrl && (
                                              <div onClick={(e) => { e.stopPropagation(); setLightboxImage(msg.imageUrl); setLightboxZoom(1); setLightboxOffset({ x: 0, y: 0 }); setLightboxMessageId(msg.id); }} className="mb-1 rounded-2xl overflow-hidden border border-black/5 dark:border-white/5 shadow-sm max-w-[280px] cursor-pointer">
                                                  <img src={msg.imageUrl} alt="Attachment" className="w-full object-cover" />
                                              </div>
                                          )}
                                     
                                     {msg.text && (
                                         <div 
                                             onDoubleClick={(e) => { e.stopPropagation(); handleReactToChannelMessage(msg.id, '❤️'); }}
                                             onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(isMenuOpen ? null : msg.id); }}
                                             className={`px-4 py-2.5 rounded-2xl shadow-sm cursor-pointer select-none relative ${isMe ? 'bg-[#e6c1e3] text-zinc-900 rounded-br-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm'}`}
                                         >
                                             <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                                                 {renderTextWithLinks(msg.text, isMe)}
                                             </p>
                                             <LinkPreviewCard text={msg.text} isMe={isMe} />
                                         </div>
                                     )}"""

new_block_ch = """                                     
                                     <div className="flex items-center gap-2 group/msg">
                                       {!isMe && (msg.imageUrl || (msg.images && msg.images.length > 0)) && (
                                          <button onClick={() => { setForwardingMessage(msg); setShowForwardModal(true); }} className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10" title="Forward">
                                            <Forward className="w-4 h-4 text-zinc-500" />
                                          </button>
                                       )}
                                       
                                       <div 
                                             onDoubleClick={(e) => { e.stopPropagation(); handleReactToChannelMessage(msg.id, '❤️'); }}
                                             onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(isMenuOpen ? null : msg.id); }}
                                             className={`px-1 py-1 rounded-2xl shadow-sm cursor-pointer select-none relative flex flex-col gap-1 max-w-[280px] ${isMe ? 'bg-[#e6c1e3] text-zinc-900 rounded-br-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm'}`}
                                         >
                                           {(msg.images && msg.images.length > 0) ? (
                                              <div className="flex flex-wrap gap-1">
                                                  {msg.images.map((imgUrl: string, idx: number) => (
                                                      <div key={idx} onClick={(e) => { e.stopPropagation(); setLightboxImage(imgUrl); setLightboxZoom(1); setLightboxOffset({ x: 0, y: 0 }); setLightboxMessageId(msg.id); }} className="rounded-[12px] overflow-hidden">
                                                          <img src={imgUrl} alt="Attachment" className="w-full object-cover" />
                                                      </div>
                                                  ))}
                                              </div>
                                          ) : msg.imageUrl && (
                                              <div onClick={(e) => { e.stopPropagation(); setLightboxImage(msg.imageUrl); setLightboxZoom(1); setLightboxOffset({ x: 0, y: 0 }); setLightboxMessageId(msg.id); }} className="rounded-[12px] overflow-hidden">
                                                  <img src={msg.imageUrl} alt="Attachment" className="w-full object-cover" />
                                              </div>
                                          )}
                                          
                                          {msg.text && (
                                             <div className="px-3 pb-1.5 pt-1">
                                                <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                                                    {renderTextWithLinks(msg.text, isMe)}
                                                </p>
                                                <LinkPreviewCard text={msg.text} isMe={isMe} />
                                             </div>
                                          )}
                                         </div>
                                         
                                         {isMe && (msg.imageUrl || (msg.images && msg.images.length > 0)) && (
                                          <button onClick={() => { setForwardingMessage(msg); setShowForwardModal(true); }} className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10" title="Forward">
                                            <Forward className="w-4 h-4 text-zinc-500" />
                                          </button>
                                         )}
                                     </div>"""

content = content.replace(old_block_ch, new_block_ch)

with open('pages/Messages.tsx', 'w') as f:
    f.write(content)

print("Bubbles patched")
