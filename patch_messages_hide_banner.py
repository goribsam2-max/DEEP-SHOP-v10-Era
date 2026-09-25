import re

with open("pages/Messages.tsx", "r") as f:
    content = f.read()

old_code = """                 {(!otherUserTrust || otherUserTrust.count === 0 || otherUserTrust.hasScamWarning) ? (
                   <div className="bg-rose-500/10 border-b border-rose-500/25 px-4 py-3 flex items-start gap-3 shrink-0 z-10 shadow-sm relative font-inter animate-pulse">
                     <Icon name="alert-circle" className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                     <div className="flex-1 min-w-0">
                       <p className="font-black text-xs text-rose-600 dark:text-rose-400 uppercase tracking-wider">⚠️ Review Low (Be Careful)</p>
                       <p className="text-[11px] text-zinc-650 dark:text-zinc-300 font-medium leading-relaxed mt-0.5">
                         Review low eita untrusted o hote pare be careful! This user has low or zero reviews. Be careful when interacting or initiating transactions.
                       </p>
                     </div>
                   </div>
                 ) : (
                   <div className="bg-emerald-500/10 border-b border-emerald-500/25 px-4 py-3 flex items-start gap-3 shrink-0 z-10 shadow-sm relative font-inter">
                     <Icon name="check-circle" className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                     <div className="flex-1 min-w-0">
                       <p className="font-black text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">✅ Maybe Trusted Merchant</p>
                       <p className="text-[11px] text-zinc-650 dark:text-zinc-300 font-medium leading-relaxed mt-0.5">
                         Maybe trusted, reason: good review & star ratings! (Rating: {otherUserTrust.avgRating}★ from {otherUserTrust.count} reviews)
                       </p>
                     </div>
                   </div>
                 )}"""

new_code = """                 {messages.length === 0 && (
                   (!otherUserTrust || otherUserTrust.count === 0 || otherUserTrust.hasScamWarning) ? (
                     <div className="bg-rose-500/10 border-b border-rose-500/25 px-4 py-3 flex items-start gap-3 shrink-0 z-10 shadow-sm relative font-inter animate-pulse">
                       <Icon name="alert-circle" className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                       <div className="flex-1 min-w-0">
                         <p className="font-black text-xs text-rose-600 dark:text-rose-400 uppercase tracking-wider">⚠️ Review Low (Be Careful)</p>
                         <p className="text-[11px] text-zinc-650 dark:text-zinc-300 font-medium leading-relaxed mt-0.5">
                           Review low eita untrusted o hote pare be careful! This user has low or zero reviews. Be careful when interacting or initiating transactions.
                         </p>
                       </div>
                     </div>
                   ) : (
                     <div className="bg-emerald-500/10 border-b border-emerald-500/25 px-4 py-3 flex items-start gap-3 shrink-0 z-10 shadow-sm relative font-inter">
                       <Icon name="check-circle" className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                       <div className="flex-1 min-w-0">
                         <p className="font-black text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">✅ Maybe Trusted Merchant</p>
                         <p className="text-[11px] text-zinc-650 dark:text-zinc-300 font-medium leading-relaxed mt-0.5">
                           Maybe trusted, reason: good review & star ratings! (Rating: {otherUserTrust.avgRating}★ from {otherUserTrust.count} reviews)
                         </p>
                       </div>
                     </div>
                   )
                 )}"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open("pages/Messages.tsx", "w") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Could not find old code")
