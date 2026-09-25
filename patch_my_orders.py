import re

with open("pages/MyOrders.tsx", "r") as f:
    content = f.read()

old_button = """                {order.status === OrderStatus.SHIPPED_IN_COURIER ? (
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate(`/order-courier-payment/${order.id}`) }}
                      className="w-full py-3.5 bg-[#EF8020] hover:bg-[#d97017] text-white transition-colors shadow-md rounded-full font-bold text-sm px-4 text-center leading-tight"
                    >
                      কুরিয়ার থেকে গ্রহণ করুন বা ডেলিভারি ম্যানের নাম্বার দেখুন
                    </button>
                    <div className="flex items-center gap-3">"""

new_button = """                {order.status === OrderStatus.SHIPPED_IN_COURIER ? (
                  <div className="flex flex-col gap-3">
                    {order.courierName && order.riderNumber ? (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex flex-col gap-2 text-center">
                        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Courier: {order.courierName}</p>
                        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">Rider Number: {order.riderNumber}</p>
                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-2">
                          Please pay the remaining amount of {order.total - (order.paymentOption === "Full Payment" ? order.total : (order.advanceAmount !== undefined && order.advanceAmount !== null ? order.advanceAmount : 150)) - Math.round(order.total * 0.20)} Tk to the courier.
                        </p>
                      </div>
                    ) : order.courierPaymentStatus === 'checking' ? (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-center gap-2">
                        <Icon name="clock" className="w-5 h-5 text-amber-500" />
                        <span className="text-sm font-bold text-amber-800 dark:text-amber-300">Payment Checking</span>
                      </div>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/payment/${order.id}`) }}
                        className="w-full flex items-center justify-center gap-2 py-3.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 transition-colors shadow-md rounded-full font-bold text-sm px-4 text-center leading-tight"
                      >
                        <Icon name="lock" className="w-4 h-4" />
                        কুরিয়ার থেকে গ্রহণ করুন বা ডেলিভারি ম্যানের নাম্বার দেখুন
                      </button>
                    )}
                    <div className="flex items-center gap-3">"""

content = content.replace(old_button, new_button)

with open("pages/MyOrders.tsx", "w") as f:
    f.write(content)
