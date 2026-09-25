import re

with open("pages/admin/Dashboard.tsx", "r") as f:
    content = f.read()

replacement = """        'manage-affiliate-videos': 'banners',
        'manage-riders': 'users',
        'manage-staff': 'config',
        'manage-icons': 'config',
        'illustrations': 'config'"""

content = re.sub(r"'manage-affiliate-videos': 'banners',\s*'manage-riders': 'users',\s*'manage-staff': 'config'", replacement, content)

with open("pages/admin/Dashboard.tsx", "w") as f:
    f.write(content)
