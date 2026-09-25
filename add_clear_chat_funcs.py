import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

funcs = """
  const handleClearChat = async (chatId: string) => {
    try {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const q = query(messagesRef);
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: 'Chat history cleared for you',
        updatedAt: serverTimestamp()
      });
      
      notify('Chat history cleared', 'success');
      setShowPrivateChatMenu(false);
    } catch (err) {
      console.error('Error clearing chat history:', err);
      notify('Failed to clear chat history', 'error');
    }
  };

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
      
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: 'Chat history cleared for everyone',
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

match = re.search(r'(\s*if \(!user\) \{)', content)
if match:
    new_content = content[:match.start()] + funcs + content[match.start():]
    with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
        f.write(new_content)
    print("Injected handleClearChat functions")
