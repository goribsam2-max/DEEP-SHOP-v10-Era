import re

with open("pages/admin/ManageUsers.tsx", "r") as f:
    content = f.read()

old_regular_buyers = """                {/* Regular Buyers */}
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-6">
                  <div>
                    <p className="text-sm font-medium text-zinc-500">Regular Buyers</p>
                    <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">
                      {(detailModal.user as any).customRegularBuyer !== undefined ? (detailModal.user as any).customRegularBuyer : 'Real Data'}
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      placeholder="e.g. 1500"
                      id="admin-regular-input"
                      defaultValue={(detailModal.user as any).customRegularBuyer || ''}
                      className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold w-32 outline-none text-zinc-900 dark:text-white"
                    />
                    <button
                      onClick={() => {
                        const val = (document.getElementById("admin-regular-input") as HTMLInputElement)?.value;
                        if (val !== undefined && val !== "") updateCustomRegularBuyer(detailModal.user!.uid, Number(val));
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Update
                    </button>
                  </div>
                </div>"""

new_regular_buyers = """                {/* Regular Buyers */}
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-6">
                  <div>
                    <p className="text-sm font-medium text-zinc-500">Regular Buyers</p>
                    <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">
                      {(detailModal.user as any).customRegularBuyer !== undefined ? (detailModal.user as any).customRegularBuyer : 'Real Data'}
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      placeholder="e.g. 1500"
                      id="admin-regular-input"
                      defaultValue={(detailModal.user as any).customRegularBuyer || ''}
                      className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold w-32 outline-none text-zinc-900 dark:text-white"
                    />
                    <button
                      onClick={() => {
                        const val = (document.getElementById("admin-regular-input") as HTMLInputElement)?.value;
                        if (val !== undefined && val !== "") updateCustomRegularBuyer(detailModal.user!.uid, Number(val));
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Update
                    </button>
                  </div>
                </div>

                {/* Courier Shipping Permission */}
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-6 mt-6">
                  <div>
                    <p className="text-sm font-medium text-zinc-500">Courier Shipping Feature</p>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white mt-1">
                      {detailModal.user.canUseCourierShipping ? "Enabled" : "Disabled"}
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={() => updateCourierShippingPermission(detailModal.user!.uid, !detailModal.user.canUseCourierShipping)}
                      className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all ${detailModal.user.canUseCourierShipping ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                    >
                      {detailModal.user.canUseCourierShipping ? "Disable Courier" : "Enable Courier"}
                    </button>
                  </div>
                </div>"""

content = content.replace(old_regular_buyers, new_regular_buyers)

with open("pages/admin/ManageUsers.tsx", "w") as f:
    f.write(content)
