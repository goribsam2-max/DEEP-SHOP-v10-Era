import re
import sys

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

channel_reply_str = """
                                          {msg.replyTo && (
                                              <div className="mb-1.5 p-2 rounded-xl text-xs border-l-[3px] text-left max-w-full bg-zinc-100 dark:bg-zinc-800 border-emerald-500 text-zinc-600 dark:text-zinc-400">
"""
channel_reply_new = """
                                          {msg.replyTo && (
                                              <div 
                                                className="mb-1.5 p-2 rounded-xl text-xs border-l-[3px] text-left max-w-full bg-zinc-100 dark:bg-zinc-800 border-emerald-500 text-zinc-600 dark:text-zinc-400 cursor-pointer hover:opacity-80 transition"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (msg.replyTo.id) {
                                                    document.getElementById(`msg-${msg.replyTo.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                    triggerHighlight(msg.replyTo.id);
                                                  }
                                                }}
                                              >
"""
content = content.replace(channel_reply_str.strip(), channel_reply_new.strip())

p2p_reply_str = """
                                     {msg.replyTo && (
                                         <div className={`mb-1.5 p-2 rounded-xl text-xs border-l-[3px] text-left max-w-full ${isMe ? 'bg-black/10 border-emerald-300 text-emerald-100' : 'bg-zinc-100 dark:bg-zinc-200 dark:bg-zinc-800 border-emerald-500 text-zinc-600 dark:text-zinc-400'}`}>
"""
p2p_reply_new = """
                                     {msg.replyTo && (
                                         <div 
                                           className={`mb-1.5 p-2 rounded-xl text-xs border-l-[3px] text-left max-w-full cursor-pointer hover:opacity-80 transition ${isMe ? 'bg-black/10 border-emerald-300 text-emerald-100' : 'bg-zinc-100 dark:bg-zinc-200 dark:bg-zinc-800 border-emerald-500 text-zinc-600 dark:text-zinc-400'}`}
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             if (msg.replyTo.id) {
                                               document.getElementById(`msg-${msg.replyTo.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                               triggerHighlight(msg.replyTo.id);
                                             }
                                           }}
                                         >
"""
content = content.replace(p2p_reply_str.strip(), p2p_reply_new.strip())

with open('pages/Messages.tsx', 'w') as f:
    f.write(content)
