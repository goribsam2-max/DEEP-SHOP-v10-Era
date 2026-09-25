import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

# 1. State for the Courier Info modal
modal_state = """  const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);
  const [cancelModalStatus, setCancelModalStatus] = useState<OrderStatus | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState("");
  const [courierCompleteOrderId, setCourierCompleteOrderId] = useState<string | null>(null);
  const [courierNameInput, setCourierNameInput] = useState("");
  const [deliveryManNumberInput, setDeliveryManNumberInput] = useState("");"""

content = content.replace(
    'const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);\n  const [cancelModalStatus, setCancelModalStatus] = useState<OrderStatus | null>(null);\n  const [cancelReasonText, setCancelReasonText] = useState("");',
    modal_state
)

# 2. Add the UI for courier_dues tab
tab_content = """            {/* --- Courier Dues Tab --- */}
            {activeTab === "courier_dues" && !selectedOrderId && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#EF8020]/10 rounded-xl flex items-center justify-center">
                    <Icon name="truck" className="w-5 h-5 text-[#EF8020]" />
                  </div>
                  <div>
                    <h2 className="text-[17px] font-bold text-zinc-900 dark:text-zinc-100">Courier Dues (Checking)</h2>
                    <p className="text-xs text-zinc-500 font-medium">Orders waiting for courier assignment after payment.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {orders.filter(o => o.courierPaymentStatus === 'checking').length === 0 ? (
                    <div className="col-span-full py-10 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl">
                      <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                        <Icon name="check-circle" className="w-8 h-8 text-zinc-400" />
                      </div>
                      <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">No pending dues</h3>
                      <p className="text-xs text-zinc-500 font-medium text-center">You have processed all courier payments.</p>
                    </div>
                  ) : (
                    orders.filter(o => o.courierPaymentStatus === 'checking').map(order => (
                      <div key={order.id} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-0.5 rounded-full tracking-wider">
                              Payment Checking
                            </span>
                          </div>
                          <span className="text-xs font-bold text-zinc-400">#{order.id.slice(0,8)}</span>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{order.customerName}</p>
                          <p className="text-xs text-zinc-500 mt-1">{order.contactNumber}</p>
                        </div>
                        
                        {order.courierPaymentDetails && (
                          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-3 mb-4 space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-500">Paid Amount:</span>
                              <span className="font-bold text-zinc-900 dark:text-zinc-100">৳{order.courierPaymentDetails.amount}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-500">Sender No:</span>
                              <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{order.courierPaymentDetails.senderNumber}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-zinc-500">Trx ID:</span>
                              <span className="font-mono font-bold text-[#EF8020] uppercase">{order.courierPaymentDetails.trxId}</span>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              setCourierCompleteOrderId(order.id);
                              setCourierNameInput("");
                              setDeliveryManNumberInput("");
                            }}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                          >
                            <Check className="w-4 h-4" /> Payment Complete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}"""

content = content.replace('{activeTab === "products" && !selectedOrderId && (', tab_content + '\n\n            {activeTab === "products" && !selectedOrderId && (')

# 3. Add the Modal UI
modal_ui = """      {/* Courier Info Modal */}
      {courierCompleteOrderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            onClick={() => setCourierCompleteOrderId(null)} 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          />
          
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-zinc-100 dark:border-zinc-800 relative z-10 animate-in fade-in zoom-in-95 duration-300 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-[15px]">Assign Courier</h3>
              <button 
                onClick={() => setCourierCompleteOrderId(null)} 
                className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-[11px] text-zinc-500 font-medium">
              Payment confirmed! Please enter the courier assignment details for order <span className="font-bold text-zinc-700 dark:text-zinc-300">#{courierCompleteOrderId.slice(0, 8)}</span>.
            </p>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Courier Name *</label>
                <input 
                  type="text"
                  value={courierNameInput}
                  onChange={e => setCourierNameInput(e.target.value)}
                  placeholder="e.g. Pathao, Steadfast..."
                  className="w-full px-4 py-3 bg-[#F5F5F7] dark:bg-zinc-800 border-none rounded-xl text-sm font-semibold outline-none focus:ring-1 focus:ring-[#EF8020] text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 block">Delivery Man Number *</label>
                <input 
                  type="tel"
                  value={deliveryManNumberInput}
                  onChange={e => setDeliveryManNumberInput(e.target.value)}
                  placeholder="e.g. 01712345678"
                  className="w-full px-4 py-3 bg-[#F5F5F7] dark:bg-zinc-800 border-none rounded-xl text-sm font-semibold outline-none focus:ring-1 focus:ring-[#EF8020] text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-2">
              <button 
                onClick={() => setCourierCompleteOrderId(null)} 
                className="flex-1 h-12 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button 
                disabled={!courierNameInput.trim() || !deliveryManNumberInput.trim()} 
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, "orders", courierCompleteOrderId), {
                      courierPaymentStatus: 'completed',
                      courierName: courierNameInput.trim(),
                      riderNumber: deliveryManNumberInput.trim()
                    });
                    
                    notify("Courier details updated successfully!", "success");
                    
                    // Also notify the user
                    const orderObj = orders.find(o => o.id === courierCompleteOrderId);
                    if (orderObj && orderObj.userId && orderObj.userId !== "guest") {
                      const msgTitle = "📦 Courier Assigned";
                      const msgBody = `Your order #${courierCompleteOrderId.slice(0, 8)} is now with ${courierNameInput.trim()}. Rider Number: ${deliveryManNumberInput.trim()}`;
                      await addDoc(collection(db, "notifications"), {
                        userId: orderObj.userId,
                        title: msgTitle,
                        message: msgBody,
                        createdAt: Date.now(),
                        isRead: false,
                        type: "order",
                        link: `/orders`
                      });
                      sendPushNotification(orderObj.userId, {
                        title: msgTitle,
                        body: msgBody,
                        url: `/orders`
                      });
                    }
                    
                    setOrders(prev => prev.map(o => o.id === courierCompleteOrderId ? { ...o, courierPaymentStatus: 'completed', courierName: courierNameInput.trim(), riderNumber: deliveryManNumberInput.trim() } : o));
                    
                    setCourierCompleteOrderId(null);
                  } catch (err) {
                    console.error(err);
                    notify("Failed to update order", "error");
                  }
                }} 
                className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}"""

content = content.replace('{cancelModalOrderId && (', modal_ui + '\n\n      {cancelModalOrderId && (')

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)
