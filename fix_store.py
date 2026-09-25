with open("pages/StoreProfile.tsx", "r") as f:
    code = f.read()

import re

# Fix imports
if "Search," not in code and "Search" not in code:
    code = code.replace('import { \n  Star,', 'import { \n  Search,\n  MoreVertical,\n  Star,')
elif "Search" not in code:
    code = code.replace('Star,', 'Star,\n  Search,\n  MoreVertical,')

if code.count("{") != code.count("}"):
    print("Brace mismatch!", code.count("{"), code.count("}"))
    code += "\n}\n"

with open("pages/StoreProfile.tsx", "w") as f:
    f.write(code)
