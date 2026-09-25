import re

with open('pages/Coupon.tsx', 'r') as f:
    content = f.read()

old_details = """                    <div>
                        <h3 className="font-bold text-lg mb-1 text-zinc-900 dark:text-zinc-100">{c.code}</h3>
                        <p className="text-xs text-zinc-500">
                            {c.minOrderAmount > 0 ? `For orders over ${formatPrice(c.minOrderAmount)}` : "No minimum order amount"}
                            {c.expiresAt && <span className={`block mt-1 ${isExpired ? 'text-red-500 font-bold' : ''}`}>{isExpired ? "EXPIRED" : `Valid until: ${new Date(c.expiresAt).toLocaleDateString()}`}</span>}
                        </p>
                    </div>"""
new_details = """                    <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{c.code}</h3>
                          {c.sellerId && <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded-full">{c.sellerName || "Store"}</span>}
                        </div>
                        <p className="text-xs text-zinc-500">
                            {c.minOrderAmount > 0 ? `For orders over ${formatPrice(c.minOrderAmount)}` : "No minimum order amount"}
                            {c.expiresAt && <span className={`block mt-1 ${isExpired ? 'text-red-500 font-bold' : ''}`}>{isExpired ? "EXPIRED" : `Valid until: ${new Date(c.expiresAt).toLocaleDateString()}`}</span>}
                        </p>
                    </div>"""
content = content.replace(old_details, new_details)

with open('pages/Coupon.tsx', 'w') as f:
    f.write(content)

print("Coupon UI patched")
