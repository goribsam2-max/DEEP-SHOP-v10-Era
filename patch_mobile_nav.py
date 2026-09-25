import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

old_nav_item = r"""  const NavItem = \(\{ icon: Icon, label, tab \}: any\) => \{[\s\S]*?\}\);[\s\S]*?\};"""

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

content = re.sub(old_nav_item, new_nav_item, content)

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)
