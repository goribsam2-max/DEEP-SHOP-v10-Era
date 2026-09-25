const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const target = `<div className="flex items-center justify-center bg-[#2AABEE] rounded-full p-[2px]">
                                <svg className="w-3.5 h-3.5 text-zinc-900 dark:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>`;

code = code.replace(target, `{activeChannel.verified && <VerifiedIcon className="w-5 h-5 text-emerald-500 shrink-0" />}`);

fs.writeFileSync('pages/Messages.tsx', code);
