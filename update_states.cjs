const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const targetState = `  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);`;
const replaceState = `  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [showAutoDeleteModal, setShowAutoDeleteModal] = useState(false);
  
  useEffect(() => {
      const handleOpenDelete = (e: any) => setDeleteMessageId(e.detail.msgId);
      const handleOpenAutoDelete = () => setShowAutoDeleteModal(true);
      window.addEventListener('open-delete-message', handleOpenDelete);
      window.addEventListener('open-auto-delete', handleOpenAutoDelete);
      return () => {
          window.removeEventListener('open-delete-message', handleOpenDelete);
          window.removeEventListener('open-auto-delete', handleOpenAutoDelete);
      };
  }, []);`;

if(code.includes(targetState)) {
    code = code.replace(targetState, replaceState);
    fs.writeFileSync('pages/Messages.tsx', code);
    console.log("State replaced");
} else {
    console.log("State Target not found");
}
