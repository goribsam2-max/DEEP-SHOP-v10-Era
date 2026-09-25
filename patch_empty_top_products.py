import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

old_list = """                    {topProducts.length > 0 ? topProducts.map((p: any, idx: number) => ("""

new_list = """                    {topProducts.length === 0 && (
                      <p className="text-xs text-zinc-500 text-center py-4">No top selling products yet.</p>
                    )}
                    {topProducts.length > 0 && topProducts.map((p: any, idx: number) => ("""

# Replace mapping condition
content = content.replace(old_list, new_list)
# Fix the ternary ending which was:
# )) : null}
content = content.replace(')) : null}', '))} ')

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)

