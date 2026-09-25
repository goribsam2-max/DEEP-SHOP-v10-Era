import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

old_classes = '"flex items-center gap-4 p-4 cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-white dark:bg-zinc-200 dark:bg-zinc-800/50 shadow-sm dark:shadow-none",'
new_classes = '"flex items-center gap-3 p-4 cursor-pointer transition-all hover:bg-[#F8F9FB] dark:hover:bg-zinc-800/50 relative border-b border-zinc-50 dark:border-zinc-800/20",'

if old_classes in content:
    content = content.replace(old_classes, new_classes)
    with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
        f.write(content)
    print("Updated chat card classes")
else:
    print("Not found")

# Replace active chat bg
old_active = 'activeChat?.id === chat.id ? "bg-zinc-50 dark:bg-zinc-200 dark:bg-zinc-800" : ""'
new_active = 'activeChat?.id === chat.id ? "bg-[#F8F9FB] dark:bg-zinc-800 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-[#4E4AEB] before:rounded-r-full" : ""'
if old_active in content:
    content = content.replace(old_active, new_active)
    with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
        f.write(content)
    print("Updated active chat indicator")

