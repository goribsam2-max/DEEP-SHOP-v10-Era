const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

// 1. States
code = code.replace(/const \[attachment, setAttachment\] = useState<File \| null>\(null\);/, 'const [attachments, setAttachments] = useState<File[]>([]);');
code = code.replace(/const \[previewUrl, setPreviewUrl\] = useState<string>\(''\);/, 'const [previewUrls, setPreviewUrls] = useState<string[]>([]);');

// 2. handleFileSelect
const newHandleFileSelect = `const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (attachments.length + files.length > 4) {
        notify("You can attach up to 4 images max", "error");
        return;
      }
      const newValidFiles = files.filter(f => {
        if (f.size > 5 * 1024 * 1024) {
          notify(\`\${f.name} is larger than 5MB and was skipped\`, "error");
          return false;
        }
        return true;
      });
      setAttachments(prev => [...prev, ...newValidFiles]);
      const newUrls = newValidFiles.map(f => URL.createObjectURL(f));
      setPreviewUrls(prev => [...prev, ...newUrls]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };`;
code = code.replace(/const handleFileSelect = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?^\s*\};\n/m, newHandleFileSelect + '\n');

// 3. handleSendMessage attachments logic (channel)
const oldChannelUpload = `let imageUrl = null;
      if (attachment) {
        try {
          notify("Uploading image...", "info");
          imageUrl = await uploadImage(attachment);
          setAttachment(null);
          setPreviewUrl('');
        } catch (e) {
          notify("Failed to upload image", "error");
          return;
        }
      }`;
const newChannelUpload = `let imageUrls: string[] = [];
      if (attachments.length > 0) {
        try {
          notify("Uploading images...", "info");
          for(const file of attachments) {
             const url = await uploadToImgbb(file);
             imageUrls.push(url);
          }
          setAttachments([]);
          setPreviewUrls([]);
        } catch (e) {
          notify("Failed to upload image", "error");
          return;
        }
      }`;
code = code.replace(oldChannelUpload, newChannelUpload);

// also msgData.imageUrl -> msgData.images
code = code.replace(/text: messageText \|\| null,\s*imageUrl,\s*senderId: user\.uid/g, 
  `text: messageText || null,
          images: imageUrls,
          imageUrl: imageUrls[0] || null, // fallback
          senderId: user.uid`);

// 4. handleSendMessage attachments logic (p2p)
const oldP2pUpload = `let imageUrl = null;
    if (attachment) {
      try {
        notify("Uploading image...", "info");
        imageUrl = await uploadImage(attachment);
        setAttachment(null);
        setPreviewUrl('');
      } catch (e) {
        notify("Failed to upload image", "error");
        return;
      }
    }`;
const newP2pUpload = `let imageUrls: string[] = [];
    if (attachments.length > 0) {
      try {
        notify("Uploading images...", "info");
        for(const file of attachments) {
           const url = await uploadToImgbb(file);
           imageUrls.push(url);
        }
        setAttachments([]);
        setPreviewUrls([]);
      } catch (e) {
        notify("Failed to upload image", "error");
        return;
      }
    }`;
code = code.replace(oldP2pUpload, newP2pUpload);

code = code.replace(/text: messageText \|\| null,\s*imageUrl,\s*senderId: user\.uid/g, 
  `text: messageText || null,
          images: imageUrls,
          imageUrl: imageUrls[0] || null, // fallback
          senderId: user.uid`);


fs.writeFileSync('pages/Messages.tsx', code);
