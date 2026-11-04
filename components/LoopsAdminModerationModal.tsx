import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, ShieldAlert, Trash2, Search, Check, ShieldCheck } from 'lucide-react';

const CopyrightIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M14.8 14.8A4 4 0 1 1 15 9" />
  </svg>
);
import { db } from '../firebase';
import {
  collection as firestoreColl,
  doc as firestoreDoc,
  updateDoc as firestoreUpdate,
  setDoc as firestoreSet,
  getDocs as firestoreGet,
  query as firestoreQ,
  limit as firestoreLimit,
  arrayUnion as firestoreArrayUnion,
  increment as firestoreIncrement,
} from 'firebase/firestore';
import { notify } from './Notifications';

export interface AdminModerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: string;
    title?: string;
    caption?: string;
    reporterId: string;
    reporterName?: string;
    reporterAvatar?: string;
    copyrightClaim?: any;
    isRemovedByAdmin?: boolean;
    removedReason?: string;
  };
  currentUser: any;
  defaultMode?: 'claim' | 'strike' | 'remove';
  onActionComplete?: () => void;
}

export function LoopsAdminModerationModal({
  isOpen,
  onClose,
  post,
  currentUser,
  defaultMode = 'claim',
  onActionComplete,
}: AdminModerationModalProps) {
  const [mode, setMode] = useState<'claim' | 'strike' | 'remove'>(defaultMode);
  const [loading, setLoading] = useState(false);

  // Claim fields
  const [ownerSearch, setOwnerSearch] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [customOwnerName, setCustomOwnerName] = useState('');
  const [claimNote, setClaimNote] = useState('');

  // Strike fields
  const [strikeReason, setStrikeReason] = useState('Copyright Violation / Unauthorized Reupload');
  const [strikeNote, setStrikeNote] = useState('');

  // Remove fields
  const [removeReason, setRemoveReason] = useState('Community Guidelines Violation');
  const [customRemoveReason, setCustomRemoveReason] = useState('');

  useEffect(() => {
    if (isOpen) setMode(defaultMode);
  }, [isOpen, defaultMode]);

  // Fetch candidate rightful owners when typing in claim search
  useEffect(() => {
    if (mode === 'claim' && ownerSearch.trim().length >= 2) {
      firestoreGet(firestoreQ(firestoreColl(db, 'users'), firestoreLimit(12)))
        .then((snap) => {
          const list: any[] = [];
          snap.forEach((d) => {
            const data = d.data();
            list.push({ id: d.id, ...data });
          });
          const filtered = list.filter(
            (u) =>
              (u.displayName || u.email || '').toLowerCase().includes(ownerSearch.toLowerCase())
          );
          setUsersList(filtered);
        })
        .catch(() => {});
    } else {
      setUsersList([]);
    }
  }, [ownerSearch, mode]);

  if (!isOpen || !post) return null;

  const postTitle = post.title || post.caption || 'Loops Post';

  // --- Handlers ---
  const handleApplyCopyrightClaim = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const ownerName = selectedOwner?.displayName || customOwnerName || ownerSearch || 'Copyright Owner';
      const ownerAvatar = selectedOwner?.photoURL || selectedOwner?.avatar || '';
      const ownerId = selectedOwner?.id || 'external_owner';

      const claimData = {
        active: true,
        ownerId,
        ownerName,
        ownerAvatar,
        note: claimNote.trim(),
        claimedAt: Date.now(),
        claimedBy: currentUser.uid || 'admin',
      };

      const postRef = firestoreDoc(db, 'scam_posts', post.id);
      await firestoreUpdate(postRef, {
        copyrightClaim: claimData,
        monetizationDisabled: true,
      });

      // Send notification to author
      const notifId = `notif_claim_${post.id}_${Date.now()}`;
      await firestoreSet(firestoreDoc(db, 'news_hub_notifications', notifId), {
        id: notifId,
        toUserId: post.reporterId,
        fromUserId: 'deep_shop_moderation',
        fromUserName: 'Deep Shop Moderation',
        fromUserAvatar: '/assets/logo.png',
        type: 'copyright_claim',
        body: `Your post "${postTitle.slice(0, 30)}..." received a Copyright Claim from ${ownerName}. Post income/monetization is disabled.`,
        link: '/loops/account-status',
        postId: post.id,
        createdAt: Date.now(),
        read: false,
      });

      notify(
        `Copyright claim applied to post. Income redirected/disabled.`,
        'success',
        undefined,
        {
          undoLabel: 'Undo',
          onUndo: async () => {
            await firestoreUpdate(postRef, {
              copyrightClaim: { active: false },
              monetizationDisabled: false,
            });
            notify('Copyright claim undone.', 'info');
            onActionComplete?.();
          },
        }
      );

      onActionComplete?.();
      onClose();
    } catch (err: any) {
      notify(`Error applying claim: ${err?.message || 'Failed'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeClaim = async () => {
    setLoading(true);
    try {
      const postRef = firestoreDoc(db, 'scam_posts', post.id);
      await firestoreUpdate(postRef, {
        'copyrightClaim.active': false,
        monetizationDisabled: false,
      });
      notify('Copyright claim revoked.', 'success');
      onActionComplete?.();
      onClose();
    } catch (err: any) {
      notify('Failed to revoke claim', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCopyrightStrike = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const targetUserRef = firestoreDoc(db, 'users', post.reporterId);
      const strikeEntry = {
        id: `strike_${Date.now()}`,
        postId: post.id,
        postTitle,
        reason: strikeReason,
        note: strikeNote,
        issuedAt: Date.now(),
        issuedBy: currentUser.uid,
      };

      await firestoreUpdate(targetUserRef, {
        loopsCopyrightStrikes: firestoreArrayUnion(strikeEntry),
        loopsStrikeCount: firestoreIncrement(1),
      });

      // Stamp post with strike tag
      await firestoreUpdate(firestoreDoc(db, 'scam_posts', post.id), {
        copyrightStrike: strikeEntry,
        monetizationDisabled: true,
      });

      // Send strike notification
      const notifId = `notif_strike_${post.id}_${Date.now()}`;
      await firestoreSet(firestoreDoc(db, 'news_hub_notifications', notifId), {
        id: notifId,
        toUserId: post.reporterId,
        fromUserId: 'deep_shop_moderation',
        fromUserName: 'Deep Shop Moderation',
        fromUserAvatar: '/assets/logo.png',
        type: 'copyright_strike',
        body: `Copyright Strike issued on your post "${postTitle.slice(0, 30)}...". Check Account Status.`,
        link: '/loops/account-status',
        postId: post.id,
        createdAt: Date.now(),
        read: false,
      });

      notify(`Copyright strike issued on user account.`, 'warning', undefined, {
        undoLabel: 'Undo',
        onUndo: async () => {
          await firestoreUpdate(targetUserRef, {
            loopsStrikeCount: firestoreIncrement(-1),
          });
          await firestoreUpdate(firestoreDoc(db, 'scam_posts', post.id), {
            copyrightStrike: null,
          });
          notify('Copyright strike undone.', 'info');
          onActionComplete?.();
        },
      });

      onActionComplete?.();
      onClose();
    } catch (err: any) {
      notify(`Error issuing strike: ${err?.message || 'Failed'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePostWithReason = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const finalReason =
        removeReason === 'Other'
          ? customRemoveReason || 'Violated Guidelines'
          : removeReason;

      const postRef = firestoreDoc(db, 'scam_posts', post.id);
      await firestoreUpdate(postRef, {
        isRemovedByAdmin: true,
        removedReason: finalReason,
        removedAt: Date.now(),
        removedBy: currentUser.uid,
      });

      // Write notification for post author
      const notifId = `notif_removed_${post.id}_${Date.now()}`;
      await firestoreSet(firestoreDoc(db, 'news_hub_notifications', notifId), {
        id: notifId,
        toUserId: post.reporterId,
        fromUserId: 'deep_shop_moderation',
        fromUserName: 'Deep Shop Moderation',
        fromUserAvatar: '/assets/logo.png',
        type: 'post_removed',
        reason: finalReason,
        body: `Your post "${postTitle.slice(0, 25)}..." was removed by Admin. Reason: ${finalReason}`,
        link: '/loops/account-status',
        postId: post.id,
        createdAt: Date.now(),
        read: false,
      });

      notify(`Post removed from public feed. Reason: ${finalReason}`, 'success', undefined, {
        undoLabel: 'Undo',
        onUndo: async () => {
          await firestoreUpdate(postRef, {
            isRemovedByAdmin: false,
            removedReason: '',
            removedAt: null,
          });
          notify('Post restored to feed.', 'info');
          onActionComplete?.();
        },
      });

      onActionComplete?.();
      onClose();
    } catch (err: any) {
      notify(`Error removing post: ${err?.message || 'Failed'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePost = async () => {
    setLoading(true);
    try {
      await firestoreUpdate(firestoreDoc(db, 'scam_posts', post.id), {
        isRemovedByAdmin: false,
        removedReason: '',
        removedAt: null,
      });
      notify('Post restored to public feed.', 'success');
      onActionComplete?.();
      onClose();
    } catch (err: any) {
      notify('Failed to restore post', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[230000] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          className="relative z-10 w-full max-w-md bg-zinc-900 border border-white/15 rounded-3xl p-5 shadow-2xl text-white overflow-hidden flex flex-col gap-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Admin Moderation</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Target Post Pill */}
          <div className="bg-zinc-800/80 rounded-2xl p-3 border border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold shrink-0">
              {post.reporterName?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-zinc-200 truncate">
                {post.reporterName || 'Author'}
              </p>
              <p className="text-[11px] text-zinc-400 truncate">
                {postTitle}
              </p>
            </div>
          </div>

          {/* Action Tabs */}
          <div className="flex rounded-2xl bg-zinc-800/90 p-1 border border-white/5 gap-1">
            <button
              type="button"
              onClick={() => setMode('claim')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'claim'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Copyright Claim
            </button>
            <button
              type="button"
              onClick={() => setMode('strike')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'strike'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Strike (1/3)
            </button>
            <button
              type="button"
              onClick={() => setMode('remove')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'remove'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Remove Post
            </button>
          </div>

          {/* Tab 1: Copyright Claim */}
          {mode === 'claim' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-zinc-300 leading-relaxed">
                A Copyright Claim turns off post earnings for the author and attributes the content to the rightful owner.
              </p>

              {post.copyrightClaim?.active ? (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                    <CopyrightIcon className="w-4 h-4" /> Active Copyright Claim
                  </div>
                  <p className="text-xs text-zinc-300">
                    Owner: <strong>{post.copyrightClaim.ownerName}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={handleRevokeClaim}
                    disabled={loading}
                    className="mt-1 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-xl transition-colors border border-white/10"
                  >
                    {loading ? 'Revoking...' : 'Revoke Copyright Claim'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-400 font-medium">Rightful Content Owner</label>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search user or type owner name..."
                        value={ownerSearch}
                        onChange={(e) => {
                          setOwnerSearch(e.target.value);
                          setSelectedOwner(null);
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {usersList.length > 0 && !selectedOwner && (
                      <div className="max-h-28 overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-xl divide-y divide-zinc-700">
                        {usersList.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setSelectedOwner(u);
                              setOwnerSearch(u.displayName || u.email);
                            }}
                            className="w-full px-3 py-1.5 flex items-center justify-between text-xs text-left hover:bg-zinc-700 text-zinc-200"
                          >
                            <span>{u.displayName || u.email}</span>
                            <span className="text-[10px] text-zinc-400">Select</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-400 font-medium">Claim Note / Reference (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Original YouTube video link or claim ID"
                      value={claimNote}
                      onChange={(e) => setClaimNote(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyCopyrightClaim}
                    disabled={loading}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-xs rounded-xl transition-colors shadow-lg"
                  >
                    {loading ? 'Applying Claim...' : 'Apply Copyright Claim (Disable Income)'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Tab 2: Copyright Strike */}
          {mode === 'strike' && (
            <div className="flex flex-col gap-3">
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 flex flex-col gap-1 text-xs text-red-200">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-400" /> Account Strike Policy
                </span>
                <span>
                  3 copyright strikes will permanently block this user from creating new Loops posts/reels.
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-medium">Strike Reason</label>
                <select
                  value={strikeReason}
                  onChange={(e) => setStrikeReason(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-400"
                >
                  <option value="Copyright Violation / Unauthorized Reupload">Copyright Violation / Unauthorized Reupload</option>
                  <option value="Trademark Infringement">Trademark Infringement</option>
                  <option value="Repeat Intellectual Property Abuse">Repeat Intellectual Property Abuse</option>
                  <option value="Fraudulent Content Impersonation">Fraudulent Content Impersonation</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-400 font-medium">Additional Details</label>
                <input
                  type="text"
                  placeholder="e.g. Rights holder complaint ref #8291"
                  value={strikeNote}
                  onChange={(e) => setStrikeNote(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-red-400"
                />
              </div>

              <button
                type="button"
                onClick={handleApplyCopyrightStrike}
                disabled={loading}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors shadow-lg"
              >
                {loading ? 'Issuing Strike...' : 'Issue Copyright Strike'}
              </button>
            </div>
          )}

          {/* Tab 3: Remove Post */}
          {mode === 'remove' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Removing hides this post from all public feeds and search results. It remains visible ONLY to the post owner on their profile with the exact removal reason.
              </p>

              {post.isRemovedByAdmin ? (
                <div className="bg-zinc-800 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-zinc-200 text-xs font-bold">
                    <Trash2 className="w-4 h-4 text-red-400" /> Post currently removed
                  </div>
                  <p className="text-xs text-zinc-400">
                    Reason: {post.removedReason || 'Guidelines Violation'}
                  </p>
                  <button
                    type="button"
                    onClick={handleRestorePost}
                    disabled={loading}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors"
                  >
                    {loading ? 'Restoring...' : 'Restore Post to Public Feed'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-zinc-400 font-medium">Removal Reason</label>
                    <select
                      value={removeReason}
                      onChange={(e) => setRemoveReason(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
                    >
                      <option value="Community Guidelines Violation">Community Guidelines Violation</option>
                      <option value="Inappropriate Media / Graphic Content">Inappropriate Media / Graphic Content</option>
                      <option value="Spam / Scams / Misleading Content">Spam / Scams / Misleading Content</option>
                      <option value="Harassment or Hateful Speech">Harassment or Hateful Speech</option>
                      <option value="Other">Other (Custom Reason)</option>
                    </select>
                  </div>

                  {removeReason === 'Other' && (
                    <input
                      type="text"
                      placeholder="Specify custom removal reason..."
                      value={customRemoveReason}
                      onChange={(e) => setCustomRemoveReason(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-xs text-white focus:outline-none focus:border-zinc-400"
                    />
                  )}

                  <button
                    type="button"
                    onClick={handleRemovePostWithReason}
                    disabled={loading}
                    className="w-full py-2.5 bg-zinc-100 hover:bg-white text-black font-bold text-xs rounded-xl transition-colors shadow-lg"
                  >
                    {loading ? 'Removing Post...' : 'Remove Post with Reason'}
                  </button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
