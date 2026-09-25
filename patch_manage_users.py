import re

with open("pages/admin/ManageUsers.tsx", "r") as f:
    content = f.read()

old_str = """                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Icon name="shield-check" className="text-[#EF8020]" />
                      KYC Identity Verification
                    </p>"""

new_str = """                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Icon name="shield-check" className="text-[#EF8020]" />
                      KYC Identity Verification
                    </div>"""

if old_str in content:
    content = content.replace(old_str, new_str)
    with open("pages/admin/ManageUsers.tsx", "w") as f:
        f.write(content)
    print("Patched ManageUsers.tsx successfully")
else:
    print("Could not find old_str in ManageUsers.tsx")
