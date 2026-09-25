import re

with open('pages/seller/Dashboard.tsx', 'r') as f:
    content = f.read()

# Add coupon fetching
fetch_match = """    const unsubSettings = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setBkashNumber(data.bkashNumber || "");
            setNagadNumber(data.nagadNumber || "");
            setSellerProfile(data);
        }
    });"""

fetch_replace = """    const unsubSettings = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setBkashNumber(data.bkashNumber || "");
            setNagadNumber(data.nagadNumber || "");
            setSellerProfile(data);
        }
    });
    
    const unsubCoupons = onSnapshot(query(collection(db, "coupons"), where("sellerId", "==", user.uid)), (snapshot) => {
        setCoupons(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });"""
content = content.replace(fetch_match, fetch_replace)

# Add cleanup for unsubCoupons
cleanup_match = """    return () => {
      unsub();
      unsubOrders();
      unsubSettings();
    };"""
cleanup_replace = """    return () => {
      unsub();
      unsubOrders();
      unsubSettings();
      unsubCoupons();
    };"""
content = content.replace(cleanup_match, cleanup_replace)

# Add handleAddCoupon and handleDeleteCoupon
func_match = """  const handleSaveSettings = async () => {"""
func_replace = """
  const handleAddCoupon = async () => {
      if(!newCouponCode || !newCouponDiscount) return;
      try {
          await addDoc(collection(db, "coupons"), {
              code: newCouponCode.toUpperCase(),
              type: "percent",
              discount: Number(newCouponDiscount),
              minOrderAmount: 0,
              createdAt: Date.now(),
              sellerId: user?.uid,
              sellerName: sellerProfile?.shopName || sellerProfile?.displayName || "Seller"
          });
          setNewCouponCode("");
          setNewCouponDiscount("");
          notify("Coupon added", "success");
      } catch(e) {
          notify("Error adding coupon", "error");
      }
  };

  const handleDeleteCoupon = async (id: string) => {
      try {
          await deleteDoc(doc(db, "coupons", id));
          notify("Coupon deleted", "success");
      } catch(e) {
          notify("Error deleting coupon", "error");
      }
  };

  const handleSaveSettings = async () => {"""
content = content.replace(func_match, func_replace)

# Also fix the `discountInfo` inside the render, as I used `discount` in the DB.
content = content.replace("{c.discountInfo}% OFF", "{c.discount}% OFF")

with open('pages/seller/Dashboard.tsx', 'w') as f:
    f.write(content)

print("Seller coupons patched")
