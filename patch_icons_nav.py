import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

# Remove fill from Sidebar and Mobile Nav
content = content.replace('fill-zinc-900 text-zinc-900', 'text-zinc-900')
content = content.replace('fill-zinc-900 text-zinc-900', 'text-[#EF8020]')

# Redo NavItem
old_nav_item = """  const NavItem = ({ icon: Icon, label, tab }: any) => {
    const isActive = activeTab === tab || activeTab.startsWith(tab);
    return (
      <button
        onClick={() => { setActiveTab(tab); setSelectedOrderId(null); }}
        className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
          isActive ? "text-zinc-900" : "text-zinc-400 hover:text-zinc-600"
        }`}
      >
        <Icon className={`w-6 h-6 mb-1 ${isActive ? "fill-zinc-900 text-zinc-900" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
        <span className={`text-[10px] font-medium ${isActive ? "font-bold text-zinc-900" : ""}`}>{label}</span>
      </button>
    );
  };"""

new_nav_item = """  const NavItem = ({ icon: Icon, label, tab }: any) => {
    const isActive = activeTab === tab || activeTab.startsWith(tab);
    return (
      <button
        onClick={() => { setActiveTab(tab); setSelectedOrderId(null); }}
        className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all relative ${
          isActive ? "text-[#EF8020]" : "text-zinc-400 hover:text-zinc-600"
        }`}
      >
        <Icon className={`w-6 h-6 mb-1 ${isActive ? "text-[#EF8020]" : ""}`} strokeWidth={isActive ? 2.5 : 2} />
        <span className={`text-[10px] font-medium ${isActive ? "font-bold text-[#EF8020]" : ""}`}>{label}</span>
        {isActive && <div className="absolute -bottom-2 w-1 h-1 bg-[#EF8020] rounded-full" />}
      </button>
    );
  };"""

content = content.replace(old_nav_item, new_nav_item)

# Remove Bell icon completely from header
content = re.sub(
    r'<button className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-100 relative">.*?<Bell.*?</button>',
    '',
    content,
    flags=re.DOTALL
)

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)

