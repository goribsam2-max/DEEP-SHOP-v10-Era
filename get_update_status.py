import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "const updateOrderStatus =" in line:
        for j in range(i, i+50):
            print(lines[j], end="")
        break
