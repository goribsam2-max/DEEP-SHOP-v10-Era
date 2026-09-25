import re

with open("components/ui/account-menu.tsx", "r") as f:
    content = f.read()

# Add imports for firestore
if "collection" not in content:
    content = content.replace('import { auth } from "../../firebase";', 'import { auth, db } from "../../firebase";\nimport { collection, query, where, onSnapshot } from "firebase/firestore";')

# Add state and effect for notifications
if "unreadCount" not in content:
    state_code = """  const [user, setUser] = useState<User | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const q = query(collection(db, "notifications"), where("userId", "==", user.uid), where("isRead", "==", false));
    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.docs.length);
    });
    return () => unsub();
  }, [user]);"""
    
    content = re.sub(r'const \[user, setUser\] = useState<User \| null>\(null\);\s+useEffect\(\(\) => \{[^}]+\}[^}]+\}, \[\]\);', state_code, content)

# Update trigger to show count
old_trigger = """      <DropdownMenuTrigger asChild>
        <button className={triggerClass}>
          {isPill ? (
            <>
              <div className="w-8 h-8 md:w-6 md:h-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs md:text-[10px] font-bold">
                    {initials}
                  </span>
                )}
              </div>
              <span className="hidden md:inline-block text-xs font-semibold truncate max-w-[100px]">
                {displayName}
              </span>
            </>
          ) : (
            <Icon name="user" className="w-5 h-5" />
          )}
        </button>
      </DropdownMenuTrigger>"""

new_trigger = """      <DropdownMenuTrigger asChild>
        <button className={cn(triggerClass, "relative")}>
          {isPill ? (
            <>
              <div className="w-8 h-8 md:w-6 md:h-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs md:text-[10px] font-bold">
                    {initials}
                  </span>
                )}
              </div>
              <span className="hidden md:inline-block text-xs font-semibold truncate max-w-[100px]">
                {displayName}
              </span>
            </>
          ) : (
            <Icon name="user" className="w-5 h-5" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full border border-white dark:border-zinc-900 shadow-sm animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>"""

content = content.replace(old_trigger, new_trigger)

# Update menu item
old_menu_item = """            <DropdownMenuItem
              onClick={() => {
                triggerHaptic();
                navigate("/notifications");
              }}
              className="flex items-center gap-2 rounded-lg py-2 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Icon name="bell" className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              <span className="flex-1">Notifications</span>
            </DropdownMenuItem>"""

new_menu_item = """            <DropdownMenuItem
              onClick={() => {
                triggerHaptic();
                navigate("/notifications");
              }}
              className="flex items-center gap-2 rounded-lg py-2 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <div className="relative">
                <Icon name="bell" className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              </div>
              <span className="flex-1">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </DropdownMenuItem>"""

content = content.replace(old_menu_item, new_menu_item)

with open("components/ui/account-menu.tsx", "w") as f:
    f.write(content)
