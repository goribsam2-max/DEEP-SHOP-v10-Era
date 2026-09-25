import re

with open("pages/Messages.tsx", "r") as f:
    content = f.read()

# Make hasScamWarning more reasonable
old_scam_logic = """        // Check for scam words
        const scamWords = ["scam", "fraud", "thief", "cheat", "scammer", "baje", "spam", "fake", "faker", "scammed", "butpar", "batpar", "dhoka"];
        const hasScamWarning = list.some(r => {
          const comment = (r.comment || "").toLowerCase();
          return scamWords.some(w => comment.includes(w)) || (r.rating || 5) <= 2;
        });"""

new_scam_logic = """        // Check for scam words
        const scamWords = ["scam", "fraud", "thief", "cheat", "scammer", "baje", "spam", "fake", "faker", "scammed", "butpar", "batpar", "dhoka"];
        const scamCount = list.filter(r => {
          const comment = (r.comment || "").toLowerCase();
          return scamWords.some(w => comment.includes(w));
        }).length;
        
        // Only warn if avg rating is < 3.5 or multiple scam reports
        const hasScamWarning = avg < 3.5 || scamCount > 1;"""

content = content.replace(old_scam_logic, new_scam_logic)

# Add Trusted banner to chat
old_banner = """                 {otherUserTrust.hasScamWarning && (
                   <div className="bg-rose-500/10 border-b border-rose-500/25 px-4 py-3 flex items-start gap-3 shrink-0 z-10 shadow-sm relative font-inter animate-pulse">
                     <Icon name="alert-circle" className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                     <div className="flex-1 min-w-0">
                       <p className="font-black text-xs text-rose-600 dark:text-rose-400 uppercase tracking-wider">⚠️ Security Notice: Extreme Care Advised</p>
                       <p className="text-[11px] text-zinc-650 dark:text-zinc-300 font-medium leading-relaxed mt-0.5">
                         This user has received poor reviews, low star ratings, or reports flagging potential fraudulent activities. 
                         For your absolute protection, **NEVER** send money in advance or share sensitive credentials!
                       </p>
                     </div>
                   </div>
                 )}"""

new_banner = """                 {(!otherUserTrust || otherUserTrust.count === 0 || otherUserTrust.hasScamWarning) ? (
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

content = content.replace(old_banner, new_banner)

with open("pages/Messages.tsx", "w") as f:
    f.write(content)
