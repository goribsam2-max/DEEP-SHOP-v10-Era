import re

with open("App.tsx", "r") as f:
    content = f.read()

content = content.replace("import { NotificationPermissionModal } from './components/ui/NotificationPermissionModal';\\nimport BanOverlay from './components/BanOverlay';", "import { NotificationPermissionModal } from './components/ui/NotificationPermissionModal';\nimport BanOverlay from './components/BanOverlay';")

with open("App.tsx", "w") as f:
    f.write(content)
