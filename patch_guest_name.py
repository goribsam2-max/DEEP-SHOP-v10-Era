import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

content = content.replace('ord.customerName || "Guest"', 'ord.customerName || (typeof ord.shippingAddress === "object" ? ord.shippingAddress?.fullName || ord.shippingAddress?.name : "") || "Guest"')
content = content.replace('order.customerName || "Guest User"', 'order.customerName || (typeof order.shippingAddress === "object" ? order.shippingAddress?.fullName || order.shippingAddress?.name : "") || "Guest User"')

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)

