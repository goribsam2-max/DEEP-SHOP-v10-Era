import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

content = content.replace(')) : (\n                      <div className="text-center py-6 text-zinc-500 text-sm">No sales data yet.</div>\n                    )}', '))} ')

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)

