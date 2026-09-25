import re

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

# Fix remoteAudioRef play
old_audio = """            } else {
              if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = event.streams[0];
              }
            }"""
new_audio = """            } else {
              if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = event.streams[0];
                remoteAudioRef.current.play().catch(e => console.error("Audio play failed:", e));
              }
            }"""
content = content.replace(old_audio, new_audio)

with open('pages/Messages.tsx', 'w') as f:
    f.write(content)

print("WebRTC patched")
