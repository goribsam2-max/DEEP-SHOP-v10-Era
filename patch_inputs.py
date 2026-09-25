import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

# Make sure CustomDropdown is imported
if 'CustomDropdown' not in content:
    content = content.replace('import { useNotify', 'import { CustomDropdown } from "../../components/CustomDropdown";\nimport { useNotify')

# Add missing fields to form if not there
if 'isOffer' not in content:
    print("Warning: isOffer not found")

# Replace select category
old_category = """                    <div>
                      <Label className="text-xs font-bold text-zinc-900 ml-1 mb-1.5 block">Category *</Label>
                      <select 
                        value={productForm.category === "custom" ? "custom" : productForm.category} 
                        onChange={e => setProductForm({...productForm, category: e.target.value})}
                        className="w-full rounded-xl bg-[#F5F5F7] border-transparent h-12 px-3 text-sm outline-none"
                      >
                        <option value="Border Cross Products">Border Cross Products</option>
                        <option value="Mobile">Mobile</option>
                        <option value="Smart Watch">Smart Watch</option>
                        <option value="Earbuds">Earbuds</option>
                        <option value="Accessories">Accessories</option>
                      </select>
                    </div>"""

new_category = """                    <div>
                      <Label className="text-xs font-bold text-zinc-900 ml-1 mb-1.5 block">Category *</Label>
                      <CustomDropdown
                        options={["Border Cross Products", "Mobile", "Smart Watch", "Earbuds", "Accessories"]}
                        value={productForm.category}
                        onChange={(val) => setProductForm({...productForm, category: val})}
                        placeholder="Select Category"
                        className="h-12 bg-[#F5F5F7] rounded-xl"
                      />
                    </div>
                    
                    {/* Additional Options */}
                    <div className="grid grid-cols-2 gap-4 mt-2">
                       <div>
                         <Label className="text-xs font-bold text-zinc-900 ml-1 mb-1.5 block">Special Offer</Label>
                         <label className="flex items-center space-x-2 bg-[#F5F5F7] h-12 px-3 rounded-xl cursor-pointer">
                           <input type="checkbox" checked={productForm.isOffer} onChange={e => setProductForm({...productForm, isOffer: e.target.checked})} className="rounded text-[#EF8020] focus:ring-[#EF8020]" />
                           <span className="text-xs font-bold text-zinc-700">Enable Offer</span>
                         </label>
                       </div>
                       {productForm.isOffer && (
                         <div>
                           <Label className="text-xs font-bold text-zinc-900 ml-1 mb-1.5 block">Offer Price (৳)</Label>
                           <Input type="number" value={productForm.offerPrice} onChange={e => setProductForm({...productForm, offerPrice: e.target.value})} placeholder="e.g. 50" className="rounded-xl bg-[#F5F5F7] border-transparent h-12" />
                         </div>
                       )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                       <div>
                         <Label className="text-xs font-bold text-zinc-900 ml-1 mb-1.5 block">Cash on Delivery</Label>
                         <label className="flex items-center space-x-2 bg-[#F5F5F7] h-12 px-3 rounded-xl cursor-pointer">
                           <input type="checkbox" checked={productForm.isCodEnabled} onChange={e => setProductForm({...productForm, isCodEnabled: e.target.checked})} className="rounded text-[#EF8020] focus:ring-[#EF8020]" />
                           <span className="text-xs font-bold text-zinc-700">Allow COD</span>
                         </label>
                       </div>
                       <div>
                         <Label className="text-xs font-bold text-zinc-900 ml-1 mb-1.5 block">D Coin Reward</Label>
                         <Input type="number" value={productForm.coinReward} onChange={e => setProductForm({...productForm, coinReward: e.target.value})} placeholder="0" className="rounded-xl bg-[#F5F5F7] border-transparent h-12" />
                       </div>
                    </div>"""

if old_category in content:
    content = content.replace(old_category, new_category)
else:
    print("Warning: old category select not found")

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)

