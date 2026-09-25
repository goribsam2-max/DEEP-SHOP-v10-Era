import re

with open("pages/StoreProfile.tsx", "r") as f:
    content = f.read()

start_idx = content.find("// Auto-seed for deepshop@gmail.com")
end_idx = content.find("let allReviews = [...fetchedReviews];")

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + content[end_idx:]

with open("pages/StoreProfile.tsx", "w") as f:
    f.write(content)

