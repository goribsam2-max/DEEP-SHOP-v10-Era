import React, { useState, useEffect } from 'react';
import { X, Tag, Check, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface ChatTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  notify: (msg: string, type: string) => void;
  onTagsChange?: (tags: string[]) => void;
}

const PRESET_TAGS = [
  { name: 'Customer Inquiry', color: 'bg-blue-500' },
  { name: 'Pending Order', color: 'bg-amber-500' },
  { name: 'VIP Buyer', color: 'bg-purple-500' },
  { name: 'Payment Issue', color: 'bg-rose-500' },
  { name: 'Wholesale Partner', color: 'bg-emerald-500' },
  { name: 'Resolved', color: 'bg-zinc-500' },
];

export const ChatTagsModal: React.FC<ChatTagsModalProps> = ({
  isOpen,
  onClose,
  chatId,
  notify,
  onTagsChange,
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    if (chatId) {
      try {
        const stored = localStorage.getItem(`chat_tags_${chatId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSelectedTags(parsed);
          onTagsChange?.(parsed);
        } else {
          setSelectedTags([]);
        }
      } catch {
        setSelectedTags([]);
      }
    }
  }, [chatId]);

  const saveTags = (tags: string[]) => {
    setSelectedTags(tags);
    localStorage.setItem(`chat_tags_${chatId}`, JSON.stringify(tags));
    onTagsChange?.(tags);
    if (chatId) {
      try {
        updateDoc(doc(db, 'p2p_chats', chatId), { tags }).catch(() => {});
      } catch {
        // ignore offline / permission
      }
    }
  };

  const toggleTag = (tagName: string) => {
    let updated: string[];
    if (selectedTags.includes(tagName)) {
      updated = selectedTags.filter((t) => t !== tagName);
    } else {
      updated = [...selectedTags, tagName];
    }
    saveTags(updated);
    notify('Chat labels updated', 'success');
  };

  const handleAddCustomTag = () => {
    if (!newTagInput.trim()) return;
    const name = newTagInput.trim();
    if (!selectedTags.includes(name)) {
      const updated = [...selectedTags, name];
      saveTags(updated);
      notify(`Added "${name}" label`, 'success');
    }
    setNewTagInput('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10015] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 font-inter">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="w-full max-w-md bg-white dark:bg-[#1E1F24] rounded-t-3xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-750 shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto my-3" />

        <div className="px-5 pb-3 flex items-center justify-between border-b border-zinc-150 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-base text-zinc-900 dark:text-white">Chat Labels & Tags</h3>
          </div>
          <div className="w-9" />
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Categorize this conversation to stay organized. Tags are displayed prominently in the chat header and conversation list.
          </p>

          <div className="space-y-2">
            {PRESET_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag.name);
              return (
                <div
                  key={tag.name}
                  onClick={() => toggleTag(tag.name)}
                  className={`p-3 rounded-2xl flex items-center justify-between border cursor-pointer transition ${
                    isSelected
                      ? 'border-[#5B51D8] bg-indigo-50/60 dark:bg-indigo-950/40 text-[#5B51D8] dark:text-indigo-300 shadow-xs'
                      : 'border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-3 h-3 rounded-full ${tag.color}`} />
                    <span className="text-sm font-medium">
                      {tag.name}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#5B51D8] text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Custom tags added that are not preset */}
            {selectedTags
              .filter((t) => !PRESET_TAGS.some((p) => p.name === t))
              .map((tag) => (
                <div
                  key={tag}
                  className="p-3 rounded-2xl flex items-center justify-between border border-[#5B51D8] bg-indigo-50/60 dark:bg-indigo-950/40 text-[#5B51D8] dark:text-indigo-300"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-violet-500" />
                    <span className="text-sm font-medium">{tag}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="p-1 text-rose-500 hover:text-rose-600 transition"
                    title="Remove tag"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              placeholder="Add custom tag (e.g. Urgent, Delivery)..."
              className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#5B51D8]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomTag();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddCustomTag}
              disabled={!newTagInput.trim()}
              className="px-4 py-2 rounded-xl bg-[#5B51D8] hover:bg-[#4E44C4] text-white text-xs font-bold disabled:opacity-40 cursor-pointer shadow-xs"
            >
              Add
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
