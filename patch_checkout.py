import re
import sys

with open('pages/Checkout.tsx', 'r') as f:
    content = f.read()

find_str = """
        // Notify the customer themselves
"""
insert_str = """
        // Notify the seller
        const sellerId = orderData.items?.[0]?.sellerId;
        if (sellerId) {
          fetch("/api/web-push/send-order", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify({ sellerId, orderId: docRef.id })
          }).catch(console.error);
        }
        
        // Notify the customer themselves
"""

content = content.replace(find_str.strip(), insert_str.strip())

with open('pages/Checkout.tsx', 'w') as f:
    f.write(content)

print("Checkout.tsx patched")
