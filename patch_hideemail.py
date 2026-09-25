import re
import sys

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

# Fix selectedSubscriber.email
old_selected_sub = '{formatDisplayEmail(selectedSubscriber.email) || "No email registered"}'
new_selected_sub = '{(selectedSubscriber.hideEmail && selectedSubscriber.id !== user?.uid) ? "Email Hidden" : (formatDisplayEmail(selectedSubscriber.email) || "No email registered")}'
content = content.replace(old_selected_sub, new_selected_sub)

# Fix activeChat.otherUser.email
old_other_user = '{formatDisplayEmail(activeChat.otherUser?.email) || "No email provided"}'
new_other_user = '{(activeChat.otherUser?.hideEmail && activeChat.otherUser?.uid !== user?.uid && activeChat.otherUser?.id !== user?.uid) ? "Email Hidden" : (formatDisplayEmail(activeChat.otherUser?.email) || "No email provided")}'
content = content.replace(old_other_user, new_other_user)

# Fix adminSearchResult.email
old_admin = '{formatDisplayEmail(adminSearchResult.email)}'
new_admin = '{(adminSearchResult.hideEmail && adminSearchResult.id !== user?.uid) ? "Email Hidden" : formatDisplayEmail(adminSearchResult.email)}'
content = content.replace(old_admin, new_admin)

# Fix seenBy logic inside effects
content = content.replace("updateDoc(doc(db, 'p2p_chats', activeChat.id), {\\n          seenBy: arrayUnion(user.uid)\\n        }).catch(console.error);", "if (currentUserProfile?.readReceipts !== false) {\\n          updateDoc(doc(db, 'p2p_chats', activeChat.id), {\\n            seenBy: arrayUnion(user.uid)\\n          }).catch(console.error);\\n        }")
content = content.replace("updateDoc(doc(db, 'p2p_chats', activeChat.id), {\\n        seenBy: arrayUnion(user.uid)\\n      }).catch(console.error);", "if (currentUserProfile?.readReceipts !== false) {\\n        updateDoc(doc(db, 'p2p_chats', activeChat.id), {\\n          seenBy: arrayUnion(user.uid)\\n        }).catch(console.error);\\n      }")

with open('pages/Messages.tsx', 'w') as f:
    f.write(content)
print("Patched hideEmail and readReceipts")
