import re

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

# Add spinner in preview area
old_preview_start = """                         {previewUrls.length > 0 && (
    <div className="flex flex-wrap gap-2 mb-3">"""
new_preview_start = """                         {(previewUrls.length > 0 || isUploadingAttachment) && (
    <div className="flex flex-wrap items-center gap-2 mb-3">
        {isUploadingAttachment && (
            <div className="w-20 h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <span className="text-[10px] font-medium text-zinc-500">Uploading...</span>
            </div>
        )}"""
content = content.replace(old_preview_start, new_preview_start)

# Disable send button if uploading
content = content.replace("onClick={handleSendMessage}", "onClick={handleSendMessage} disabled={isUploadingAttachment}")

with open('pages/Messages.tsx', 'w') as f:
    f.write(content)

print("Spinner patched")
