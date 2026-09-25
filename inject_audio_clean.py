import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

new_code = """
                                            {msg.audioUrl && (
                                                <div className={`px-2 py-2 ${msg.text ? 'mb-1' : ''}`}>
                                                    <audio controls src={msg.audioUrl} className="max-w-[200px] h-10" />
                                                </div>
                                            )}"""

content = content.replace('{(msg.images && msg.images.length > 0) ? (', new_code + '\n                                            {(msg.images && msg.images.length > 0) ? (')

with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
    f.write(content)

print("Injected cleanly.")
