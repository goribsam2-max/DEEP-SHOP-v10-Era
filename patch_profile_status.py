import re

with open("pages/Profile.tsx", "r") as f:
    content = f.read()

# Update "To Pay" (usually Pending or Checking Payment)
content = content.replace('o.status === OrderStatus.PENDING', '(o.status === OrderStatus.PENDING || o.status === OrderStatus.CHECKING_PAYMENT)')

# Update "To Ship" (usually processing, packaging)
content = content.replace('o.status === OrderStatus.SHIPPED || o.status === OrderStatus.ON_THE_WAY', '(o.status === OrderStatus.APPROVED || o.status === OrderStatus.PROCESSING || o.status === OrderStatus.PACKAGING || o.status === OrderStatus.COMPLETE_PACKAGING)')

# Update "To Receive" (usually shipped, on the way, deliver on courier)
# In the original code, "To Receive" was DELIVERED within 24h. Let me check what "To Receive" had originally.
