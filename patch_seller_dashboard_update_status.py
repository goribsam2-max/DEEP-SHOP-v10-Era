import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

# Add import for sendPushNotification if not present
if "sendPushNotification" not in content:
    content = content.replace('import { uploadToImgbb } from "../../services/imgbb";', 'import { uploadToImgbb } from "../../services/imgbb";\nimport { sendPushNotification } from "../../lib/push";')

old_update = """  const updateOrderStatus = async (orderId: string, status: OrderStatus, rejectReason?: string) => {
    try {
      let updateData: any = { status };
      if (status === OrderStatus.CANCELLED) {
        if (rejectReason !== undefined) {
          updateData.rejectReason = rejectReason;
        } else {
          setCancelModalOrderId(orderId);
          setCancelReasonText("");
          return;
        }
      }"""

new_update = """  const updateOrderStatus = async (orderId: string, status: OrderStatus, rejectReason?: string) => {
    try {
      let updateData: any = { status };
      if (status === OrderStatus.CANCELLED || status === OrderStatus.RETURNED) {
        if (rejectReason !== undefined) {
          updateData.rejectReason = rejectReason;
        } else {
          setCancelModalOrderId(orderId);
          setCancelReasonText("");
          return;
        }
      }
      if (status === OrderStatus.SHIPPED_IN_COURIER) {
        updateData.courierPaymentStatus = 'pending';
      }"""

content = content.replace(old_update, new_update)

old_notif = """      if (orderObj && orderObj.userId && orderObj.userId !== "guest") {
        await addDoc(collection(db, "notifications"), {
          userId: orderObj.userId,
          title: `📦 Order Status: ${status}`,
          message: `Your order #${orderId.slice(0, 8)} has been updated to "${status}".`,
          createdAt: Date.now(),
          isRead: false,
          type: "order",
          link: `/profile`
        });
      }"""

new_notif = """      if (orderObj && orderObj.userId && orderObj.userId !== "guest") {
        let msgTitle = `📦 Order Status: ${status}`;
        let msgBody = `Your order #${orderId.slice(0, 8)} has been updated to "${status}".`;
        let msgLink = `/profile`;
        
        if (status === OrderStatus.SHIPPED_IN_COURIER) {
          msgTitle = "📦 Order Shipped via Courier";
          msgBody = `Your order #${orderId.slice(0, 8)} is on the way. Please check delivery details.`;
          msgLink = `/orders`; // direct them to orders
        } else if (status === OrderStatus.RETURNED) {
          msgTitle = "❌ Order Returned";
          msgBody = `Product return চলে যাচ্ছে। কারণ: ${rejectReason || 'Unknown'}`;
          msgLink = `/orders`;
        }
        
        await addDoc(collection(db, "notifications"), {
          userId: orderObj.userId,
          title: msgTitle,
          message: msgBody,
          createdAt: Date.now(),
          isRead: false,
          type: "order",
          link: msgLink
        });
        
        if (status === OrderStatus.SHIPPED_IN_COURIER) {
          sendPushNotification(orderObj.userId, {
            title: msgTitle,
            body: msgBody,
            url: msgLink
          });
        }
      }"""

content = content.replace(old_notif, new_notif)

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)
