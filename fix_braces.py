with open("pages/StoreProfile.tsx", "r") as f:
    code = f.read()

import re

if code.count("{") > code.count("}"):
    diff = code.count("{") - code.count("}")
    print(f"Missing {diff} closing braces. Adding...")
    code += "\n}" * diff

with open("pages/StoreProfile.tsx", "w") as f:
    f.write(code)
