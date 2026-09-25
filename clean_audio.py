import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

# I'll just remove all the injected audioUrl blocks entirely and re-inject carefully.
audio_block_pattern = r'(\s*\{msg\.audioUrl && \(\s*<div className=\{`px-2 py-2 \$\{msg\.text \? \'mb-1\' : \'\'\}`\}>\s*<audio controls src=\{msg\.audioUrl\} className="max-w-\[200px\] h-10" />\s*</div>\s*\)\})'

content = re.sub(audio_block_pattern, '', content)

with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
    f.write(content)
print("Removed old audio blocks")

