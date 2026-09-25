import re
import sys

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

# 1. Add send-p2p to handleSendMessage
send_msg_find = """
          });
        }
        
        await addDoc(collection(db, 'p2p_chats', chatId, 'messages'), {
"""
send_msg_push = """
          });
        }
        
        const textMsg = newMessage.trim();
        await addDoc(collection(db, 'p2p_chats', chatId, 'messages'), {
"""
content = content.replace(send_msg_find, send_msg_push)

send_msg_find2 = """
        if (newMessage.trim() && audioHelper && typeof audioHelper.playSend === 'function') {
          audioHelper.playSend();
        }
"""
send_msg_push2 = """
        if (newMessage.trim() && audioHelper && typeof audioHelper.playSend === 'function') {
          audioHelper.playSend();
        }
        
        // Trigger Push
        const recipientId = activeChat.otherUser?.id || activeChat.otherUser?.uid;
        if (recipientId && !activeChat.otherUser?.isOnline) {
             fetch('/api/web-push/send-p2p', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     targetUserId: recipientId,
                     title: `${user.displayName || 'Someone'}`,
                     body: textMsg || (uploading ? 'Sent an attachment' : 'Sent a message'),
                     link: `/messages?chatId=${user.uid}`
                 })
             }).catch(() => {});
        }
"""
content = content.replace(send_msg_find2, send_msg_push2)


# 2. Forward message push
forward_msg_find = """
        await addDoc(collection(db, 'p2p_chats', chatId, 'messages'), msgData);
"""
forward_msg_push = """
        await addDoc(collection(db, 'p2p_chats', chatId, 'messages'), msgData);
        if (recipientId) {
             fetch('/api/web-push/send-p2p', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     targetUserId: recipientId,
                     title: `${user.displayName || 'Someone'} forwarded a message`,
                     body: msgData.text || 'Forwarded an attachment',
                     link: `/messages?chatId=${user.uid}`
                 })
             }).catch(() => {});
        }
"""
content = content.replace(forward_msg_find, forward_msg_push)


# 3. Call push
call_find = """
    try {
      const callRef = await addDoc(collection(db, 'p2p_calls'), {
"""
call_push = """
    try {
      fetch('/api/web-push/send-p2p', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
               targetUserId: activeChat.otherUser.id,
               title: `Incoming ${callType} call 📞`,
               body: `${user.displayName || 'Someone'} is calling you...`,
               link: `/messages?chatId=${user.uid}`
           })
       }).catch(() => {});
       
      const callRef = await addDoc(collection(db, 'p2p_calls'), {
"""
content = content.replace(call_find, call_push)


with open('pages/Messages.tsx', 'w') as f:
    f.write(content)

print("Messages.tsx push notifications patched")
