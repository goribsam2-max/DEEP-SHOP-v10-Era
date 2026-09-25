import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

# Replace references to shippingAddress?.fullName with customerName
content = content.replace('ord.shippingAddress?.fullName || "Guest"', 'ord.customerName || "Guest"')
content = content.replace('order.shippingAddress?.fullName || "Guest User"', 'order.customerName || "Guest User"')
content = content.replace('ord.shippingAddress?.fullName || ord.userId', 'ord.customerName || ord.userId')

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)

