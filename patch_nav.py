import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

# Replace desktop nav active state
content = content.replace('fill-zinc-900 text-zinc-900', 'text-[#EF8020]')
content = content.replace('bg-zinc-100 text-zinc-900', 'bg-[#EF8020]/10 text-[#EF8020]')

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)
