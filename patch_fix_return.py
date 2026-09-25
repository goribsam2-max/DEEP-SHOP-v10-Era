import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

content = content.replace('if (sorted.length > 0) return sorted.slice(0, 5);', 'return sorted.slice(0, 5);')

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)

