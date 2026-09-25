import re

with open("pages/seller/Dashboard.tsx", "r") as f:
    content = f.read()

# Replace Image URL input with Image Upload
old_img_input = """                    <div>
                      <Label className="text-xs font-bold text-zinc-900 ml-1 mb-1.5 block">Image URL</Label>
                      <Input value={productForm.modelUrl} onChange={e => setProductForm({...productForm, modelUrl: e.target.value})} placeholder="https://..." className="rounded-xl bg-[#F5F5F7] border-transparent h-12" />
                    </div>"""

new_img_input = """                    <div>
                      <Label className="text-xs font-bold text-zinc-900 ml-1 mb-1.5 block">Product Images</Label>
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        onChange={e => {
                          if (e.target.files) {
                            setProductForm({...productForm, imageFiles: Array.from(e.target.files)});
                          }
                        }} 
                        className="w-full text-sm text-zinc-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800"
                      />
                      {productForm.imageFiles.length > 0 && (
                        <p className="text-[10px] text-zinc-500 mt-2 ml-1">{productForm.imageFiles.length} files selected</p>
                      )}
                    </div>"""

content = content.replace(old_img_input, new_img_input)

# Update submit handler to upload multiple images
old_submit = """      let finalImageUrl = "";
      if (productForm.imageFiles && productForm.imageFiles.length > 0) {
        finalImageUrl = await uploadToImgbb(productForm.imageFiles[0]);
      } else if (productEditingId) {
        const existing = products.find(p => p.id === productEditingId);
        finalImageUrl = existing?.image || "";
      }

      const productData: any = {"""

new_submit = """      let finalImageUrl = "";
      let uploadedImages: string[] = [];
      if (productForm.imageFiles && productForm.imageFiles.length > 0) {
        // Upload all selected images
        const uploadPromises = productForm.imageFiles.map(file => uploadToImgbb(file));
        const urls = await Promise.all(uploadPromises);
        uploadedImages = urls.filter(url => !!url);
        finalImageUrl = uploadedImages[0] || "";
      } else if (productEditingId) {
        const existing = products.find(p => p.id === productEditingId);
        finalImageUrl = existing?.image || "";
        uploadedImages = existing?.images || [finalImageUrl].filter(Boolean);
      }

      const productData: any = {"""

content = content.replace(old_submit, new_submit)

# Add images array to productData
old_data_img = """      if (finalImageUrl) {
        productData.image = finalImageUrl;
      }"""

new_data_img = """      if (finalImageUrl) {
        productData.image = finalImageUrl;
      }
      if (uploadedImages.length > 0) {
        productData.images = uploadedImages;
      }"""

content = content.replace(old_data_img, new_data_img)

with open("pages/seller/Dashboard.tsx", "w") as f:
    f.write(content)

