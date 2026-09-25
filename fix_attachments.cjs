const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

code = code.replace(/const \[attachment, setAttachment\] = useState<File \| null>\(null\);/g, `const [attachments, setAttachments] = useState<File[]>([]);`);
code = code.replace(/const \[previewUrl, setPreviewUrl\] = useState<string>\(''\);/g, `const [previewUrls, setPreviewUrls] = useState<string[]>([]);`);

const fileSelectRegex = /const handleFileSelect = \(e: React\.ChangeEvent<HTMLInputElement>\) => \{[\s\S]*?^\s*\};\n/m;
const fileSelectMatch = code.match(fileSelectRegex);
if (fileSelectMatch) {
    const newFileSelect = `const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
`;
    code = code.replace(fileSelectMatch[0], newFileSelect);
}

// In handleSendMessage
// find: if (attachment) { ... uploadImage(attachment) ... imageUrl = ... }
// replace with looping over attachments
code = code.replace(/let imageUrl = null;\s*if \(attachment\) \{[\s\S]*?imageUrl = await uploadImage\(attachment\);[\s\S]*?\}\s*\}/g,
`let imageUrls: string[] = [];
      if (attachments.length > 0) {
        notify("Uploading images...", "info");
        try {
          for (const file of attachments) {
            const url = await uploadImage(file);
            imageUrls.push(url);
          }
        } catch (e) {
          console.error(e);
          notify("Failed to upload one or more images", "error");
          setIsTyping(false);
          setAttachments([]);
          setPreviewUrls([]);
          return;
        }
      }`);
      
// Now in new message objects, they currently only have `imageUrl` possibly string. We need to save `images: imageUrls` or just `imageUrl: imageUrls[0]` if backend only supports 1. Wait! The user says "4 ta image preview soho dekhaba". Does the chat message rendering support multiple images?
// Let's check how images are rendered in messages.
