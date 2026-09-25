import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

# Fix p2p chat image uploading
old_p2p_upload = """    let imageUrls: string[] = [];
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

new_p2p_upload = """    let imageUrls: string[] = [...previewUrls];
    setPreviewUrls([]);
    setAttachments([]);"""

if old_p2p_upload in content:
    content = content.replace(old_p2p_upload, new_p2p_upload)
    print("Replaced P2P image upload logic")
else:
    print("Could not find P2P image upload logic")

content = content.replace('attachments.length === 0', 'previewUrls.length === 0')
content = content.replace('attachments.length > 0', 'previewUrls.length > 0')

with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
    f.write(content)

