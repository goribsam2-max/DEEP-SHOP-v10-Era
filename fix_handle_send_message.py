import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

# Update condition
content = content.replace(
    'if ((!newMessage.trim() && previewUrls.length === 0) || !user) return;',
    'if ((!newMessage.trim() && previewUrls.length === 0 && !recordedAudioUrl) || !user) return;'
)

# In community channels
old_msg_data_comm = """        const msgData: any = {
          text: messageText || null,
          images: imageUrls,
          imageUrl: imageUrls[0] || null, // fallback
          senderId: user.uid,
          senderName: user.displayName || 'Seller',
          senderPhoto: user.photoURL || '',
          timestamp: serverTimestamp()
        };"""

new_msg_data_comm = """        const msgData: any = {
          text: messageText || null,
          images: imageUrls,
          imageUrl: imageUrls[0] || null, // fallback
          audioUrl: recordedAudioUrl || null,
          senderId: user.uid,
          senderName: user.displayName || 'Seller',
          senderPhoto: user.photoURL || '',
          timestamp: serverTimestamp()
        };
        setRecordedAudioUrl(null);"""
content = content.replace(old_msg_data_comm, new_msg_data_comm)

# In p2p_chats
old_msg_data_p2p = """    const msgData: any = {
      text: messageText,
      images: imageUrls,
      imageUrl: imageUrls[0] || null,
      senderId: user.uid,
      timestamp: serverTimestamp(),
    };"""

new_msg_data_p2p = """    const msgData: any = {
      text: messageText,
      images: imageUrls,
      imageUrl: imageUrls[0] || null,
      audioUrl: recordedAudioUrl || null,
      senderId: user.uid,
      timestamp: serverTimestamp(),
    };
    setRecordedAudioUrl(null);"""
content = content.replace(old_msg_data_p2p, new_msg_data_p2p)

with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
    f.write(content)
print("Updated handleSendMessage for audioUrl")
