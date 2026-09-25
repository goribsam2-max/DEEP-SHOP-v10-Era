import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

modal_jsx = """      {/* Cancel Reason Modal */}
      <AnimatePresence>
        {cancelOrderId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl"
            >
              <h3 className="text-lg font-bold text-zinc-900 mb-2">Cancel Order</h3>
              <p className="text-sm text-zinc-500 mb-4">Please provide a reason for cancelling this order.</p>
              <Textarea 
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Item out of stock, etc..."
                className="w-full min-h-[100px] mb-4 bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-sm"
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setCancelOrderId(null);
                    setCancelReason("");
                  }}
                  className="flex-1 h-12 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl font-bold text-sm transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    if (!cancelReason.trim()) return;
                    updateOrderStatus(cancelOrderId, OrderStatus.CANCELLED, cancelReason);
                    setCancelOrderId(null);
                  }}
                  className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-sm transition-colors"
                >
                  Confirm Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>"""

# Find the main <div className="min-h-screen"> return block
content = content.replace('<div className="min-h-screen bg-white md:bg-[#F5F5F7] flex pb-20 md:pb-0 relative text-zinc-900">', '<div className="min-h-screen bg-white md:bg-[#F5F5F7] flex pb-20 md:pb-0 relative text-zinc-900">\n' + modal_jsx)

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)

