import re

with open("pages/MyOrders.tsx", "r") as f:
    content = f.read()

# Add SHIPPED_IN_COURIER and RETURNED to StatusIconSmall
old_icon = """    case OrderStatus.DELIVER_ON_COURIER:
      return (
        <div className={base + "bg-orange-50 text-orange-600"}>
          <Icon name="truck-moving" />
        </div>
      );"""

new_icon = """    case OrderStatus.DELIVER_ON_COURIER:
    case OrderStatus.SHIPPED_IN_COURIER:
      return (
        <div className={base + "bg-orange-50 text-orange-600"}>
          <Icon name="truck-moving" />
        </div>
      );
    case OrderStatus.RETURNED:
      return (
        <div className={base + "bg-red-50 text-red-600"}>
          <Icon name="times-circle" />
        </div>
      );"""

content = content.replace(old_icon, new_icon)

with open("pages/MyOrders.tsx", "w") as f:
    f.write(content)
