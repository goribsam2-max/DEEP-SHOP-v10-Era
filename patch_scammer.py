import re

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

# Add otherUserProfile state
state_match = "const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);"
state_replace = "const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);\n  const [otherUserProfile, setOtherUserProfile] = useState<any>(null);"
content = content.replace(state_match, state_replace)

# Fetch otherUserProfile when activeChat changes
effect_match = """  useEffect(() => {
    if (chatIdParam && user) {"""
effect_replace = """  useEffect(() => {
    if (activeChat?.otherUser?.id) {
        if (activeChat.otherUser.id !== "system") {
            const unsub = onSnapshot(doc(db, "users", activeChat.otherUser.id), (docSnap) => {
                if (docSnap.exists()) {
                    setOtherUserProfile(docSnap.data());
                } else {
                    setOtherUserProfile(null);
                }
            });
            return () => unsub();
        }
    }
  }, [activeChat?.otherUser?.id]);

  useEffect(() => {
    if (chatIdParam && user) {"""
content = content.replace(effect_match, effect_replace)

# Show warning banner in chat header if otherUserProfile has bad reviews
header_match = """                             {/* Profile Image and Active Status */}
                             <div className="relative">"""
header_replace = """                             {/* Profile Image and Active Status */}
                             {otherUserProfile && otherUserProfile.reviews && (
                                 (() => {
                                     const avg = otherUserProfile.reviews.reduce((acc: number, cur: any) => acc + cur.rating, 0) / otherUserProfile.reviews.length;
                                     const hasScam = otherUserProfile.reviews.some((r: any) => (r.comment || "").toLowerCase().includes("scam") || (r.comment || "").toLowerCase().includes("fake"));
                                     if (avg < 3 || hasScam) {
                                         return (
                                             <div className="absolute top-16 left-0 right-0 bg-red-500/10 text-red-500 text-xs font-bold px-4 py-2 text-center z-10 border-b border-red-500/20 backdrop-blur-md">
                                                 ⚠️ Warning: This user has low ratings or negative reviews. Proceed with caution.
                                             </div>
                                         );
                                     }
                                     return null;
                                 })()
                             )}
                             <div className="relative">"""
content = content.replace(header_match, header_replace)

with open('pages/Messages.tsx', 'w') as f:
    f.write(content)

print("Scammer warning patched")
