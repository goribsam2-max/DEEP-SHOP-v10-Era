import re

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

# Add isUploadingAttachment state
state_match = "const [attachments, setAttachments] = useState<File[]>([]);\n  const [previewUrls, setPreviewUrls] = useState<string[]>([]);"
state_replace = "const [attachments, setAttachments] = useState<File[]>([]);\n  const [previewUrls, setPreviewUrls] = useState<string[]>([]);\n  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);"
content = content.replace(state_match, state_replace)

# Modify handleFileSelect
old_select = """  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (attachments.length + files.length > 4) {
        notify("You can attach up to 4 images max", "error");
        return;
      }
      const newValidFiles = files.filter(f => {
        if (f.size > 5 * 1024 * 1024) {
          notify(`${f.name} is larger than 5MB and was skipped`, "error");
          return false;
        }
        return true;
      });
      setAttachments(prev => [...prev, ...newValidFiles]);
      const newUrls = newValidFiles.map(f => URL.createObjectURL(f));
      setPreviewUrls(prev => [...prev, ...newUrls]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };"""

new_select = """  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      if (previewUrls.length + files.length > 4) {
        notify("You can attach up to 4 images max", "error");
        return;
      }
      const newValidFiles = files.filter(f => {
        if (f.size > 5 * 1024 * 1024) {
          notify(`${f.name} is larger than 5MB and was skipped`, "error");
          return false;
        }
        return true;
      });
      
      setIsUploadingAttachment(true);
      try {
        const uploadedUrls = [];
        for (const file of newValidFiles) {
            const url = await uploadToImgbb(file);
            uploadedUrls.push(url);
        }
        setPreviewUrls(prev => [...prev, ...uploadedUrls]);
      } catch (err) {
        notify("Failed to upload image", "error");
      } finally {
        setIsUploadingAttachment(false);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };"""

content = content.replace(old_select, new_select)

# We need to remove the image uploading logic from handleSendMessage because it's already uploaded.
# For channel:
old_send_ch = """      let imageUrls: string[] = [];
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
      }"""
new_send_ch = """      let imageUrls: string[] = [...previewUrls];
      setPreviewUrls([]);"""
content = content.replace(old_send_ch, new_send_ch)

# And for P2P handleSendMessage:
old_send_p2p = """      let imageUrls: string[] = [];
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
      }"""
new_send_p2p = """      let imageUrls: string[] = [...previewUrls];
      setPreviewUrls([]);"""
content = content.replace(old_send_p2p, new_send_p2p)

# We also need to fix the condition `(!newMessage.trim() && attachments.length === 0)`
content = content.replace("(!newMessage.trim() && attachments.length === 0)", "(!newMessage.trim() && previewUrls.length === 0)")

with open('pages/Messages.tsx', 'w') as f:
    f.write(content)

print("Upload patched")
