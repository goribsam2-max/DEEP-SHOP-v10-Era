const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

// Replace hardcoded channel SVGs with VerifiedIcon if channel is verified
const hardcodedSvg = `<div className="flex items-center justify-center bg-[#2AABEE] rounded-full p-[2px]">
                                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                      </div>`;
code = code.replace(hardcodedSvg, `{activeChannel.verified && <VerifiedIcon className="w-4 h-4 text-emerald-500 shrink-0" />}`);

// And in Channel details modal
const hardcodedSvg2 = `<div className="flex items-center justify-center bg-[#2AABEE] rounded-full p-[2px]">                                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>                            </div>`;
code = code.replace(hardcodedSvg2, `{activeChannel.verified && <VerifiedIcon className="w-5 h-5 text-emerald-500 shrink-0" />}`);

// And in User details modal
// Find User details name and add verified
// It's probably something like: {activeChat.otherUser?.shopName || activeChat.otherUser?.displayName}
// We'll just search for that exact string
code = code.replace(/>\s*\{activeChat\.otherUser\?\.shopName \|\| activeChat\.otherUser\?\.displayName\}\s*<\/h2>/g, 
`>
  {activeChat.otherUser?.shopName || activeChat.otherUser?.displayName}
  {activeChat.otherUser?.kycStatus === 'verified' && <VerifiedIcon className="w-5 h-5 text-emerald-500 shrink-0" />}
</h2>`);

// Also active chat header
code = code.replace(/<p className="font-bold text-\[16px\] text-zinc-900 dark:text-zinc-100 truncate">\s*\{activeChat\.otherUser\?\.shopName \|\| activeChat\.otherUser\?\.displayName \|\| 'Unknown'\}\s*<\/p>/g,
`<p className="font-bold text-[16px] text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
  {activeChat.otherUser?.shopName || activeChat.otherUser?.displayName || 'Unknown'}
  {activeChat.otherUser?.kycStatus === 'verified' && <VerifiedIcon className="w-4 h-4 text-emerald-500 shrink-0" />}
</p>`);

// Also Sidebar chat items
code = code.replace(/<p className="font-bold text-\[15px\] text-zinc-900 dark:text-zinc-100 truncate">\s*\{c\.otherUser\?\.shopName \|\| c\.otherUser\?\.displayName \|\| 'Unknown'\}\s*<\/p>/g,
`<p className="font-bold text-[15px] text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
  {c.otherUser?.shopName || c.otherUser?.displayName || 'Unknown'}
  {c.otherUser?.kycStatus === 'verified' && <VerifiedIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
</p>`);

// Sidebar channel items
code = code.replace(/<h3 className="font-bold text-\[15px\] text-zinc-900 dark:text-zinc-100 truncate">\s*\{c\.name\}\s*<\/h3>/g,
`<h3 className="font-bold text-[15px] text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1.5">
  {c.name}
  {c.verified && <VerifiedIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
</h3>`);

fs.writeFileSync('pages/Messages.tsx', code);
