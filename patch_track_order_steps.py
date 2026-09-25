import re

with open("pages/TrackOrder.tsx", "r") as f:
    content = f.read()

# Replace active array conditions to include the new statuses
content = content.replace(
    '[OrderStatus.PACKAGING, OrderStatus.SHIPPED, OrderStatus.ON_THE_WAY, OrderStatus.DELIVERED]',
    '[OrderStatus.PACKAGING, OrderStatus.COMPLETE_PACKAGING, OrderStatus.SHIPPED, OrderStatus.DELIVER_ON_COURIER, OrderStatus.ON_THE_WAY, OrderStatus.DELIVERED]'
)

content = content.replace(
    '[OrderStatus.SHIPPED, OrderStatus.ON_THE_WAY, OrderStatus.DELIVERED]',
    '[OrderStatus.SHIPPED, OrderStatus.DELIVER_ON_COURIER, OrderStatus.ON_THE_WAY, OrderStatus.DELIVERED]'
)

# Fix StatusIcon switch case
old_switch = """  switch (status) {
    case OrderStatus.HOLD:
      return (
        <div className={base + "bg-yellow-100 text-yellow-600"}>
          <Icon name="pause" className="text-xl" />
        </div>
      );
    case OrderStatus.PROCESSING:
      return (
        <div className={base + "bg-blue-100 text-blue-600"}>
          <Icon name="sync-alt" className="text-xl animate-spin" />
        </div>
      );
    case OrderStatus.PACKAGING:
      return (
        <div className={base + "bg-purple-100 text-purple-600"}>
          <Icon name="box" className="text-xl" />
        </div>
      );
    case OrderStatus.SHIPPED:
      return (
        <div className={base + "bg-orange-100 text-orange-600"}>
          <Icon name="truck-moving" className="text-xl" />
        </div>
      );
    case OrderStatus.DELIVERED:
      return (
        <div className={base + "bg-green-100 text-green-600"}>
          <Icon name="check" className="text-xl" />
        </div>
      );"""

new_switch = """  switch (status) {
    case OrderStatus.HOLD:
      return (
        <div className={base + "bg-yellow-100 text-yellow-600"}>
          <Icon name="pause" className="text-xl" />
        </div>
      );
    case OrderStatus.APPROVED:
    case OrderStatus.CHECKING_PAYMENT:
    case OrderStatus.PROCESSING:
      return (
        <div className={base + "bg-blue-100 text-blue-600"}>
          <Icon name="sync-alt" className="text-xl animate-spin" />
        </div>
      );
    case OrderStatus.PACKAGING:
    case OrderStatus.COMPLETE_PACKAGING:
      return (
        <div className={base + "bg-purple-100 text-purple-600"}>
          <Icon name="box" className="text-xl" />
        </div>
      );
    case OrderStatus.SHIPPED:
    case OrderStatus.DELIVER_ON_COURIER:
    case OrderStatus.ON_THE_WAY:
      return (
        <div className={base + "bg-orange-100 text-orange-600"}>
          <Icon name="truck-moving" className="text-xl" />
        </div>
      );
    case OrderStatus.DELIVERED:
      return (
        <div className={base + "bg-green-100 text-green-600"}>
          <Icon name="check" className="text-xl" />
        </div>
      );"""

content = content.replace(old_switch, new_switch)

with open("pages/TrackOrder.tsx", "w") as f:
    f.write(content)

