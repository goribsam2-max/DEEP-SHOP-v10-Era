import re

with open("pages/StoreProfile.tsx", "r") as f:
    content = f.read()

# Make StoreProfile responsive to dark mode
content = content.replace('className="bg-white min-h-screen text-zinc-900 font-sans max-w-md mx-auto"', 'className="bg-white dark:bg-black min-h-screen text-zinc-900 dark:text-white font-sans max-w-md mx-auto"')
content = content.replace('className="flex items-center justify-between px-4 py-3 border-b border-zinc-100"', 'className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800"')

# Remove back button from seller header
content = content.replace('<button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-zinc-100">\n              <ArrowLeft className="w-5 h-5" />\n            </button>', '')

# We will handle other replacements through standard edits.
with open("pages/StoreProfile.tsx", "w") as f:
    f.write(content)

