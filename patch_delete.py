import re

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

# Fix handleOpenDeleteMessageDialog
content = content.replace("handleOpenDeleteMessageDialog(msg.id);", "setDeleteMessageId(msg.id);")

with open('pages/Messages.tsx', 'w') as f:
    f.write(content)

print("Delete patched")
