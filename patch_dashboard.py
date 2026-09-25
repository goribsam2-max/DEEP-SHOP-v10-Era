import re

with open("pages/admin/Dashboard.tsx", "r") as f:
    content = f.read()

replacement = """id: 'manage-icons',
    name: 'Manage Icons',
    info: 'Manage universal SVG icons',
    icon: ImageIcon,
    pinned: false,
    href: 'icons'
  },
  {
    id: 'illustrations',
    name: 'Manage Illustrations',
    info: 'Manage empty state graphics',
    icon: ImageIcon,
    pinned: false,
    href: 'illustrations'
  },"""

# Just find the block between id: 'manage-icons' and the end of the illustrations block
start = content.find("id: 'manage-icons'")
end = content.find("id: 'manage-payment-settings'")

if start != -1 and end != -1:
    content = content[:start] + replacement + "\n  {\n    " + content[end:]
    with open("pages/admin/Dashboard.tsx", "w") as f:
        f.write(content)
else:
    print("Not found")

