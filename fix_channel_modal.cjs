const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

// 1. Full-screen Modal container
code = code.replace(/<div className="fixed inset-0 z-\[10000\] flex items-center justify-center p-4 bg-black\/60 backdrop-blur-sm">/g, 
'<div className="fixed inset-0 z-[10000] bg-white dark:bg-zinc-950 overflow-y-auto">');
code = code.replace(/<motion\.div\s*initial=\{\{ opacity: 0, scale: 0\.95, y: 10 \}\}\s*animate=\{\{ opacity: 1, scale: 1, y: 0 \}\}\s*exit=\{\{ opacity: 0, scale: 0\.95, y: 10 \}\}\s*className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative overflow-hidden font-inter"/g, 
'<motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="w-full max-w-2xl mx-auto p-4 sm:p-6 md:p-8 relative min-h-[100dvh] font-inter">');

// 2. Remove URL input and use file upload
const urlInputHTML = `{/* Cover Image URL */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Channel Image Cover URL
                  </label>
                  <input
                    type="url"
                    value={chanImage}
                    onChange={(e) => setChanImage(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full text-sm bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-emerald-500/50 text-zinc-900 dark:text-zinc-100"
                  />
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10.5px] font-bold text-zinc-400">Quick Gradients:</span>
                    {[
                      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
                      'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=150&q=80',
                      'https://images.unsplash.com/photo-1618005198143-e528346d9a77?auto=format&fit=crop&w=150&q=80'
                    ].map((url, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        onClick={() => setChanImage(url)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                      >
                        Preset {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>`;

const fileUploadHTML = `{/* Cover Image Upload */}
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Channel Image Cover
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setChanImageFile(e.target.files[0]);
                        setChanImagePreview(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                    className="w-full text-sm bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-emerald-500/50 text-zinc-900 dark:text-zinc-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {chanImagePreview && (
                      <div className="mt-4 w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500 mx-auto">
                          <img src={chanImagePreview} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                  )}
                </div>`;

// Wait, the regex might be tricky if formatting differs. We can use index of to find and replace.
const urlInputIndex = code.indexOf("{/* Cover Image URL */}");
if (urlInputIndex !== -1) {
    const endOfUrlInput = code.indexOf("</div>", code.indexOf("</div>", code.indexOf("</div>", urlInputIndex) + 6) + 6) + 6;
    // Just find the start of {/* Action Buttons */} to be safe
    const actionButtonsIndex = code.indexOf("{/* Action Buttons */}");
    if (actionButtonsIndex !== -1 && actionButtonsIndex > urlInputIndex) {
        code = code.substring(0, urlInputIndex) + fileUploadHTML + "\n              </div>\n              " + code.substring(actionButtonsIndex);
    }
}

// 3. Update handleCreateChannel to use ImgBB
const handleCreateChannelRegex = /\/\/ Default cover image if none provided[\s\S]*?const newChannelDoc = \{/;
const handleCreateChannelReplacement = `let finalImage = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80';
      if (chanImageFile) {
        notify("Uploading image...", "info");
        try {
            finalImage = await uploadToImgbb(chanImageFile);
        } catch(e) {
            notify("Failed to upload image", "error");
            setIsCreatingChannel(false);
            return;
        }
      }
      const newChannelDoc = {`;
code = code.replace(handleCreateChannelRegex, handleCreateChannelReplacement);


fs.writeFileSync('pages/Messages.tsx', code);
