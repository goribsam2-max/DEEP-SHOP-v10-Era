import re

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

# I need to add a helper function for date separators
helpers_match = """const formatTime12h = (timestamp: any) => {"""
helpers_replace = """const formatDateSeparator = (timestamp: any) => {
    if (!timestamp) return '';
    const date = new Date(typeof timestamp.toMillis === 'function' ? timestamp.toMillis() : timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
};

const formatTime12h = (timestamp: any) => {"""
content = content.replace(helpers_match, helpers_replace)

# Render date separators for Channel messages
ch_render_match = """                     {channelMessages.map((msg, idx) => {
                         const isMe = user && msg.senderId === user.uid;"""
ch_render_replace = """                     {channelMessages.map((msg, idx) => {
                         const isMe = user && msg.senderId === user.uid;
                         const showDate = idx === 0 || formatDateSeparator(msg.timestamp) !== formatDateSeparator(channelMessages[idx - 1].timestamp);"""
content = content.replace(ch_render_match, ch_render_replace)

ch_ret_match = """                         return (
                             <div key={msg.id} """
ch_ret_replace = """                         return (
                             <React.Fragment key={msg.id}>
                             {showDate && (
                                 <div className="flex justify-center my-4 select-none">
                                     <span className="px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-wider backdrop-blur-sm">
                                         {formatDateSeparator(msg.timestamp)}
                                     </span>
                                 </div>
                             )}
                             <div """
content = content.replace(ch_ret_match, ch_ret_replace)
content = content.replace("</div>\n                         );\n                     })}\n                     {activeChannel", "</div>\n                             </React.Fragment>\n                         );\n                     })}\n                     {activeChannel")


# Render date separators for P2P messages
p2p_render_match = """                     {messages.map((msg, idx) => {
                         const isMe = user && msg.senderId === user.uid;"""
p2p_render_replace = """                     {messages.map((msg, idx) => {
                         const isMe = user && msg.senderId === user.uid;
                         const showDate = idx === 0 || formatDateSeparator(msg.timestamp) !== formatDateSeparator(messages[idx - 1].timestamp);"""
content = content.replace(p2p_render_match, p2p_render_replace)

p2p_ret_match = """                         return (
                             <div key={msg.id} """
p2p_ret_replace = """                         return (
                             <React.Fragment key={msg.id}>
                             {showDate && (
                                 <div className="flex justify-center my-4 select-none">
                                     <span className="px-3 py-1 bg-black/5 dark:bg-white/5 rounded-full text-[10px] font-bold text-zinc-500 uppercase tracking-wider backdrop-blur-sm">
                                         {formatDateSeparator(msg.timestamp)}
                                     </span>
                                 </div>
                             )}
                             <div """
content = content.replace(p2p_ret_match, p2p_ret_replace)
content = content.replace("</div>\n                         );\n                     })}\n                     {!hasReviewed", "</div>\n                             </React.Fragment>\n                         );\n                     })}\n                     {!hasReviewed")

with open('pages/Messages.tsx', 'w') as f:
    f.write(content)

print("Date separators patched")
