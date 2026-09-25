import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

# Instead of inline array, we generate the array
old_array = """                                {[
                                  { value: OrderStatus.PENDING, label: "Pending" },
                                  { value: OrderStatus.APPROVED, label: "Approved" },
                                  { value: OrderStatus.PROCESSING, label: "Processing" },
                                  { value: "Checking Payment", label: "Checking Payment" },
                                  { value: "Complete Packaging", label: "Complete Packaging" },
                                  { value: "Deliver on Courier", label: "Deliver on Courier" },
                                  { value: OrderStatus.ON_THE_WAY || "On Courier / Shipped", label: "On Courier / Shipped" },
                                  { value: OrderStatus.DELIVERED, label: "Delivered" },
                                  { value: OrderStatus.CANCELLED, label: "Cancelled" }
                                ].map((opt) => ("""

new_array = """                                {([
                                  { value: OrderStatus.PENDING, label: "Pending" },
                                  { value: OrderStatus.APPROVED, label: "Approved" },
                                  { value: OrderStatus.PROCESSING, label: "Processing" },
                                  { value: "Checking Payment", label: "Checking Payment" },
                                  { value: "Complete Packaging", label: "Complete Packaging" },
                                  { value: "Deliver on Courier", label: "Deliver on Courier" },
                                  { value: OrderStatus.ON_THE_WAY || "On Courier / Shipped", label: "On Courier / Shipped" },
                                  { value: OrderStatus.DELIVERED, label: "Delivered" },
                                  { value: OrderStatus.CANCELLED, label: "Cancelled" },
                                  ...(sellerProfile?.canUseCourierShipping ? [
                                    { value: OrderStatus.SHIPPED_IN_COURIER, label: "Shipped in Courier" },
                                    { value: OrderStatus.RETURNED, label: "Returned" }
                                  ] : [])
                                ]).map((opt) => ("""

content = content.replace(old_array, new_array)

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)
