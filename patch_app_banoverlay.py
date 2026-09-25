import re

with open("App.tsx", "r") as f:
    content = f.read()

# Add import
if "BanOverlay" not in content:
    content = content.replace(
        'import NotificationPermissionModal from "./components/ui/NotificationPermissionModal";',
        'import NotificationPermissionModal from "./components/ui/NotificationPermissionModal";\nimport BanOverlay from "./components/BanOverlay";'
    )

# Add component
if "<BanOverlay />" not in content:
    content = content.replace(
        '<ThemeProvider>',
        '<ThemeProvider>\n      <BanOverlay />'
    )

with open("App.tsx", "w") as f:
    f.write(content)
