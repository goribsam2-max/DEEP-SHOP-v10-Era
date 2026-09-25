import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

# Replace P2P chat bubble
old_p2p = """                                            {(msg.images && msg.images.length > 0) ? ("""
new_p2p = """                                            {msg.audioUrl && (
                                                <div className={`px-2 py-2 ${msg.text ? 'mb-1' : ''}`}>
                                                    <audio controls src={msg.audioUrl} className="max-w-[200px] h-10" />
                                                </div>
                                            )}
                                            {(msg.images && msg.images.length > 0) ? ("""
content = content.replace(old_p2p, new_p2p)

with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
    f.write(content)
print("Injected audio players")
