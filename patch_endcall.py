import re
import sys

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

new_endCall = """
  const endCall = async () => {
    const finalDuration = callDuration;
    
    setIsCalling(false);
    
    // Clean up WebRTC streams and peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: any) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (audioHelper && typeof audioHelper.stop === 'function') {
      audioHelper.stop();
    }
    if (audioHelper && typeof audioHelper.playEndBip === 'function') {
      audioHelper.playEndBip();
    }
    
    if (currentCallId) {
      await updateDoc(doc(db, 'p2p_calls', currentCallId), {
        status: 'ended'
      }).catch(console.error);
      setCurrentCallId(null);
    }
    
    if (finalDuration > 0 && activeChat && activeChat.id) {
       try {
         await addDoc(collection(db, 'p2p_chats', activeChat.id, 'messages'), {
            text: `Call ended. Duration: ${formatDuration(finalDuration)}`,
            senderId: 'system',
            timestamp: Date.now(),
            readBy: [user.uid]
         });
       } catch (e) { console.error(e); }
    }
  };
"""

content = re.sub(r'const endCall = async \(\) => \{[\s\S]*?setCurrentCallId\(null\);\n    \}\n  \};', new_endCall.strip(), content)

with open('pages/Messages.tsx', 'w') as f:
    f.write(content)

print("Messages.tsx patched for endCall duration")
