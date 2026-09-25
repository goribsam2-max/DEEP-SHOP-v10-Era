import re

with open("pages/Messages.tsx", "r") as f:
    content = f.read()

content = content.replace("otherUserTrust.status === \"untrusted\"", "otherUserTrust.hasScamWarning")

with open("pages/Messages.tsx", "w") as f:
    f.write(content)
