import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

# 1. Add cancelModalStatus to state
content = content.replace('const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);',
                          'const [cancelModalOrderId, setCancelModalOrderId] = useState<string | null>(null);\n  const [cancelModalStatus, setCancelModalStatus] = useState<OrderStatus | null>(null);')

# 2. Update `updateOrderStatus` to use cancelModalStatus
old_update = """      if (status === OrderStatus.CANCELLED || status === OrderStatus.RETURNED) {
        if (rejectReason !== undefined) {
          updateData.rejectReason = rejectReason;
        } else {
          setCancelModalOrderId(orderId);
          setCancelReasonText("");
          return;
        }
      }"""

new_update = """      if (status === OrderStatus.CANCELLED || status === OrderStatus.RETURNED) {
        if (rejectReason !== undefined) {
          updateData.rejectReason = rejectReason;
        } else {
          setCancelModalOrderId(orderId);
          setCancelModalStatus(status);
          setCancelReasonText("");
          return;
        }
      }"""

content = content.replace(old_update, new_update)

# 3. Update the modal UI
old_modal = """      {/* Rejection / Cancellation Reason Dialog Modal */}
      {cancelModalOrderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setCancelModalOrderId(null)} 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          />
          
          {/* Modal Card */}
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-zinc-100 dark:border-zinc-800 dark:border-zinc-800 relative z-10 animate-in fade-in zoom-in-95 duration-300 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-[15px]">Cancel / Reject Order</h3>
              <button 
                onClick={() => setCancelModalOrderId(null)} 
                className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 font-medium">
              Please provide a brief reason for rejecting/cancelling order <span className="font-bold text-zinc-700 dark:text-zinc-300">#{cancelModalOrderId.slice(0, 8)}</span>. The customer will see this reason in their order history.
            </p>
            
            <textarea 
              value={cancelReasonText} 
              onChange={(e) => setCancelReasonText(e.target.value)} 
              placeholder="e.g., Product out of stock, delivery area not covered, etc..." 
              className="w-full h-24 p-3 rounded-2xl bg-[#F5F5F7] dark:bg-zinc-800 text-xs font-medium placeholder:text-zinc-400 dark:placeholder:text-zinc-500 dark:text-zinc-500 dark:placeholder:text-zinc-500 dark:text-zinc-400 dark:text-zinc-500 outline-none border-none resize-none focus:ring-1 focus:ring-[#EF8020] text-zinc-900 dark:text-zinc-100 dark:text-zinc-100"
            />
            
            <div className="flex gap-3">
              <button 
                onClick={() => setCancelModalOrderId(null)} 
                className="flex-1 h-12 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl"
              >
                Go Back
              </button>
              <button 
                disabled={!cancelReasonText.trim()} 
                onClick={async () => {
                  if (cancelReasonText.trim()) {
                    await updateOrderStatus(cancelModalOrderId, OrderStatus.CANCELLED, cancelReasonText.trim());
                    setCancelModalOrderId(null);
                    setCancelReasonText("");
                  }
                }} 
                className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}"""

new_modal = """      {/* Rejection / Cancellation Reason Dialog Modal */}
      {cancelModalOrderId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setCancelModalOrderId(null)} 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          />
          
          {/* Modal Card */}
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-6 shadow-2xl border border-zinc-100 dark:border-zinc-800 relative z-10 animate-in fade-in zoom-in-95 duration-300 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-[15px]">{cancelModalStatus === OrderStatus.RETURNED ? "Return Order" : "Cancel / Reject Order"}</h3>
              <button 
                onClick={() => setCancelModalOrderId(null)} 
                className="w-8 h-8 rounded-full bg-[#F5F5F7] dark:bg-zinc-800 flex items-center justify-center text-zinc-400 dark:text-zinc-500 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
              Please provide a brief reason for {cancelModalStatus === OrderStatus.RETURNED ? "returning" : "rejecting/cancelling"} order <span className="font-bold text-zinc-700 dark:text-zinc-300">#{cancelModalOrderId.slice(0, 8)}</span>. The customer will see this reason in their order history.
            </p>
            
            <textarea 
              value={cancelReasonText} 
              onChange={(e) => setCancelReasonText(e.target.value)} 
              placeholder={cancelModalStatus === OrderStatus.RETURNED ? "e.g., Customer refused delivery, etc..." : "e.g., Product out of stock, delivery area not covered, etc..."} 
              className="w-full h-24 p-3 rounded-2xl bg-[#F5F5F7] dark:bg-zinc-800 text-xs font-medium placeholder:text-zinc-400 outline-none border-none resize-none focus:ring-1 focus:ring-[#EF8020] text-zinc-900 dark:text-zinc-100"
            />
            
            <div className="flex gap-3">
              <button 
                onClick={() => setCancelModalOrderId(null)} 
                className="flex-1 h-12 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl"
              >
                Go Back
              </button>
              <button 
                disabled={!cancelReasonText.trim()} 
                onClick={async () => {
                  if (cancelReasonText.trim()) {
                    await updateOrderStatus(cancelModalOrderId, cancelModalStatus || OrderStatus.CANCELLED, cancelReasonText.trim());
                    setCancelModalOrderId(null);
                    setCancelModalStatus(null);
                    setCancelReasonText("");
                  }
                }} 
                className="flex-1 h-12 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm"
              >
                {cancelModalStatus === OrderStatus.RETURNED ? "Submit Return" : "Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}"""

content = content.replace(old_modal, new_modal)

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)
