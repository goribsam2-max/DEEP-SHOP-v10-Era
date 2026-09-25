import re
import sys

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

# find formatDuration
fd_regex = r'  const formatDuration = \(seconds: number\) => \{[\s\S]*?return `\$\{m.toString\(\).padStart\(2, '\''0'\''\)\}:\$\{s.toString\(\).padStart\(2, '\''0'\''\)\}`;\n  \};\n'
fd_match = re.search(fd_regex, content)
if fd_match:
    fd_str = fd_match.group(0)
    # remove it
    content = content.replace(fd_str, '')
    
    # insert it before endCall
    content = content.replace('const endCall = async () => {', fd_str + '\n  const endCall = async () => {')
    
    with open('pages/Messages.tsx', 'w') as f:
        f.write(content)
    print("Moved formatDuration")
else:
    print("Could not find formatDuration")
