import re

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

# Fix action section inner div
old_actions = """<div className="p-2 flex flex-col gap-1 bg-white dark:bg-zinc-900">"""
new_actions = """<div className="p-2 flex flex-col gap-1 bg-white dark:bg-zinc-900 rounded-b-[32px]">"""
content = content.replace(old_actions, new_actions)

with open('pages/Messages.tsx', 'w') as f:
    f.write(content)

print("Menu buttons patched")
