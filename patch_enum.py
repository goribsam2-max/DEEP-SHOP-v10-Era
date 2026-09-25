import re

with open("types.ts", "r") as f:
    content = f.read()

old_enum = """export enum OrderStatus {
  PENDING = 'Pending',
  PROCESSING = 'Processing',
  HOLD = 'On Hold',
  PACKAGING = 'Packaging',
  SHIPPED = 'Shipped',
  ON_THE_WAY = 'On the Way',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled'
}"""

new_enum = """export enum OrderStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  PROCESSING = 'Processing',
  CHECKING_PAYMENT = 'Checking Payment',
  COMPLETE_PACKAGING = 'Complete Packaging',
  DELIVER_ON_COURIER = 'Deliver on Courier',
  ON_THE_WAY = 'On the Way',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled'
}"""

content = content.replace(old_enum, new_enum)

with open("types.ts", "w") as f:
    f.write(content)

