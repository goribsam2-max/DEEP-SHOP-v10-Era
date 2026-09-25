import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

func_code = """
  const handleStartNewChat = async () => {
      if (!newChatInput.trim()) return;
      setIsSearchingUser(true);
      try {
          // Search for user by email or phone
          const usersRef = collection(db, 'users');
          // Since we might not have a composite index, we query both and merge, or just try to find by email or phone separately.
          const emailQuery = query(usersRef, where('email', '==', newChatInput.trim().toLowerCase()), limit(1));
          const phoneQuery = query(usersRef, where('phoneNumber', '==', newChatInput.trim()), limit(1));
          
          let targetUserDoc = null;
          const emailSnapshot = await getDocs(emailQuery);
          if (!emailSnapshot.empty) {
              targetUserDoc = emailSnapshot.docs[0];
          } else {
              const phoneSnapshot = await getDocs(phoneQuery);
              if (!phoneSnapshot.empty) {
                  targetUserDoc = phoneSnapshot.docs[0];
              }
          }

          if (targetUserDoc) {
              if (targetUserDoc.id === user.uid) {
                  notify("You cannot start a chat with yourself.", "error");
                  setIsSearchingUser(false);
                  return;
              }
              const targetUserData = targetUserDoc.data();
              // Check if chat already exists
              const existingChat = chats.find(c => c.type === 'p2p' && c.participants.includes(targetUserDoc.id));
              if (existingChat) {
                  setSearchParams({ chatId: existingChat.id });
                  setShowNewChatModal(false);
                  setNewChatInput('');
                  return;
              }
              
              // Create new chat
              const chatsRef = collection(db, 'chats');
              const newChatData = {
                  participants: [user.uid, targetUserDoc.id],
                  type: 'p2p',
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  createdBy: user.uid,
                  lastMessage: 'Chat started',
                  lastSenderId: user.uid,
                  seenBy: [user.uid]
              };
              const docRef = await addDoc(chatsRef, newChatData);
              setSearchParams({ chatId: docRef.id });
              setShowNewChatModal(false);
              setNewChatInput('');
              notify("Chat created successfully!", "success");
          } else {
              notify("No user found with that email or phone number.", "error");
          }
      } catch (err) {
          console.error(err);
          notify("An error occurred while searching for the user.", "error");
      }
      setIsSearchingUser(false);
  };
"""

# inject right before `if (!user) {`
match = re.search(r'(\s*if \(!user\) \{)', content)
if match:
    new_content = content[:match.start()] + func_code + content[match.start():]
    with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
        f.write(new_content)
    print("Injected handleStartNewChat")
else:
    print("Could not find injection point")
