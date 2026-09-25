import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

old_card = """                        <div className="mb-4">
                          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{order.customerName}</p>
                          <p className="text-xs text-zinc-500 mt-1">{order.contactNumber}</p>
                        </div>"""

new_card = """                        <div className="mb-4">
                          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{order.customerName}</p>
                          <p className="text-xs text-zinc-500 mt-1">{order.contactNumber}</p>
                          
                          <div className="mt-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg p-2.5">
                            <p className="text-xs text-indigo-700 dark:text-indigo-300 font-bold mb-1 border-b border-indigo-200 dark:border-indigo-800 pb-1">Products in Order:</p>
                            <ul className="text-[11px] text-indigo-600 dark:text-indigo-400 space-y-0.5">
                              {order.items?.map((item: any, idx: number) => (
                                <li key={idx}>- {item.name} x{item.quantity}</li>
                              ))}
                            </ul>
                            <div className="mt-2 pt-2 border-t border-indigo-200 dark:border-indigo-800 space-y-1">
                              <div className="flex justify-between text-[11px]">
                                <span className="text-indigo-500 dark:text-indigo-400">Total Price:</span>
                                <span className="font-bold text-indigo-700 dark:text-indigo-300">৳{order.total}</span>
                              </div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-indigo-500 dark:text-indigo-400">Previously Paid:</span>
                                <span className="font-bold text-indigo-700 dark:text-indigo-300">৳{order.paymentOption === "Full Payment" ? order.total : (order.advanceAmount !== undefined && order.advanceAmount !== null ? order.advanceAmount : 150)}</span>
                              </div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-indigo-500 dark:text-indigo-400">Courier Due (Paid Now):</span>
                                <span className="font-bold text-[#EF8020]">৳{order.courierPaymentDetails?.amount || Math.round(order.total * 0.20)}</span>
                              </div>
                              <div className="flex justify-between text-[11px]">
                                <span className="text-indigo-500 dark:text-indigo-400">Remaining to Collect:</span>
                                <span className="font-bold text-rose-500 dark:text-rose-400">৳{order.total - (order.paymentOption === "Full Payment" ? order.total : (order.advanceAmount !== undefined && order.advanceAmount !== null ? order.advanceAmount : 150)) - (order.courierPaymentDetails?.amount || Math.round(order.total * 0.20))}</span>
                              </div>
                            </div>
                          </div>
                        </div>"""

content = content.replace(old_card, new_card)

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)
