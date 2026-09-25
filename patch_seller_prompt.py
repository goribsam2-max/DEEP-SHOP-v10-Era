import re
import sys

with open('pages/seller/Dashboard.tsx', 'r') as f:
    content = f.read()

# Add states
content = content.replace('  const [nagadNumber, setNagadNumber] = useState("");', '  const [nagadNumber, setNagadNumber] = useState("");\n  const [cancelOrderPrompt, setCancelOrderPrompt] = useState<{orderId: string} | null>(null);\n  const [cancelReason, setCancelReason] = useState("");')

# Update logic
old_update = """
  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      let updateData: any = { status };
      
      if (status === OrderStatus.CANCELLED) {
        const reason = window.prompt("Reason for rejection:");
        if (reason === null) return;
        updateData.rejectReason = reason;
      }
      
      await updateDoc(doc(db, "orders", orderId), updateData);
"""
new_update = """
  const handleConfirmCancel = async () => {
    if (!cancelOrderPrompt) return;
    try {
      await updateDoc(doc(db, "orders", cancelOrderPrompt.orderId), {
        status: OrderStatus.CANCELLED,
        rejectReason: cancelReason
      });
      notify("Order cancelled", "success");
      setCancelOrderPrompt(null);
      setCancelReason("");
    } catch(e) {
      console.error(e);
      notify("Failed to cancel", "error");
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      if (status === OrderStatus.CANCELLED) {
        setCancelOrderPrompt({ orderId });
        return;
      }
      
      let updateData: any = { status };
      await updateDoc(doc(db, "orders", orderId), updateData);
"""
content = content.replace(old_update.strip(), new_update.strip())

# Add Modal rendering at the end of the file before `</DesktopLayout>` or something.
modal_render = """
      <AnimatePresence>
        {cancelOrderPrompt && (
          <div className="fixed inset-0 z-[60000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCancelOrderPrompt(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl z-10 border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Cancel Order</h3>
              <p className="text-sm text-zinc-500 mb-4">Please provide a reason for cancelling this order. The customer will be notified.</p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Out of stock"
                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm text-zinc-900 dark:text-white mb-4 outline-none focus:ring-2 focus:ring-rose-500/50 resize-none h-24"
              />
              <div className="flex items-center gap-3">
                <button onClick={() => setCancelOrderPrompt(null)} className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold transition">Back</button>
                <button onClick={handleConfirmCancel} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold transition">Confirm Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
"""
# find where to insert. Maybe before final `</>` or `</div>` if it has one.
# Let's insert before `</div>\n    </DesktopLayout>` or something similar.
content = content.replace('    </DesktopLayout>\n  );\n}', modal_render + '\n    </DesktopLayout>\n  );\n}')
content = content.replace('    </div>\n  );\n}', modal_render + '\n    </div>\n  );\n}') # just in case DesktopLayout is not used.

with open('pages/seller/Dashboard.tsx', 'w') as f:
    f.write(content)
