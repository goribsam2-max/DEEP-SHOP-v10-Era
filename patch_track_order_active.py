import re

with open("pages/TrackOrder.tsx", "r") as f:
    content = f.read()

content = re.sub(
    r'active=\{\[\s*OrderStatus\.PACKAGING,\s*OrderStatus\.SHIPPED,\s*OrderStatus\.ON_THE_WAY,\s*OrderStatus\.DELIVERED,\s*\]\.includes\(order\.status\)\}',
    r'active={[OrderStatus.PACKAGING, OrderStatus.COMPLETE_PACKAGING, OrderStatus.SHIPPED, OrderStatus.DELIVER_ON_COURIER, OrderStatus.ON_THE_WAY, OrderStatus.DELIVERED].includes(order.status)}',
    content
)

content = re.sub(
    r'active=\{\[\s*OrderStatus\.SHIPPED,\s*OrderStatus\.ON_THE_WAY,\s*OrderStatus\.DELIVERED,\s*\]\.includes\(order\.status\)\}',
    r'active={[OrderStatus.SHIPPED, OrderStatus.DELIVER_ON_COURIER, OrderStatus.ON_THE_WAY, OrderStatus.DELIVERED].includes(order.status)}',
    content
)

with open("pages/TrackOrder.tsx", "w") as f:
    f.write(content)

