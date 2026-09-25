import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

# Add Courier Dues button
old_sidebar = """          <button onClick={() => { setActiveTab("products"); setSelectedOrderId(null); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${activeTab === "products" || activeTab === "add_product" || activeTab === "edit_product" ? "bg-[#EF8020]/10 text-[#EF8020]" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>
            <Icon name="boxes" className={`w-5 h-5 ${activeTab === "products" || activeTab === "add_product" || activeTab === "edit_product" ? "text-[#EF8020]" : "text-zinc-400 dark:text-zinc-500"}`} /> Products
          </button>"""

new_sidebar = """          <button onClick={() => { setActiveTab("products"); setSelectedOrderId(null); }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${activeTab === "products" || activeTab === "add_product" || activeTab === "edit_product" ? "bg-[#EF8020]/10 text-[#EF8020]" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"}`}>
            <Icon name="boxes" className={`w-5 h-5 ${activeTab === "products" || activeTab === "add_product" || activeTab === "edit_product" ? "text-[#EF8020]" : "text-zinc-400 dark:text-zinc-500"}`} /> Products
          </button>
          
          {sellerProfile?.canUseCourierShipping && (
            <button onClick={() => { setActiveTab("courier_dues"); setSelectedOrderId(null); }} className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${activeTab === "courier_dues" ? "bg-[#EF8020]/10 text-[#EF8020]" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"} w-full`}>
              <div className="flex items-center gap-3">
                <Icon name="truck" className={`w-5 h-5 ${activeTab === "courier_dues" ? "text-[#EF8020]" : "text-zinc-400 dark:text-zinc-500"}`} /> Courier Dues
              </div>
              {orders.filter(o => o.courierPaymentStatus === 'checking').length > 0 && (
                <div className="w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black">
                  {orders.filter(o => o.courierPaymentStatus === 'checking').length}
                </div>
              )}
            </button>
          )}"""

content = content.replace(old_sidebar, new_sidebar)

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)
