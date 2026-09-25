import re

with open("pages/admin/ManageUsers.tsx", "r") as f:
    content = f.read()

# First, add the update functions to ManageUsers.tsx
functions_to_add = """
  const updateCustomTotalSold = async (uid: string, value: number) => {
    try {
      await updateDoc(doc(db, "users", uid), { customTotalSold: value });
      if (detailModal.user && detailModal.user.uid === uid) {
        setDetailModal({ ...detailModal, user: { ...detailModal.user, customTotalSold: value } as any });
      }
      notify(`Total Sold updated to ${value}`, "success");
    } catch (e) { notify("Failed to update Total Sold", "error"); }
  };

  const updateCustomPositiveReviewPercent = async (uid: string, value: number) => {
    try {
      await updateDoc(doc(db, "users", uid), { customPositiveReviewPercent: value });
      if (detailModal.user && detailModal.user.uid === uid) {
        setDetailModal({ ...detailModal, user: { ...detailModal.user, customPositiveReviewPercent: value } as any });
      }
      notify(`Positive Review % updated to ${value}%`, "success");
    } catch (e) { notify("Failed to update Positive Review %", "error"); }
  };

  const updateCustomRegularBuyer = async (uid: string, value: number) => {
    try {
      await updateDoc(doc(db, "users", uid), { customRegularBuyer: value });
      if (detailModal.user && detailModal.user.uid === uid) {
        setDetailModal({ ...detailModal, user: { ...detailModal.user, customRegularBuyer: value } as any });
      }
      notify(`Regular Buyers updated to ${value}`, "success");
    } catch (e) { notify("Failed to update Regular Buyers", "error"); }
  };
"""

content = content.replace("const updateFollowersCount", functions_to_add + "\n  const updateFollowersCount")

# Add the UI part right below Followers Count (Manage) closing div.
# We will match the end of Followers Count section.

# Find the end of Followers Count section by looking for:
# "Followers Count (Manage)" and finding the matching closing div.
ui_to_add = """

            {/* Other Seller Stats Management */}
            {detailModal.user.role === 'seller' && (
              <div className="bg-zinc-50 dark:bg-[#1A1A1A] rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
                <h4 className="text-xs font-semibold tracking-normal text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                  <Icon name="chart-bar" className="text-[#3b82f6]" />
                  Other Store Stats (Overrides)
                </h4>
                
                {/* Total Sold */}
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between mb-6">
                  <div>
                    <p className="text-sm font-medium text-zinc-500">Sold by Store</p>
                    <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">
                      {(detailModal.user as any).customTotalSold !== undefined ? (detailModal.user as any).customTotalSold : 'Real Data'}
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      placeholder="e.g. 50000"
                      id="admin-totalsold-input"
                      defaultValue={(detailModal.user as any).customTotalSold || ''}
                      className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold w-32 outline-none text-zinc-900 dark:text-white"
                    />
                    <button
                      onClick={() => {
                        const val = (document.getElementById("admin-totalsold-input") as HTMLInputElement)?.value;
                        if (val !== undefined && val !== "") updateCustomTotalSold(detailModal.user!.uid, Number(val));
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Update
                    </button>
                  </div>
                </div>
                
                {/* Positive Review Percent */}
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between mb-6 border-t border-zinc-200 dark:border-zinc-800 pt-6">
                  <div>
                    <p className="text-sm font-medium text-zinc-500">Positive Review %</p>
                    <p className="text-xl font-black text-zinc-900 dark:text-white mt-1">
                      {(detailModal.user as any).customPositiveReviewPercent !== undefined ? `${(detailModal.user as any).customPositiveReviewPercent}%` : 'Real Data'}
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="number"
                      placeholder="e.g. 98"
                      max="100"
                      id="admin-positive-input"
                      defaultValue={(detailModal.user as any).customPositiveReviewPercent || ''}
                      className="px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold w-32 outline-none text-zinc-900 dark:text-white"
                    />
                    <button
                      onClick={() => {
                        const val = (document.getElementById("admin-positive-input") as HTMLInputElement)?.value;
                        if (val !== undefined && val !== "") updateCustomPositiveReviewPercent(detailModal.user!.uid, Number(val));
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Update
                    </button>
                  </div>
                </div>

                {/* Regular Buyers */}
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

              </div>
            )}

"""

# Insert ui_to_add before "Partner Management" block
content = content.replace('Partner Management', ui_to_add + 'Partner Management')

with open("pages/admin/ManageUsers.tsx", "w") as f:
    f.write(content)

