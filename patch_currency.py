import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

# Replace ${totalEarnings.toLocaleString()} with {formatPrice(totalEarnings)}
content = content.replace('${totalEarnings.toLocaleString()}', '{formatPrice(totalEarnings)}')
content = content.replace('${averageOrderValue}', '{formatPrice(averageOrderValue)}')

# Update formatPrice instances in order details and products
content = content.replace('${(item.price * (item.quantity || 1)).toFixed(2)}', '{formatPrice(item.price * (item.quantity || 1))}')
content = content.replace('${orderSubtotal.toFixed(2)}', '{formatPrice(orderSubtotal)}')
content = content.replace('-${discountAmount.toFixed(2)}', '-{formatPrice(discountAmount)}')
content = content.replace('${shippingCharge.toFixed(2)}', '{formatPrice(shippingCharge)}')
content = content.replace('${taxAmount.toFixed(2)}', '{formatPrice(taxAmount)}')
content = content.replace('${totalAmount.toFixed(2)}', '{formatPrice(totalAmount)}')
content = content.replace('-${advancePaid.toFixed(2)}', '-{formatPrice(advancePaid)}')
content = content.replace('${dueAmount.toFixed(2)}', '{formatPrice(dueAmount)}')
content = content.replace('${p.price}', '{formatPrice(p.price)}')
content = content.replace('${p.advanceAmount}', '{formatPrice(p.advanceAmount)}')

# Check for "$(" or similar if missed
content = content.replace('Price ($) *', 'Price (৳) *')
content = content.replace('Advance Payment Required ($)', 'Advance Payment Required (৳)')
content = content.replace('Global Advance Payment ($)', 'Global Advance Payment (৳)')
content = content.replace('Price ($)', 'Price (৳)')

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)
