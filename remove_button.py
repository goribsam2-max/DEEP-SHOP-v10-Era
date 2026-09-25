with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    lines = f.readlines()

# Remove lines 2819 to 2829 (inclusive, 0-indexed is 2818 to 2828)
del lines[2818:2829]

with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
    f.writelines(lines)
print("Removed button")
