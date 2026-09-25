import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

# Replace P2P chat bubble
match = re.search(r'(\s*\{\(msg\.images && msg\.images\.length > 0\) \? \()', content)
if match:
    new_code = """                                            {msg.audioUrl && (
                                                <div className={`px-2 py-2 ${msg.text ? 'mb-1' : ''}`}>
                                                    <audio controls src={msg.audioUrl} className="max-w-[200px] h-10" />
                                                </div>
                                            )}"""
    content = content.replace(match.group(1), new_code + match.group(1))
    with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
        f.write(content)
    print("Injected audio player successfully.")
else:
    print("Could not find condition.")
