import re

with open("components/ui/account-menu.tsx", "r") as f:
    content = f.read()

# Make sure imports are there
if "collection" not in content:
    content = content.replace('import { auth } from "@/firebase";', 'import { auth, db } from "@/firebase";\nimport { collection, query, where, onSnapshot } from "firebase/firestore";')

old_state = """  const [user, setUser] = useState<FirebaseUser | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);"""

new_state = """  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

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

content = content.replace(old_state, new_state)

with open("components/ui/account-menu.tsx", "w") as f:
    f.write(content)
