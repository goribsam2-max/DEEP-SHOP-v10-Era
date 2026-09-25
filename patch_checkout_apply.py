import re
import sys

with open('pages/Checkout.tsx', 'r') as f:
    content = f.read()

apply_promo_old = """
      // For typed-in codes, search promo_codes collection
      const q = query(
        collection(db, "promo_codes"),
        where("code", "==", couponCode.trim().toUpperCase()),
      );
      const snap = await getDocs(q);
      if (snap.empty) setCouponError("Invalid promo code");
      else {
        const c = snap.docs[0].data();
"""

apply_promo_new = """
      // Search promo_codes first
      const qPromo = query(
        collection(db, "promo_codes"),
        where("code", "==", couponCode.trim().toUpperCase()),
      );
      let snap = await getDocs(qPromo);
      
      let isVoucher = false;
      if (snap.empty) {
         // Search coupons collection as fallback
         const qCoupon = query(
            collection(db, "coupons"),
            where("code", "==", couponCode.trim().toUpperCase()),
         );
         snap = await getDocs(qCoupon);
         isVoucher = true;
      }
      
      if (snap.empty) {
        setCouponError("Invalid promo/coupon code");
      } else {
        const c = snap.docs[0].data();
"""

content = content.replace(apply_promo_old.strip(), apply_promo_new.strip())

# Fix the `{ id: snap.docs[0].id, ...c, isVoucher: false }`
content = content.replace("setAppliedPromo({ id: snap.docs[0].id, ...c, isVoucher: false });", "setAppliedPromo({ id: snap.docs[0].id, ...c, isVoucher });")


with open('pages/Checkout.tsx', 'w') as f:
    f.write(content)

print("Checkout applyPromo patched")
