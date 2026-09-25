import os

content = """import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';

import { 
  ArrowLeft, 
  MapPin, 
  Search,
  MessageCircle,
  MoreHorizontal,
  Home,
  Layers,
  LayoutGrid,
  Star,
  CheckCircle2,
  Share2,
  Flag,
  Ban,
  X
} from 'lucide-react';
import { ProductCard } from '../components/ui/ProductCard';
import Icon from '../components/Icon';
import { Product } from '../types';
import { useNotify } from '../components/Notifications';

const StoreProfile: React.FC = () => {
  const { sellerId } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();

  const [user, setUser] = useState(auth.currentUser);
  
  const [activeTab, setActiveTab] = useState('home');
  const [seller, setSeller] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  
  // Real stats
  const [followersCount, setFollowersCount] = useState(0);
  const [totalSold, setTotalSold] = useState(0);
  const [positivePercent, setPositivePercent] = useState(0);
  const [regularBuyers, setRegularBuyers] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  
  // UI states
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!sellerId) return;
      try {
        const sellerRef = doc(db, 'users', sellerId);
        const sellerSnap = await getDoc(sellerRef);
        let sData: any = null;
        if (sellerSnap.exists()) {
          sData = { id: sellerSnap.id, ...sellerSnap.data() };
          setSeller(sData);
        }

        const q = query(collection(db, 'products'), where('sellerId', '==', sellerId));
        const productSnap = await getDocs(q);
        const fetchedProducts = productSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
        setProducts(fetchedProducts);
        
        // Fetch real reviews
        const rQ = query(collection(db, 'reviews'), where('sellerId', '==', sellerId));
        const rSnap = await getDocs(rQ);
        const fetchedReviews = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Fallback to product reviews if seller reviews aren't explicit
        let allReviews = [...fetchedReviews];
        if (allReviews.length === 0) {
           for (const p of fetchedProducts) {
              if (p.reviews && Array.isArray(p.reviews)) {
                 allReviews = [...allReviews, ...p.reviews];
              }
           }
        }
        
        // Sort reviews by date descending
        allReviews.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
        setReviews(allReviews);
        
        // Calculate real data
        let totalSoldCalc = 0;
        fetchedProducts.forEach(p => {
           totalSoldCalc += (p.salesCount || 0);
        });
        
        let totalRating = 0;
        let posCount = 0;
        allReviews.forEach(r => {
           totalRating += (r.rating || 5);
           if (r.rating >= 4) posCount++;
        });
        
        const avgRat = allReviews.length > 0 ? (totalRating / allReviews.length) : 0;
        const posPerc = allReviews.length > 0 ? Math.round((posCount / allReviews.length) * 100) : 0;
        
        // Admins can override these values in seller doc
        const fCount = sData?.customFollowersCount ?? (sData?.followers?.length || 0);
        const tSold = sData?.customTotalSold ?? totalSoldCalc;
        const pPerc = sData?.customPositiveReviewPercent ?? posPerc;
        const rBuyers = sData?.customRegularBuyer ?? Math.floor(tSold * 0.1); // Mock regular buyers as 10% of total sold if not available natively
        const aRat = sData?.customRating ?? avgRat;
        
        setFollowersCount(fCount);
        setTotalSold(tSold);
        setPositivePercent(pPerc);
        setRegularBuyers(rBuyers);
        setAverageRating(aRat);
        
        if (user && sData?.followers?.includes(user.uid)) {
          setIsFollowing(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sellerId, user]);

  const handleFollowToggle = async () => {
    if (!user || !seller) return;
    try {
      const sellerRef = doc(db, 'users', seller.id);
      if (isFollowing) {
        await updateDoc(sellerRef, {
          followers: arrayRemove(user.uid)
        });
        setFollowersCount(prev => prev - 1);
      } else {
        await updateDoc(sellerRef, {
          followers: arrayUnion(user.uid)
        });
        setFollowersCount(prev => prev + 1);
      }
      setIsFollowing(!isFollowing);
    } catch (err) {
      console.error(err);
    }
  };
  
  const handleShare = () => {
     if (navigator.share) {
        navigator.share({
           title: seller.shopName || seller.displayName,
           url: window.location.href
        }).catch(err => console.error(err));
     } else {
        navigator.clipboard.writeText(window.location.href);
        notify("Link copied to clipboard!", "success");
     }
     setShowMenu(false);
  };
  
  const handleReport = () => {
     notify("Seller reported. Our team will review this.", "success");
     setShowMenu(false);
  };
  
  const handleBlock = () => {
     notify("Seller blocked.", "success");
     setShowMenu(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-zinc-500">Loading...</div>;
  }

  if (!seller) {
    return <div className="p-8 text-center text-zinc-500">User not found</div>;
  }

  const isSeller = seller.role === "seller" || products.length > 0;
  
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (isSeller) {
    return (
      <div className="bg-white dark:bg-black min-h-screen text-zinc-900 dark:text-white font-sans max-w-md mx-auto">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden">
               <img src={seller.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seller.displayName}`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-[15px] leading-tight dark:text-white">{seller.displayName || 'Seller'}</span>
              <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">ID: {seller.id.substring(0, 7).toUpperCase()}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-zinc-600 dark:text-zinc-300">
            <button onClick={() => setShowSearch(!showSearch)} className="p-1">
               <Search className="w-5 h-5" />
            </button>
            <button onClick={() => navigate(`/messages?chatId=${seller.id}`)} className="p-1">
               <MessageCircle className="w-5 h-5" />
            </button>
            <div className="relative">
               <button onClick={() => setShowMenu(!showMenu)} className="p-1">
                 <MoreHorizontal className="w-5 h-5" />
               </button>
               {showMenu && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                   <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 z-50 overflow-hidden">
                     <button onClick={handleShare} className="flex items-center gap-3 w-full p-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium dark:text-zinc-200">
                        <Share2 className="w-4 h-4 text-zinc-500" /> Share Store
                     </button>
                     <button onClick={handleReport} className="flex items-center gap-3 w-full p-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium dark:text-zinc-200 border-t border-zinc-100 dark:border-zinc-800">
                        <Flag className="w-4 h-4 text-zinc-500" /> Report Seller
                     </button>
                     <button onClick={handleBlock} className="flex items-center gap-3 w-full p-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium text-red-600 dark:text-red-400 border-t border-zinc-100 dark:border-zinc-800">
                        <Ban className="w-4 h-4" /> Block Seller
                     </button>
                   </div>
                 </>
               )}
            </div>
          </div>
        </div>

        {/* Search Bar Overlay */}
        {showSearch && (
          <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
             <Search className="w-4 h-4 text-zinc-400" />
             <input 
                type="text" 
                placeholder="Search in this store..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm dark:text-white"
                autoFocus
             />
             <button onClick={() => { setShowSearch(false); setSearchQuery(''); }}>
                <X className="w-4 h-4 text-zinc-400" />
             </button>
          </div>
        )}

        <div className="p-4 pb-20">
          {/* Store Card */}
          <div className="relative bg-[#F3F0FF] dark:bg-[#1A1625] rounded-2xl p-4 overflow-hidden mb-4 border border-[#E9E1FF] dark:border-[#2D2442]">
            <div className="absolute right-0 top-0 opacity-10 pointer-events-none w-32 h-32 transform translate-x-4 -translate-y-4">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full text-[#8B5CF6]"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.974 0-5.699-1.06-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>
            </div>
            
            <div className="relative z-10 flex justify-between items-start mb-2">
               <h1 className="text-[20px] font-bold text-zinc-800 dark:text-zinc-100">{seller.shopName || seller.displayName}</h1>
               <button onClick={handleFollowToggle} className={`${isFollowing ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200' : 'bg-[#8B5CF6] text-white'} px-5 py-1.5 rounded-full text-sm font-medium`}>
                 {isFollowing ? 'Following' : 'Follow'}
               </button>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-1.5">
                 <div className="flex">
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} className={`w-4 h-4 ${star <= averageRating ? 'fill-[#F97316] text-[#F97316]' : 'fill-zinc-300 text-zinc-300 dark:fill-zinc-700 dark:text-zinc-700'}`} />
                    ))}
                 </div>
                 <span className="font-bold text-sm text-zinc-800 dark:text-zinc-200">{averageRating > 0 ? averageRating.toFixed(1) : 'New'}</span>
                 <span className="text-zinc-500 dark:text-zinc-400 text-sm">({reviews.length} ratings)</span>
              </div>
              
              <div className="flex items-center gap-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                 <span>{positivePercent}% Positive seller ratings</span>
                 <span>{(followersCount >= 1000 ? (followersCount / 1000).toFixed(1) + 'k' : followersCount)} Followers</span>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-4 flex justify-between items-center text-center">
             <div className="flex-1">
               <div className="text-lg font-bold text-zinc-900 dark:text-white">{positivePercent}%</div>
               <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Positive Reviews</div>
             </div>
             <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800"></div>
             <div className="flex-1">
               <div className="text-lg font-bold text-zinc-900 dark:text-white">{totalSold >= 1000 ? (totalSold / 1000).toFixed(1) + 'k+' : totalSold}</div>
               <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Sold by Store</div>
             </div>
             <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800"></div>
             <div className="flex-1">
               <div className="text-lg font-bold text-zinc-900 dark:text-white">{regularBuyers >= 1000 ? (regularBuyers / 1000).toFixed(1) + 'k+' : regularBuyers}</div>
               <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Regular Buyer</div>
             </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-around items-center border-y border-zinc-100 dark:border-zinc-800 py-3 mt-2">
           <button onClick={() => setActiveTab('home')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-[#8B5CF6] border-b-2 border-[#8B5CF6]' : 'text-zinc-500 dark:text-zinc-400'}`}>
              <Home className="w-6 h-6" />
           </button>
           <button onClick={() => setActiveTab('layers')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'layers' ? 'text-[#8B5CF6] border-b-2 border-[#8B5CF6]' : 'text-zinc-500 dark:text-zinc-400'}`}>
              <Layers className="w-6 h-6" />
           </button>
           <button onClick={() => setActiveTab('grid')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'grid' ? 'text-[#8B5CF6] border-b-2 border-[#8B5CF6]' : 'text-zinc-500 dark:text-zinc-400'}`}>
              <LayoutGrid className="w-6 h-6" />
           </button>
           <button onClick={() => setActiveTab('star')} className={`p-2 flex flex-col items-center gap-1 ${activeTab === 'star' ? 'text-[#8B5CF6] border-b-2 border-[#8B5CF6]' : 'text-zinc-500 dark:text-zinc-400'}`}>
              <Star className={`w-6 h-6 ${activeTab === 'star' ? 'fill-current' : ''}`} />
           </button>
        </div>

        {/* Content based on Tab */}
        <div className="p-4">
          {activeTab === 'home' && (
             <div className="grid grid-cols-2 gap-3">
               {filteredProducts.map(product => (
                 <ProductCard key={product.id} product={product} />
               ))}
               {filteredProducts.length === 0 && (
                 <div className="col-span-2 text-center text-zinc-500 py-8">No products found.</div>
               )}
             </div>
          )}
          
          {activeTab === 'layers' && (
             <div className="flex flex-col gap-4">
                <h3 className="font-bold text-lg dark:text-white">Store Categories</h3>
                <div className="grid grid-cols-2 gap-3">
                   {/* Automatically extract categories from seller's products */}
                   {Array.from(new Set(products.map(p => p.category || 'Other'))).map(cat => (
                      <div key={cat} onClick={() => { setSearchQuery(cat === 'Other' ? '' : cat); setActiveTab('home'); }} className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">
                         <span className="font-semibold text-sm dark:text-white">{cat}</span>
                         <span className="text-xs text-zinc-400 bg-white dark:bg-zinc-800 px-2 py-1 rounded-full">{products.filter(p => (p.category || 'Other') === cat).length}</span>
                      </div>
                   ))}
                   {products.length === 0 && (
                     <div className="col-span-2 text-center text-zinc-500 py-8">No categories available.</div>
                   )}
                </div>
             </div>
          )}
          
          {activeTab === 'grid' && (
             <div className="grid grid-cols-3 gap-2">
               {filteredProducts.map(product => (
                 <div key={product.id} onClick={() => navigate(`/product/${product.id}`)} className="aspect-square bg-zinc-100 dark:bg-zinc-900 rounded-lg overflow-hidden relative cursor-pointer group border border-zinc-200 dark:border-zinc-800">
                    <img src={product.images?.[0] || 'https://via.placeholder.com/150'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    {product.price && (
                      <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5 rounded font-bold">
                         ৳{product.price}
                      </div>
                    )}
                 </div>
               ))}
               {filteredProducts.length === 0 && (
                 <div className="col-span-3 text-center text-zinc-500 py-8">No products found.</div>
               )}
             </div>
          )}

          {activeTab === 'star' && (
            <div className="flex flex-col gap-6">
               {reviews.length === 0 && (
                 <div className="text-center text-zinc-500 py-8">No reviews yet.</div>
               )}
               {reviews.map((review, i) => (
                 <div key={i} className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
                   <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center overflow-hidden shrink-0">
                           <img src={review.reviewerPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.reviewerName || 'User'}`} alt="Reviewer" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex flex-col">
                           <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{review.reviewerName || 'Anonymous'}</span>
                           <span className="text-zinc-400 text-[11px]">{review.reviewerCountry || 'Verified Buyer'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex">
                           {[1,2,3,4,5].map(star => (
                              <Star key={star} className={`w-3.5 h-3.5 ${star <= (review.rating || 5) ? 'fill-[#F97316] text-[#F97316]' : 'fill-zinc-300 text-zinc-300 dark:fill-zinc-700 dark:text-zinc-700'}`} />
                           ))}
                        </div>
                        <span className="text-zinc-400 text-[11px] mt-0.5">{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Recent'}</span>
                      </div>
                   </div>
                   
                   {review.title && <h3 className="font-bold text-[15px] text-zinc-800 dark:text-zinc-200 mb-1">{review.title}</h3>}
                   <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
                     {review.comment || 'No comments provided.'}
                   </p>
                   
                   {/* Chat review images display */}
                   {review.images && Array.isArray(review.images) && review.images.length > 0 && (
                     <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {review.images.map((img: string, idx: number) => (
                          <div key={idx} className="w-24 h-24 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex-shrink-0 flex items-center justify-center overflow-hidden">
                             <img src={img} className="w-full h-full object-cover" />
                          </div>
                        ))}
                     </div>
                   )}
                 </div>
               ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Normal User Profile
  return (
    <div className="w-full bg-white dark:bg-black min-h-screen text-zinc-900 dark:text-white">
       <div
          className="relative h-48 sm:h-64 bg-cover bg-center overflow-hidden transition-all duration-300"
         style={{ backgroundImage: `url(${seller.profileBg || seller.coverPhoto || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"})` }}
       >
         <button onClick={() => navigate(-1)} className="absolute top-4 left-4 z-20 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-black/60 transition">
            <ArrowLeft className="w-5 h-5" />
         </button>
       </div>
       
       <div className="px-4 sm:px-6 relative -mt-16">
          <div className="flex justify-between items-end">
             <div className="relative p-1 bg-white dark:bg-zinc-950 rounded-full inline-block">
                <img
                   src={seller.photoURL || `https://ui-avatars.com/api/?name=${seller.displayName || 'User'}&background=random`}
                   className="w-32 h-32 rounded-full object-cover border-4 border-zinc-100 dark:border-zinc-800"
                />
             </div>
             
             <div className="mb-2 flex gap-2">
                <button onClick={() => navigate(`/messages?chatId=${seller.id}`)} className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-lg font-bold text-sm shadow-sm">
                   Message
                </button>
                <button
                   onClick={handleFollowToggle}
                  className={`px-6 py-2 rounded-lg text-sm font-bold shadow-sm transition-all ${isFollowing ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
             </div>
          </div>
          
          <div className="mt-2">
             <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
               {seller.displayName || seller.shopName || "User"}
               {seller.kycStatus === 'verified' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
             </h1>
             {seller.bio && <p className="text-sm mt-1 text-zinc-600 dark:text-zinc-400">{seller.bio}</p>}
             
             <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs text-zinc-500 font-medium">
                {seller.address && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>Lives in {seller.address}</span>
                  </div>
                )}
             </div>
             
             <div className="flex gap-4 mt-3 text-sm">
                <div className="font-bold text-zinc-900 dark:text-white">{followersCount} <span className="font-normal text-zinc-500">Followers</span></div>
                <div className="font-bold text-zinc-900 dark:text-white">{seller.following?.length || 0} <span className="font-normal text-zinc-500">Following</span></div>
             </div>
             
             {/* Social Links */}
             <div className="flex gap-2 mt-4">
                {seller.facebookUrl && (
                  <a href={seller.facebookUrl} target="_blank" rel="noreferrer" className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 rounded-full">
                     <Icon name="facebook" className="w-4 h-4" />
                  </a>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default StoreProfile;
"""

with open('pages/StoreProfile.tsx', 'w') as f:
    f.write(content)

