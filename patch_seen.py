import re
import sys

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

old1 = """      if (user && activeChat.id) {
        updateDoc(doc(db, 'p2p_chats', activeChat.id), {
          seenBy: arrayUnion(user.uid)
        }).catch(console.error);
      }"""
new1 = """      if (user && activeChat.id) {
        if (currentUserProfile?.readReceipts !== false) {
          updateDoc(doc(db, 'p2p_chats', activeChat.id), {
            seenBy: arrayUnion(user.uid)
          }).catch(console.error);
        }
      }"""

old2 = """    if (user && activeChat && activeChat.id && !activeChat.isNew) {
      updateDoc(doc(db, 'p2p_chats', activeChat.id), {
        seenBy: arrayUnion(user.uid)
      }).catch(console.error);
    }"""
new2 = """    if (user && activeChat && activeChat.id && !activeChat.isNew) {
      if (currentUserProfile?.readReceipts !== false) {
        updateDoc(doc(db, 'p2p_chats', activeChat.id), {
          seenBy: arrayUnion(user.uid)
        }).catch(console.error);
      }
    }"""

content = content.replace(old1, new1).replace(old2, new2)

with open('pages/Messages.tsx', 'w') as f:
    f.write(content)

print("seenBy patched")
