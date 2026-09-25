import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

# Remove the import of sendPushNotification
content = content.replace('import { sendPushNotification } from "../../lib/push";\n', '')
content = content.replace('import { sendPushNotification } from "../../lib/push";', '')

# Define a local helper function for push
push_helper = """
const sendPushNotification = async (userId: string, data: any) => {
  try {
    await fetch("/api/send-push-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...data })
    });
  } catch (e) {
    console.error("Failed to send push:", e);
  }
};
"""

content = content.replace('const Dashboard: React.FC = () => {', push_helper + '\nconst Dashboard: React.FC = () => {')

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)
