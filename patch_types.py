import re

with open("types.ts", "r") as f:
    content = f.read()

old_status = """export enum OrderStatus {
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

new_status = """export enum OrderStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  PROCESSING = 'Processing',
  CHECKING_PAYMENT = 'Checking Payment',
  COMPLETE_PACKAGING = 'Complete Packaging',
  DELIVER_ON_COURIER = 'Deliver on Courier',
  SHIPPED_IN_COURIER = 'Shipped in Courier',
  ON_THE_WAY = 'On the Way',
  DELIVERED = 'Delivered',
  CANCELLED = 'Cancelled',
  RETURNED = 'Returned'
}"""

content = content.replace(old_status, new_status)

with open("types.ts", "w") as f:
    f.write(content)
