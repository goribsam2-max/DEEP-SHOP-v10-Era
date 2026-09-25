import re

with open("App.tsx", "r") as f:
    content = f.read()

# Add import
if "CourierPayment" not in content:
    content = content.replace(
        'import EReceipt from "./pages/EReceipt";',
        'import EReceipt from "./pages/EReceipt";\nconst CourierPayment = lazy(() => import("./pages/CourierPayment"));'
    )

# Add route
if "/order-courier-payment/:orderId" not in content:
    old_route = '<Route path="/track-order/:orderId" element={<TrackOrder />} />'
    new_route = '<Route path="/track-order/:orderId" element={<TrackOrder />} />\n          <Route path="/order-courier-payment/:orderId" element={<CourierPayment />} />'
    content = content.replace(old_route, new_route)

with open("App.tsx", "w") as f:
    f.write(content)
