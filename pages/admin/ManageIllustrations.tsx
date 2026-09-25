import React, { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useNotify } from "../../components/Notifications";
import { uploadToImgbb } from "../../services/imgbb";
import Icon from "../../components/Icon";

interface IllustrationConfig {
  id: string;
  label: string;
  description: string;
}

const CONFIG_ITEMS: IllustrationConfig[] = [
  { id: "offline", label: "Network Offline", description: "Shown when the user has no internet connection." },
  { id: "notFound", label: "404 Not Found", description: "Shown when a page is not found." },
  { id: "emptyNotifications", label: "Empty Notifications", description: "Shown when there are no notifications." },
  { id: "emptyWishlist", label: "Empty Wishlist", description: "Shown when the user's wishlist is empty." },
  { id: "emptyCart", label: "Empty Cart", description: "Shown when the user's cart is empty." },
  { id: "emptyOrders", label: "Empty Orders", description: "Shown when the user has no orders." },
  { id: "emptyTickets", label: "Empty Tickets", description: "Shown when the user has no support tickets." },
  { id: "emptyCoupons", label: "Empty Coupons", description: "Shown when the user has no coupons." },
  { id: "emptySearch", label: "Empty Search Results", description: "Shown when no products match a search query." },
  { id: "emptyMessages", label: "Empty Chat/Messages", description: "Shown when there are no active chat messages." },
];

export default function ManageIllustrations() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<Record<string, string>>({});
  const notify = useNotify();

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "illustrations"));
        if (snap.exists()) {
          setImages(snap.data());
        }
      } catch (err) {
        console.error("Error fetching illustrations:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchImages();
  }, []);

  const handleImageUpload = async (id: string, file: File) => {
    try {
      setSaving(true);
      const url = await uploadToImgbb(file);
      setImages(prev => ({ ...prev, [id]: url }));
      notify("Image uploaded successfully", "success");
    } catch (error) {
      console.error("Upload error:", error);
      notify("Failed to upload image", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      await setDoc(doc(db, "settings", "illustrations"), images);
      notify("Illustrations configuration saved!", "success");
    } catch (err) {
      console.error(err);
      notify("Failed to save configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Icon name="spinner" className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Manage Illustrations</h2>
          <p className="text-sm text-zinc-500 mt-1">Configure SVG icons or images for empty states.</p>
        </div>
        <button
          onClick={saveConfig}
          disabled={saving}
          className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-bold rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Icon name="spinner" className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CONFIG_ITEMS.map(item => (
          <div key={item.id} className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">{item.label}</h3>
            <p className="text-xs text-zinc-500 mb-4">{item.description}</p>
            
            <div className="aspect-video relative rounded-[20px] bg-zinc-50 dark:bg-zinc-800/50 border-2 border-dashed border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center overflow-hidden">
              {images[item.id] ? (
                <>
                  <img src={images[item.id]} alt={item.label} className="w-full h-full object-contain p-4" />
                  <button
                    onClick={() => removeImage(item.id)}
                    className="absolute top-2 right-2 p-1.5 bg-white dark:bg-zinc-800 text-rose-500 rounded-full shadow-sm hover:scale-110 transition-transform"
                  >
                    <Icon name="times" className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="text-center p-6">
                  <Icon name="cloud-upload-alt" className="text-3xl text-zinc-400 mx-auto mb-2 block" />
                  <span className="text-xs font-bold text-zinc-500">Upload Image</span>
                </div>
              )}
              
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageUpload(item.id, e.target.files[0]);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
