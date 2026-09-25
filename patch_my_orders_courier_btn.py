import re

with open("pages/MyOrders.tsx", "r") as f:
    content = f.read()

old_buttons = """                <div className="flex items-center gap-3">
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate(`/e-receipt/${order.id}`) }}
                    className="flex-1 py-3.5 bg-transparent border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors rounded-full font-bold text-zinc-900 dark:text-zinc-100 text-sm"
                  >
                    Invoice
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); navigate(`/track-order/${order.id}`) }}
                    className="flex-[1.5] py-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-md rounded-full font-bold text-sm"
                  >
                    Track Order
                  </button>
                </div>"""

new_buttons = """                {order.status === OrderStatus.SHIPPED_IN_COURIER ? (
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/order-courier-payment/${order.id}`) }}
                      className="w-full py-3.5 bg-[#EF8020] hover:bg-[#d97017] text-white transition-colors shadow-md rounded-full font-bold text-sm px-4 text-center leading-tight"
                    >
                      কুরিয়ার থেকে গ্রহণ করুন বা ডেলিভারি ম্যানের নাম্বার দেখুন
                    </button>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/e-receipt/${order.id}`) }}
                        className="flex-1 py-3 bg-transparent border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors rounded-full font-bold text-zinc-900 dark:text-zinc-100 text-sm"
                      >
                        Invoice
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/track-order/${order.id}`) }}
                        className="flex-[1.5] py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-md rounded-full font-bold text-sm"
                      >
                        Track Order
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/e-receipt/${order.id}`) }}
                      className="flex-1 py-3.5 bg-transparent border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors rounded-full font-bold text-zinc-900 dark:text-zinc-100 text-sm"
                    >
                      Invoice
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/track-order/${order.id}`) }}
                      className="flex-[1.5] py-3.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-md rounded-full font-bold text-sm"
                    >
                      Track Order
                    </button>
                  </div>
                )}"""

content = content.replace(old_buttons, new_buttons)

with open("pages/MyOrders.tsx", "w") as f:
    f.write(content)
