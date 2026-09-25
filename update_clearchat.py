import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

# Let's see if handleClearChatForEveryone exists or we need to add it.
if 'const handleClearChatForEveryone' not in content:
    func_code = """
  const handleClearChatForEveryone = async (chatId: string) => {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(messagesRef);
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      // Update the chat document to clear lastMessage
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: 'Chat history cleared',
        updatedAt: serverTimestamp()
      });
      
      notify('Chat history cleared for everyone', 'success');
      setShowPrivateChatMenu(false);
    } catch (err) {
      console.error('Error clearing chat history for everyone:', err);
      notify('Failed to clear chat history', 'error');
    }
  };
"""
    # inject right after handleClearChat
    match = re.search(r'(const handleClearChat = .*?catch \(err\) \{.*?\};)', content, re.DOTALL)
    if match:
        new_content = content[:match.end()] + func_code + content[match.end():]
        with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
            f.write(new_content)
        print("Added handleClearChatForEveryone")
    else:
        print("handleClearChat not found")
else:
    print("Already exists")
