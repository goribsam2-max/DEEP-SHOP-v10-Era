with open("pages/StoreProfile.tsx", "r") as f:
    content = f.read()

content = content.replace("Flag,", "AlertTriangle,")
content = content.replace("Ban,", "XCircle,")
content = content.replace("<Flag ", "<AlertTriangle ")
content = content.replace("<Ban ", "<XCircle ")

with open("pages/StoreProfile.tsx", "w") as f:
    f.write(content)

