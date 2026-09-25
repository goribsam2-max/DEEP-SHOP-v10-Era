import re
import sys

with open('server.ts', 'r') as f:
    content = f.read()

push_endpoints = """
  app.post("/api/web-push/send-p2p", express.json(), async (req, res) => {
    try {
      const { targetUserId, title, body, link, image } = req.body;
      if (!targetUserId || !title || !body) return res.status(400).json({ error: "Missing fields" });

      const userDoc = await getFirestore().collection("users").doc(targetUserId).get();
      if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

      const sub = userDoc.data()?.webPushSub;
      if (!sub) return res.status(200).json({ success: true, count: 0 });

      const payload = JSON.stringify({
         title, body, image, icon: "/favicon.png", data: { url: link || "/" }
      });

      await webpush.sendNotification(sub, payload);
      res.json({ success: true, count: 1 });
    } catch (e: any) {
      console.error("P2P Push error:", e);
      res.status(500).json({ error: "Failed" });
    }
  });

  app.post("/api/web-push/send-order", express.json(), async (req, res) => {
    try {
      const { sellerId, orderId } = req.body;
      if (!sellerId) return res.status(400).json({ error: "Missing fields" });

      const sellerDoc = await getFirestore().collection("users").doc(sellerId).get();
      if (!sellerDoc.exists) return res.status(404).json({ error: "Seller not found" });

      const sub = sellerDoc.data()?.webPushSub;
      if (!sub) return res.status(200).json({ success: true, count: 0 });

      const payload = JSON.stringify({
         title: "New Order Received! 🛍️",
         body: `You have a new order #${orderId}. Check your dashboard.`,
         icon: "/favicon.png",
         data: { url: "/seller/dashboard" }
      });

      await webpush.sendNotification(sub, payload);
      res.json({ success: true, count: 1 });
    } catch (e: any) {
      console.error("Order Push error:", e);
      res.status(500).json({ error: "Failed" });
    }
  });
"""

content = content.replace('  app.post("/api/web-push/send-push-channel",', push_endpoints + '\n  app.post("/api/web-push/send-push-channel",')

with open('server.ts', 'w') as f:
    f.write(content)
print("Server patched for push notifications")
