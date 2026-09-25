import re

with open("pages/Messages.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "const [otherUserTrust, setOtherUserTrust] = useState<{ score: number; count: number; avgRating: number; hasScamWarning: boolean }>({ score: 100, count: 0, avgRating: 5, hasScamWarning: false });",
    "const [otherUserTrust, setOtherUserTrust] = useState<{ score: number; count: number; avgRating: number; hasScamWarning: boolean }>({ score: 100, count: 0, avgRating: 5, hasScamWarning: false });\n  const [isTrustLoading, setIsTrustLoading] = useState(true);"
)

old_load_logic = """    const loadOtherUserReviews = async () => {
      if (activeChat.otherUser.id === 'system') {
        setOtherUserTrust({ score: 100, count: 0, avgRating: 5, hasScamWarning: false });
        return;
      }
      try {
        const q1 = query("""

new_load_logic = """    const loadOtherUserReviews = async () => {
      setIsTrustLoading(true);
      if (activeChat.otherUser.id === 'system') {
        setOtherUserTrust({ score: 100, count: 0, avgRating: 5, hasScamWarning: false });
        setIsTrustLoading(false);
        return;
      }
      try {
        const q1 = query("""

content = content.replace(old_load_logic, new_load_logic)

old_load_logic_end = """        setOtherUserTrust({
          score,
          count: list.length,
          avgRating: Number(avg.toFixed(1)),
          hasScamWarning
        });
      } catch (err) {
        console.error("Error loading other user reviews:", err);
      }
    };"""

new_load_logic_end = """        setOtherUserTrust({
          score,
          count: list.length,
          avgRating: Number(avg.toFixed(1)),
          hasScamWarning
        });
      } catch (err) {
        console.error("Error loading other user reviews:", err);
      } finally {
        setIsTrustLoading(false);
      }
    };"""

content = content.replace(old_load_logic_end, new_load_logic_end)

# Early return for trust loading
old_banner_1 = """                 {messages.length === 0 && ("""
new_banner_1 = """                 {messages.length === 0 && !isTrustLoading && ("""
content = content.replace(old_banner_1, new_banner_1)

old_banner_2 = """                  {/* Dynamic Trust Notification Banner */}
                  <div className="w-full mt-4">
                      {(!otherUserTrust || otherUserTrust.count === 0 || otherUserTrust.hasScamWarning) ? ("""
new_banner_2 = """                  {/* Dynamic Trust Notification Banner */}
                  <div className="w-full mt-4">
                    {isTrustLoading ? (
                      <div className="bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-2xl p-4 flex gap-3 text-left animate-pulse">
                        <div className="w-5 h-5 rounded-full bg-zinc-300 dark:bg-zinc-700 shrink-0 mt-0.5"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-zinc-300 dark:bg-zinc-700 rounded w-1/3"></div>
                          <div className="h-3 bg-zinc-300 dark:bg-zinc-700 rounded w-full"></div>
                        </div>
                      </div>
                    ) : (
                      (!otherUserTrust || otherUserTrust.count === 0 || otherUserTrust.hasScamWarning) ? ("""

content = content.replace(old_banner_2, new_banner_2)

old_banner_2_end = """                      )}
                  </div>"""
new_banner_2_end = """                      )
                    )}
                  </div>"""

content = content.replace(old_banner_2_end, new_banner_2_end)


old_empty_return = """        if (list.length === 0) {
          setOtherUserTrust({ score: 100, count: 0, avgRating: 5, hasScamWarning: false });
          return;
        }"""

new_empty_return = """        if (list.length === 0) {
          setOtherUserTrust({ score: 100, count: 0, avgRating: 5, hasScamWarning: false });
          setIsTrustLoading(false);
          return;
        }"""

content = content.replace(old_empty_return, new_empty_return)

with open("pages/Messages.tsx", "w") as f:
    f.write(content)
