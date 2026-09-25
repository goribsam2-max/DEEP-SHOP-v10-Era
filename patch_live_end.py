import re

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

old_end_live = """  const handleEndLiveCall = async () => {
       if (!channelIdParam || !user) return;
       try {
           notify("Terminating live call...", "info");
           const snap = await getDocs(collection(db, 'community_channels', channelIdParam, 'live_participants'));
           for (const docD of snap.docs) {
               await deleteDoc(doc(db, 'community_channels', channelIdParam, 'live_participants', docD.id));
           }
           await updateDoc(doc(db, 'community_channels', channelIdParam), {
               liveAudioCall: null
           });
           setShowLiveCallModal(false);
           notify("Live stream ended", "info");
       } catch (err) {"""

new_end_live = """  const handleEndLiveCall = async () => {
       if (!channelIdParam || !user) return;
       try {
           notify("Terminating live call...", "info");
           const snap = await getDocs(collection(db, 'community_channels', channelIdParam, 'live_participants'));
           for (const docD of snap.docs) {
               await deleteDoc(doc(db, 'community_channels', channelIdParam, 'live_participants', docD.id));
           }
           
           if (activeLiveCall?.startedAt) {
               const durationMs = Date.now() - activeLiveCall.startedAt;
               const mins = Math.floor(durationMs / 60000);
               const secs = Math.floor((durationMs % 60000) / 1000);
               const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
               await addDoc(collection(db, 'community_channels', channelIdParam, 'messages'), {
                   text: `🎙️ Live stream ended. Duration: ${durationStr}`,
                   senderId: 'system',
                   senderName: 'System',
                   timestamp: Date.now()
               });
           }
           
           await updateDoc(doc(db, 'community_channels', channelIdParam), {
               liveAudioCall: null
           });
           setShowLiveCallModal(false);
           notify("Live stream ended", "info");
       } catch (err) {"""

content = content.replace(old_end_live, new_end_live)

with open('pages/Messages.tsx', 'w') as f:
    f.write(content)

print("Live end patched")
