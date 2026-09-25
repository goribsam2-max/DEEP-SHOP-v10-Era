const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

// 1. Sidebar Chat Items (p2p)
code = code.replace(/<p className="font-bold text-\[15px\] text-zinc-900 dark:text-zinc-100 truncate">(\s*)\{c\.otherUser\?\.shopName \|\| c\.otherUser\?\.displayName \|\| 'Chat'\}(\s*)<\/p>/g,
`<p className="font-bold text-[15px] text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
  {c.otherUser?.shopName || c.otherUser?.displayName || 'Chat'}
  {c.otherUser?.kycStatus === 'verified' && <VerifiedIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
</p>`);

// 2. Active Chat Header
code = code.replace(/<p className="font-bold text-\[16px\] text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">\s*\{activeChat\.otherUser\?\.shopName \|\| activeChat\.otherUser\?\.displayName \|\| 'Unknown User'\}(\s*)<\/p>/g,
`<p className="font-bold text-[16px] text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
  {activeChat.otherUser?.shopName || activeChat.otherUser?.displayName || 'Unknown User'}
  {activeChat.otherUser?.kycStatus === 'verified' && <VerifiedIcon className="w-4 h-4 text-emerald-500 shrink-0" />}
</p>`);

// Wait, the previous replace made it "flex items-center gap-1.5". Wait no, I only tried to replace 'Unknown' not 'Unknown User'.
// Let's just blindly replace:
code = code.replace(/<p className="font-bold text-\[16px\] text-zinc-900 dark:text-zinc-100 truncate">\s*\{activeChat\.otherUser\?\.shopName \|\| activeChat\.otherUser\?\.displayName \|\| 'Unknown User'\}\s*<\/p>/g,
`<p className="font-bold text-[16px] text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
  {activeChat.otherUser?.shopName || activeChat.otherUser?.displayName || 'Unknown User'}
  {activeChat.otherUser?.kycStatus === 'verified' && <VerifiedIcon className="w-4 h-4 text-emerald-500 shrink-0" />}
</p>`);

// 3. User Details Modal
code = code.replace(/<h2 className="text-2xl font-bold text-white mb-1">\s*\{activeChat\.otherUser\?\.shopName \|\| activeChat\.otherUser\?\.displayName \|\| 'Unknown User'\}\s*<\/h2>/g,
`<h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1 flex items-center gap-1.5 justify-center">
  {activeChat.otherUser?.shopName || activeChat.otherUser?.displayName || 'Unknown User'}
  {activeChat.otherUser?.kycStatus === 'verified' && <VerifiedIcon className="w-5 h-5 text-emerald-500 shrink-0" />}
</h2>`);

// 4. Message Sender Name (when group/channel message has sender name, wait channel message sender isn't there, just channel name. Let's see if we show sender name in p2p). Usually we don't show sender name in p2p, just "You" or the other user.

fs.writeFileSync('pages/Messages.tsx', code);
