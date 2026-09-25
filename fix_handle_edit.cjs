const fs = require('fs');
let code = fs.readFileSync('pages/Messages.tsx', 'utf8');

const handleCreateStart = code.indexOf("const handleCreateChannel = async () => {");

const handleEditFunc = `
  const handleEditChannel = () => {
    if (!activeChannel) return;
    setChanName(activeChannel.name || '');
    setChanDesc(activeChannel.description || '');
    setChanLink(activeChannel.customLink || '');
    setChanImagePreview(activeChannel.imageUrl || '');
    setChanImageFile(null);
    setIsEditingChannel(true);
    setShowCreateChannelModal(true);
  };

  const submitEditChannel = async () => {
    if (!activeChannel || !user) return;
    setIsCreatingChannel(true);
    try {
      let finalImage = activeChannel.imageUrl;
      if (chanImageFile) {
        notify("Uploading new image...", "info");
        try {
            finalImage = await uploadToImgbb(chanImageFile);
        } catch(e) {
            notify("Failed to upload image", "error");
            setIsCreatingChannel(false);
            return;
        }
      }
      await updateDoc(doc(db, 'community_channels', activeChannel.id), {
        name: chanName.trim(),
        description: chanDesc.trim(),
        customLink: chanLink.trim().toLowerCase(),
        imageUrl: finalImage
      });
      notify("Channel updated successfully", "success");
      setShowCreateChannelModal(false);
      setIsEditingChannel(false);
      setChanName('');
      setChanDesc('');
      setChanLink('');
      setChanImageFile(null);
      setChanImagePreview('');
    } catch(e) {
      console.error(e);
      notify("Failed to update channel", "error");
    } finally {
      setIsCreatingChannel(false);
    }
  };
`;

code = code.substring(0, handleCreateStart) + handleEditFunc + "\n" + code.substring(handleCreateStart);

// Update Create Channel Modal UI to handle edit state
code = code.replace(/<span>Create Community Channel<\/span>/g, `<span>{isEditingChannel ? 'Edit Community Channel' : 'Create Community Channel'}</span>`);
code = code.replace(/Launch a dedicated channel to broadcast updates, product arrivals, discounts, and visual media to your unmuted subscribers\./g, 
`{isEditingChannel ? 'Update your channel details below.' : 'Launch a dedicated channel to broadcast updates, product arrivals, discounts, and visual media to your unmuted subscribers.'}`);

// On Close Modal, reset states
code = code.replace(/onClick=\{\(\) => setShowCreateChannelModal\(false\)\}/g, 
`onClick={() => { setShowCreateChannelModal(false); setIsEditingChannel(false); setChanName(''); setChanDesc(''); setChanLink(''); setChanImageFile(null); setChanImagePreview(''); }}`);

// On submit button
code = code.replace(/<button\s*type="button"\s*onClick=\{handleCreateChannel\}\s*disabled=\{isCreatingChannel\}\s*className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-900 dark:text-white font-bold py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"/g,
`<button
                  type="button"
                  onClick={isEditingChannel ? submitEditChannel : handleCreateChannel}
                  disabled={isCreatingChannel}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-zinc-900 dark:text-white font-bold py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"`);

code = code.replace(/<span>\{isCreatingChannel \? 'Creating\.\.\.' : 'Create Channel'\}<\/span>/g, 
`<span>{isCreatingChannel ? (isEditingChannel ? 'Saving...' : 'Creating...') : (isEditingChannel ? 'Save Changes' : 'Create Channel')}</span>`);


fs.writeFileSync('pages/Messages.tsx', code);
