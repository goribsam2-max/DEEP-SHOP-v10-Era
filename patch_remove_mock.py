import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

# Remove the fallback mock array
content = re.sub(
    r'// Fallback Mock Top Selling Products[\s\S]*?\];\s*};',
    r'};',
    content
)

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)
