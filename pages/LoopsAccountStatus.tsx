import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Trash2,
  ExternalLink,
  HelpCircle,
  Lock
} from 'lucide-react';

const CopyrightIcon: React.FC<{ className?: string }> = ({ className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M14.8 14.8A4 4 0 1 1 15 9" />
  </svg>
);
import { db, auth } from '../firebase';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { VerifiedLoopBadge } from '../components/VerifiedLoopBadge';

export function LoopsAccountStatusPage() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(auth.currentUser);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      setCurrentUser(u);
      if (!u) {
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // Realtime listener for current user profile
    const unsubProfile = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
      if (snap.exists()) {
        setUserProfile({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });

    // Fetch user's scam_posts to list copyright claims & removals
    const qPosts = query(
      collection(db, 'scam_posts'),
      where('reporterId', '==', currentUser.uid)
    );
    getDocs(qPosts)
      .then((snap) => {
        const posts: any[] = [];
        snap.forEach((d) => posts.push({ id: d.id, ...d.data() }));
        setUserPosts(posts);
      })
      .catch(() => {});

    return () => unsubProfile();
  }, [currentUser]);

  const strikeCount = userProfile?.loopsStrikeCount || 0;
  const strikesList = userProfile?.loopsCopyrightStrikes || [];
  const isPostingBlocked = Boolean(userProfile?.loopsPostingBlocked || strikeCount >= 3);

  const claimedPosts = userPosts.filter(
    (p) => p.copyrightClaim?.active || p.monetizationDisabled
  );
  const removedPosts = userPosts.filter((p) => p.isRemovedByAdmin);

  const inGoodStanding = strikeCount === 0 && removedPosts.length === 0 && claimedPosts.length === 0;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col pb-24">
      {/* Top Bar matching IMG_5427 */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-4 h-14 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-zinc-900 dark:text-white">Account Status</h1>
        <div className="w-9" />
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-5 py-6 flex flex-col items-center gap-6">
        {/* Main Logo Badge with Green Checkmark matching IMG_5427 */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[#83f52c] dark:bg-[#83f52c] flex items-center justify-center p-3 shadow-lg">
            <div className="flex flex-col items-center justify-center text-black font-extrabold tracking-tighter leading-none">
              <span className="text-2xl font-black">DS</span>
              <span className="text-[9px] font-bold tracking-widest mt-0.5">DEEP</span>
              <span className="text-[9px] font-bold tracking-widest">SHOP</span>
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center text-white shadow-md">
            {inGoodStanding ? (
              <CheckCircle2 className="w-5 h-5 fill-emerald-500 text-white" />
            ) : strikeCount >= 3 ? (
              <XCircle className="w-5 h-5 fill-red-500 text-white" />
            ) : (
              <AlertTriangle className="w-5 h-5 fill-amber-500 text-white" />
            )}
          </div>
        </div>

        {/* User Badge Info */}
        <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          <span>{userProfile?.displayName || currentUser?.displayName || 'Deep Shop User'}</span>
          <VerifiedLoopBadge />
        </div>

        {/* Account Standing Headline matching IMG_5427 */}
        <div className="text-center max-w-md flex flex-col gap-2">
          {inGoodStanding ? (
            <>
              <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white leading-tight">
                Your account meets all of our guidelines
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                You don't have removed content or messages, feature restrictions or recommendation limits.
              </p>
            </>
          ) : isPostingBlocked ? (
            <>
              <h2 className="text-xl sm:text-2xl font-extrabold text-red-600 dark:text-red-400 leading-tight">
                Your account is restricted from posting
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                You have reached 3 copyright strikes or severe guideline violations. Creating new Loops posts and reels is currently disabled.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 leading-tight">
                Your account has warnings or claims
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Review your copyright strikes or removed content below to keep your account in good standing.
              </p>
            </>
          )}

          <a
            href="#guidelines"
            className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline mt-1"
          >
            Learn more about Account Status
          </a>
        </div>

        {/* Guidelines List matching IMG_5427 */}
        <div className="w-full bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Features</span>
            {isPostingBlocked ? (
              <span className="text-xs text-red-500 font-bold flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Restricted (3/3)
              </span>
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Content and message removals</span>
            {removedPosts.length > 0 ? (
              <span className="text-xs text-amber-500 font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> {removedPosts.length} Removed
              </span>
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Recommendation eligibility</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Availability to people under 18</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Monetisation</span>
            {claimedPosts.length > 0 ? (
              <span className="text-xs text-amber-500 font-bold flex items-center gap-1">
                <CopyrightIcon className="w-4 h-4" /> {claimedPosts.length} Claimed
              </span>
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
            )}
          </div>
        </div>

        {/* Detailed Section 1: Copyright Strikes Meter */}
        <div className="w-full flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-red-500" /> Copyright Strikes ({strikeCount}/3)
            </h3>
            {strikeCount >= 3 && (
              <span className="text-[11px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                POSTING BLOCKED
              </span>
            )}
          </div>

          <div className="w-full bg-zinc-100 dark:bg-zinc-800/80 h-3 rounded-full overflow-hidden p-0.5 border border-zinc-200 dark:border-zinc-700">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                strikeCount === 0
                  ? 'w-0'
                  : strikeCount === 1
                  ? 'w-1/3 bg-amber-500'
                  : strikeCount === 2
                  ? 'w-2/3 bg-orange-500'
                  : 'w-full bg-red-600'
              }`}
            />
          </div>

          {strikesList.length > 0 ? (
            <div className="flex flex-col gap-2">
              {strikesList.map((s: any, idx: number) => (
                <div
                  key={s.id || idx}
                  className="bg-red-500/5 border border-red-500/20 rounded-2xl p-3 flex flex-col gap-1 text-xs"
                >
                  <div className="flex items-center justify-between text-red-600 dark:text-red-400 font-bold">
                    <span>Strike #{idx + 1}: {s.reason || 'Copyright Violation'}</span>
                    <span>{s.issuedAt ? new Date(s.issuedAt).toLocaleDateString() : 'Active'}</span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Post: "{s.postTitle || 'Loops Post'}"
                  </p>
                  {s.note && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-500 italic">
                      Note: {s.note}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              No active copyright strikes on your account.
            </p>
          )}
        </div>

        {/* Detailed Section 2: Copyright Claimed Posts */}
        <div className="w-full flex flex-col gap-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <CopyrightIcon className="w-4 h-4 text-amber-500" /> Copyright Claims ({claimedPosts.length})
          </h3>
          {claimedPosts.length > 0 ? (
            <div className="flex flex-col gap-2">
              {claimedPosts.map((p) => (
                <div
                  key={p.id}
                  className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3 flex items-center justify-between text-xs"
                >
                  <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                      {p.title || p.caption || 'Loops Post'}
                    </span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      Claimed by: {p.copyrightClaim?.ownerName || 'Rightful Owner'} · Income Disabled
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/loops/post/${p.id}`)}
                    className="p-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 text-xs font-semibold shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              No copyright claims on your published content.
            </p>
          )}
        </div>

        {/* Detailed Section 3: Removed Posts (Owner-Only) */}
        <div className="w-full flex flex-col gap-3">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-zinc-500" /> Removed Content ({removedPosts.length})
          </h3>
          {removedPosts.length > 0 ? (
            <div className="flex flex-col gap-2">
              {removedPosts.map((p) => (
                <div
                  key={p.id}
                  className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex flex-col gap-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">
                      {p.title || p.caption || 'Loops Post'}
                    </span>
                    <span className="text-[10px] text-red-500 font-bold bg-red-500/10 px-2 py-0.5 rounded-full">
                      Owner Only Visible
                    </span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    <strong>Removal Reason:</strong> {p.removedReason || 'Guidelines Violation'}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/loops/post/${p.id}`)}
                    className="self-start text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1 mt-1"
                  >
                    View Removed Post <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              No posts removed by moderators.
            </p>
          )}
        </div>

        {/* Floating "Get support" Button matching IMG_5427 bottom right */}
        <div className="fixed bottom-6 right-6 z-40">
          <button
            type="button"
            onClick={() => navigate('/news-hub/messages')}
            className="px-5 py-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-bold text-sm rounded-full shadow-2xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4 text-emerald-500" />
            <span>Get support</span>
          </button>
        </div>
      </main>
    </div>
  );
}
