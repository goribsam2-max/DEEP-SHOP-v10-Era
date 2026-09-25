import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

# Add states for cancellation modal
state_insert = """  const [shopLogo, setShopLogo] = useState("");"""
state_new = """  const [shopLogo, setShopLogo] = useState("");
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");"""

content = content.replace(state_insert, state_new)

# Modify updateOrderStatus
old_update = """  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      let updateData: any = { status };
      if (status === OrderStatus.CANCELLED) {
        const reason = window.prompt("Reason for rejection:");
        if (reason === null) return;
        updateData.rejectReason = reason;
      }

      await updateDoc(doc(db, "orders", orderId), updateData);"""

new_update = """  const updateOrderStatus = async (orderId: string, status: OrderStatus, reason?: string) => {
    try {
      let updateData: any = { status };
      if (status === OrderStatus.CANCELLED) {
        if (!reason) {
          setCancelOrderId(orderId);
          setCancelReason("");
          return;
        }
        updateData.rejectReason = reason;
      }

      await updateDoc(doc(db, "orders", orderId), updateData);"""

content = content.replace(old_update, new_update)

# Update order action buttons to use dropdown and cancellation logic
old_actions = """                    {/* Action Buttons */}
                    {(order.status === "Pending" || order.status === OrderStatus.PENDING || order.status === OrderStatus.PROCESSING || order.status === "New Order") && (
                      <div className="flex gap-3 pt-4 border-t border-zinc-100">
                        <button 
                          onClick={() => { updateOrderStatus(order.id, OrderStatus.CANCELLED); setSelectedOrderId(null); }}
                          className="flex-1 h-12 bg-rose-500 active:bg-rose-600 rounded-xl flex items-center justify-center gap-2 text-white text-sm font-bold shadow-sm shadow-rose-500/20 transition-all"
                        >
                          Reject <div className="w-px h-4 bg-white/30 mx-1"></div> <X className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { updateOrderStatus(order.id, OrderStatus.CONFIRMED); setSelectedOrderId(null); }}
                          className="flex-1 h-12 bg-emerald-500 active:bg-emerald-600 rounded-xl flex items-center justify-center gap-2 text-white text-sm font-bold shadow-sm shadow-emerald-500/20 transition-all"
                        >
                          Accept <div className="w-px h-4 bg-white/30 mx-1"></div> <Check className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {(order.status === OrderStatus.CONFIRMED) && (
                      <div className="flex gap-3 pt-4 border-t border-zinc-100">
                        <button 
                          onClick={() => { updateOrderStatus(order.id, OrderStatus.SHIPPED); setSelectedOrderId(null); }}
                          className="w-full h-12 bg-zinc-900 active:bg-zinc-800 rounded-xl flex items-center justify-center gap-2 text-white text-sm font-bold shadow-sm transition-all"
                        >
                          Mark as Shipped <Truck className="w-4 h-4" />
                        </button>
                      </div>
                    )}"""

new_actions = """                    {/* Action Buttons & Dropdown */}
                    <div className="flex gap-3 pt-4 border-t border-zinc-100 flex-col">
                      {(order.status === "Pending" || order.status === OrderStatus.PENDING || order.status === "New Order") && (
                        <div className="flex gap-3">
                          <button 
                            onClick={() => { updateOrderStatus(order.id, OrderStatus.CANCELLED); }}
                            className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 rounded-xl flex items-center justify-center gap-2 text-white text-sm font-bold shadow-sm transition-all"
                          >
                            Reject <X className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => { updateOrderStatus(order.id, OrderStatus.APPROVED); }}
                            className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 rounded-xl flex items-center justify-center gap-2 text-white text-sm font-bold shadow-sm transition-all"
                          >
                            Accept <Check className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {order.status !== OrderStatus.PENDING && order.status !== "New Order" && (
                        <div className="flex flex-col gap-2 w-full">
                          <Label className="text-xs font-bold text-zinc-900">Change Status</Label>
                          <select 
                            className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-white text-sm font-bold text-zinc-900 outline-none focus:border-zinc-400"
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                          >
                            {Object.values(OrderStatus).map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>"""

content = content.replace(old_actions, new_actions)
content = content.replace('OrderStatus.CONFIRMED', 'OrderStatus.APPROVED')

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)

