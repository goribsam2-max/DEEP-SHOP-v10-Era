import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

old_click = """                   <button 
                     onClick={() => setActiveTab("add_product")}
                     className="h-10 px-4 bg-zinc-900 text-white rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-zinc-800"
                   >
                     <Plus className="w-4 h-4" /> Add New
                   </button>"""

new_click = """                   <button 
                     onClick={() => {
                       resetProductForm();
                       setProductEditingId(null);
                       setActiveTab("add_product");
                     }}
                     className="h-10 px-4 bg-zinc-900 text-white rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-zinc-800"
                   >
                     <Plus className="w-4 h-4" /> Add New
                   </button>"""

content = content.replace(old_click, new_click)

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)

