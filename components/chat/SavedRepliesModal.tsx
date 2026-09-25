import React, { useState, useEffect } from 'react';
import { X, Plus, Check, CornerUpLeft, Trash2, ChevronRight, Tag, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SavedReply {
  id: string;
  shortcut: string;
  message: string;
  label?: string;
  createdAt: number;
}

const DEFAULT_REPLIES: SavedReply[] = [
  {
    id: 'reply-1',
    shortcut: '/hello',
    message: 'হ্যালো! দীপশপে আপনাকে স্বাগতম। আপনাকে কীভাবে সহযোগিতা করতে পারি?',
    label: 'Customer Support',
    createdAt: Date.now() - 100000,
  },
  {
    id: 'reply-2',
    shortcut: '/stock',
    message: 'জি, প্রোডাক্টটি বর্তমানে স্টকে রয়েছে। আপনি অ্যাপ থেকে সরাসরি অর্ডার করতে পারেন।',
    label: 'Order Inquiry',
    createdAt: Date.now() - 80000,
  },
  {
    id: 'reply-3',
    shortcut: '/delivery',
    message: 'আপনার অর্ডারটি প্রসেসিংয়ে রয়েছে এবং খুব শীঘ্রই কুরিয়ারে হস্তান্তর করা হবে। ধন্যবাদ!',
    label: 'Delivery Info',
    createdAt: Date.now() - 60000,
  },
  {
    id: 'reply-4',
    shortcut: '/bkash',
    message: 'আমাদের অফিসিয়াল পেমেন্ট নম্বর অ্যাপের পেমেন্ট পেইজে স্বয়ংক্রিয়ভাবে প্রদর্শিত হয়।',
    label: 'Payment',
    createdAt: Date.now() - 40000,
  },
];

const AVAILABLE_LABELS = [
  'Order Inquiry',
  'Customer Support',
  'Payment',
  'Delivery Info',
  'VIP Customer',
  'Product Info',
];

interface SavedRepliesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReply: (reply: SavedReply) => void;
}

export const SavedRepliesModal: React.FC<SavedRepliesModalProps> = ({
  isOpen,
  onClose,
  onSelectReply,
}) => {
  const [replies, setReplies] = useState<SavedReply[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [shortcut, setShortcut] = useState('');
  const [message, setMessage] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string>('Customer Support');
  const [showLabelPicker, setShowLabelPicker] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('deepshop_saved_replies_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReplies(parsed);
          return;
        }
      }
      setReplies(DEFAULT_REPLIES);
      localStorage.setItem('deepshop_saved_replies_v1', JSON.stringify(DEFAULT_REPLIES));
    } catch {
      setReplies(DEFAULT_REPLIES);
    }
  }, []);

  const saveRepliesToStorage = (newReplies: SavedReply[]) => {
    setReplies(newReplies);
    localStorage.setItem('deepshop_saved_replies_v1', JSON.stringify(newReplies));
  };

  const handleCreateReply = () => {
    if (!message.trim()) return;
    const cleanShortcut = shortcut.trim() ? (shortcut.trim().startsWith('/') ? shortcut.trim() : `/${shortcut.trim()}`) : '/reply';
    const newReply: SavedReply = {
      id: `reply-${Date.now()}`,
      shortcut: cleanShortcut,
      message: message.trim(),
      label: selectedLabel || undefined,
      createdAt: Date.now(),
    };
    const updated = [newReply, ...replies];
    saveRepliesToStorage(updated);
    setShortcut('');
    setMessage('');
    setIsCreating(false);
  };

  const handleDeleteReply = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = replies.filter((r) => r.id !== id);
    saveRepliesToStorage(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10005] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 280 }}
        className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden"
      >
        {/* VIEW 1: NEW SAVED REPLY */}
        {isCreating ? (
          <div className="flex flex-col h-full overflow-y-auto no-scrollbar p-5">
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="w-10 h-10 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-100 transition shadow-sm"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleCreateReply}
                disabled={!message.trim()}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition border ${
                  message.trim()
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md active:scale-95'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700 cursor-not-allowed'
                }`}
              >
                <Check className="w-5 h-5" />
              </button>
            </div>

            {/* Title & Subtitle */}
            <div className="text-center mt-4">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">New saved reply</h2>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                Save common responses so that you can use them at any time.
              </p>
            </div>

            {/* Fields */}
            <div className="mt-8 space-y-6">
              {/* Shortcut */}
              <div className="space-y-2">
                <input
                  type="text"
                  value={shortcut}
                  onChange={(e) => setShortcut(e.target.value)}
                  placeholder="Shortcut (e.g. /info)"
                  className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-2.5 text-[15px] font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-emerald-500 transition"
                />
                <p className="text-[12px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
                  Write a keyboard shortcut for the message below. Your reply appears when this shortcut is the first word typed in a message.
                </p>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Message..."
                  rows={4}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-3 text-[14px] text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition resize-none"
                />
                <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
                  Write the full message that you want to send to customers.
                </p>
              </div>

              {/* Manage Label */}
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <div
                  onClick={() => setShowLabelPicker(!showLabelPicker)}
                  className="flex items-center justify-between py-3 cursor-pointer group"
                >
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-500 transition">
                      Manage label
                    </h4>
                    <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
                      Add a label to the chat when you use this saved reply.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>

                {/* Label Picker Drawer */}
                {showLabelPicker && (
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex flex-wrap gap-2 mt-2">
                    {AVAILABLE_LABELS.map((lbl) => (
                      <button
                        key={lbl}
                        type="button"
                        onClick={() => {
                          setSelectedLabel(lbl);
                          setShowLabelPicker(false);
                        }}
                        className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${
                          selectedLabel === lbl
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-600'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* VIEW 2: SAVED REPLIES LIST / EMPTY STATE */
          <div className="flex flex-col h-full overflow-hidden">
            {/* Grab Handle */}
            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto my-3" />

            {/* Header */}
            <div className="px-5 pb-3 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700/80 flex items-center justify-center text-zinc-700 dark:text-zinc-200 transition shadow-sm"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="font-bold text-base text-zinc-900 dark:text-white">Saved replies</h3>
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="w-9 h-9 rounded-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 transition shadow-sm"
                title="Add New Reply"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
              {replies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-20 h-20 rounded-full border-2 border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center mb-5">
                    <CornerUpLeft className="w-9 h-9 text-zinc-700 dark:text-zinc-200 stroke-[2.2]" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Respond instantly</h3>
                  <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-2 max-w-xs leading-relaxed">
                    You can now save responses to the questions that you receive most often.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCreating(true)}
                    className="mt-6 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>New saved reply</span>
                  </button>
                </div>
              ) : (
                /* List of Saved Replies */
                <div className="space-y-3">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      onClick={() => {
                        onSelectReply(reply);
                        onClose();
                      }}
                      className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 hover:border-emerald-500/50 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/20 transition cursor-pointer flex items-start justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                            {reply.shortcut}
                          </span>
                          {reply.label && (
                            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-200/60 dark:bg-zinc-700 px-2 py-0.5 rounded-full">
                              {reply.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 line-clamp-2 leading-relaxed">
                          {reply.message}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteReply(reply.id, e)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition opacity-0 group-hover:opacity-100"
                        title="Delete reply"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SavedRepliesModal;
