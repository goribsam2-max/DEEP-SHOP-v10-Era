import re
import sys

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

func = """const formatDuration = """
new_func = """
  const isOnlyEmojis = (text: string) => {
    if (!text) return false;
    const stripped = text.replace(/\\s/g, '');
    if (stripped.length === 0) return false;
    const emojiRegex = /^(?:\\p{Emoji}\\uFE0F|\\p{Emoji_Presentation}){1,3}$/u;
    return emojiRegex.test(stripped);
  };
  
const formatDuration = """
content = content.replace(func, new_func)

render_p2p = """                                             <span className={`leading-relaxed whitespace-pre-wrap break-words ${isMe ? 'text-white' : 'text-zinc-800 dark:text-zinc-200'}`}>{msg.text}</span>"""
render_p2p_new = """                                             <span className={`leading-relaxed whitespace-pre-wrap break-words ${isOnlyEmojis(msg.text) ? 'text-[40px] leading-none block py-1 bg-transparent' : (isMe ? 'text-white' : 'text-zinc-800 dark:text-zinc-200')}`}>{msg.text}</span>"""
content = content.replace(render_p2p, render_p2p_new)

render_channel = """                                              <span className="leading-relaxed whitespace-pre-wrap break-words text-zinc-800 dark:text-zinc-200">{msg.text}</span>"""
render_channel_new = """                                              <span className={`leading-relaxed whitespace-pre-wrap break-words ${isOnlyEmojis(msg.text) ? 'text-[40px] leading-none block py-1 bg-transparent' : 'text-zinc-800 dark:text-zinc-200'}`}>{msg.text}</span>"""
content = content.replace(render_channel, render_channel_new)

with open('pages/Messages.tsx', 'w') as f:
    f.write(content)

print("Added large emojis")
