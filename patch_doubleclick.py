import re
import sys

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

# Add onDoubleClick handler to P2P and Channel bubbles
p2p_bubble = """                                         <div 
                                             onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(isMenuOpen ? null : msg.id); }}"""
p2p_bubble_new = """                                         <div 
                                             onDoubleClick={(e) => { e.stopPropagation(); handleReactToMessage(msg.id, '❤️'); }}
                                             onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(isMenuOpen ? null : msg.id); }}"""
content = content.replace(p2p_bubble, p2p_bubble_new)

channel_bubble = """                                          <div 
                                              onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(isMenuOpen ? null : msg.id); }}"""
channel_bubble_new = """                                          <div 
                                              onDoubleClick={(e) => { e.stopPropagation(); handleReactToChannelMessage(msg.id, '❤️'); }}
                                              onClick={(e) => { e.stopPropagation(); setActiveMessageMenuId(isMenuOpen ? null : msg.id); }}"""
content = content.replace(channel_bubble, channel_bubble_new)

with open('pages/Messages.tsx', 'w') as f:
    f.write(content)

print("Added double click to react")
