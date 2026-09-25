import re

with open("pages/StoreProfile.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# I will write a completely new UI return statement.
# First, extract everything up to `return (`
start_idx = code.find("  return (")

header_code = code[:start_idx]

new_ui = """  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 pb-20 font-inter">
      {/* Dynamic Profile Render Based on Role */}
      {isSeller ? (
        <div className="w-full">
          {/* Sialvi Production Style Seller Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border border-zinc-200 shadow-sm">
                <img src={seller.photoURL || seller.avatarUrl || `https://ui-avatars.com/api/?name=${seller.displayName || 'Seller'}&background=random`} alt="Seller" className="object-cover" />
              </Avatar>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white">{seller.displayName || seller.shopName}</span>
                    {(seller.kycStatus === 'verified' || (seller as any).verified) && <VerifiedIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                </div>
                <span className="text-[10px] text-zinc-500">ID: {seller.id.substring(0,8).toUpperCase()}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-zinc-600 dark:text-zinc-400">
              <Search className="w-5 h-5 cursor-pointer" />
              <MessageSquare className="w-5 h-5 cursor-pointer" onClick={() => navigate(`/messages?chatId=${seller.id}`)} />
              <MoreVertical className="w-5 h-5 cursor-pointer" />
            </div>
          </div>

          <div className="px-4 pt-4 pb-2">
            {/* Store Info Card */}
            <div className="relative bg-[#f4f2fb] dark:bg-[#1a1924] rounded-2xl p-4 overflow-hidden shadow-sm">
              <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform scale-150 translate-x-4 -translate-y-4">
                 <Icon name="headphones" className="w-32 h-32" />
              </div>
              
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    {seller.shopName || seller.displayName}
                  </h1>
                  <div className="flex items-center gap-1 mt-1 text-xs font-semibold">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < Math.floor(sellerRating || 5) ? 'text-[#ff6b00] fill-[#ff6b00]' : 'text-zinc-300'}`} />
                    ))}
                    <span className="text-[#ff6b00] ml-1">{sellerRating || 5.0}</span>
                    <span className="text-zinc-500 ml-1">({reviews.length + userReviews.length || 32000} ratings)</span>
                  </div>
                </div>
                
                <button 
                  onClick={handleFollowToggle}
                  className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all ${isFollowing ? 'bg-zinc-200 text-zinc-800' : 'bg-[#7e57c2] text-white hover:bg-[#6c48a8]'}`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>

              <div className="relative z-10 flex items-center justify-between mt-5 text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                 <span>{(seller as any).positiveReviews || 92}% Positive seller ratings</span>
                 <span>{followersCount >= 1000 ? (followersCount/1000).toFixed(1) + 'k' : followersCount} Followers</span>
              </div>
            </div>
            
            {/* Stats Row */}
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-[#151515] rounded-2xl p-4 mt-3 shadow-sm border border-zinc-100 dark:border-zinc-800">
               <div className="flex flex-col items-center flex-1">
                 <span className="text-lg font-black text-zinc-900 dark:text-white">{(seller as any).positiveReviews || 94}%</span>
                 <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight">Positive Reviews</span>
               </div>
               <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800"></div>
               <div className="flex flex-col items-center flex-1">
                 <span className="text-lg font-black text-zinc-900 dark:text-white">{(seller as any).totalSold || "30,000+"}</span>
                 <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight">Sold by Store</span>
               </div>
               <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800"></div>
               <div className="flex flex-col items-center flex-1">
                 <span className="text-lg font-black text-zinc-900 dark:text-white">{(seller as any).regularBuyers || "1,000+"}</span>
                 <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight">Regular Buyer</span>
               </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-around border-b border-zinc-200 dark:border-zinc-800 mt-2 px-2">
            {[
              { id: "home", icon: <LayoutGrid className="w-5 h-5" /> },
              { id: "products", icon: <Layers className="w-5 h-5" /> },
              { id: "categories", icon: <LayoutGrid className="w-5 h-5" /> }, // Assuming categories is another tab or use LayoutGrid again
              { id: "reviews", icon: <Star className="w-5 h-5" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`p-4 border-b-2 transition-colors flex-1 flex justify-center ${activeTab === tab.id ? 'border-[#7e57c2] text-[#7e57c2]' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
              >
                {tab.icon}
              </button>
            ))}
          </div>
          
          <div className="p-4">
             {/* Content based on Active Tab */}
             {activeTab === "products" && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {products.length === 0 ? (
                    <div className="col-span-2 py-10 text-center text-zinc-500 text-sm">No products found</div>
                  ) : (
                    products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)
                  )}
                </div>
             )}
             {activeTab === "home" && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {latestProducts.length === 0 ? (
                    <div className="col-span-2 py-10 text-center text-zinc-500 text-sm">No recent activity</div>
                  ) : (
                    latestProducts.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)
                  )}
                </div>
             )}
             {activeTab === "reviews" && (
                <div className="space-y-3">
                  {reviews.length === 0 && userReviews.length === 0 ? (
                    <div className="py-10 text-center text-zinc-500 text-sm">No reviews yet</div>
                  ) : (
                    [...reviews, ...userReviews].map((r: any) => (
                      <div key={r.id} className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-3 shadow-sm border border-zinc-100 dark:border-zinc-800">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-2 items-center cursor-pointer" onClick={() => navigate(`/profile/${r.userId}`)}>
                            <img src={r.userPhoto || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"} className="w-8 h-8 rounded-full" />
                            <div>
                               <p className="font-bold text-xs hover:underline">{r.userName || "User"}</p>
                               <div className="flex">
                                 {Array.from({ length: 5 }).map((_, i) => (
                                   <Star key={i} className={`w-3 h-3 ${i < (r.rating || 5) ? 'text-[#ff6b00] fill-[#ff6b00]' : 'text-zinc-300'}`} />
                                 ))}
                               </div>
                            </div>
                          </div>
                          <span className="text-[9px] text-zinc-400">{new Date(r.createdAt || Date.now()).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs mt-2 text-zinc-700 dark:text-zinc-300">{r.comment || r.text}</p>
                      </div>
                    ))
                  )}
                </div>
             )}
          </div>
        </div>
      ) : (
        // Facebook Style User Profile for Normal Users
        <div className="w-full">
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
                      src={seller.photoURL || seller.avatarUrl || `https://ui-avatars.com/api/?name=${seller.displayName || 'User'}&background=random`} 
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
                   {(seller.kycStatus === 'verified' || (seller as any).verified) && <VerifiedIcon className="w-4 h-4 text-blue-500" />}
                 </h1>
                 {seller.bio && <p className="text-sm mt-1 text-zinc-600 dark:text-zinc-400">{seller.bio}</p>}
                 
                 <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs text-zinc-500 font-medium">
                    {seller.address && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>Lives in {seller.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>Joined {new Date((seller as any).createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                 </div>
                 
                 <div className="flex gap-4 mt-3 text-sm">
                    <div className="font-bold text-zinc-900 dark:text-white">{followersCount} <span className="font-normal text-zinc-500">Followers</span></div>
                    <div className="font-bold text-zinc-900 dark:text-white">{followingCount} <span className="font-normal text-zinc-500">Following</span></div>
                 </div>
                 
                 {/* Social Links */}
                 <div className="flex gap-2 mt-4">
                    {seller.facebookUrl && (
                      <a href={seller.facebookUrl} target="_blank" className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 rounded-full">
                         <Icon name="facebook" className="w-4 h-4" />
                      </a>
                    )}
                    {seller.instagramUrl && (
                      <a href={seller.instagramUrl} target="_blank" className="p-2 bg-pink-50 text-pink-600 dark:bg-pink-900/20 rounded-full">
                         <Icon name="instagram" className="w-4 h-4" />
                      </a>
                    )}
                    {seller.tiktokUrl && (
                      <a href={seller.tiktokUrl} target="_blank" className="p-2 bg-black text-white dark:bg-zinc-800 rounded-full">
                         <Icon name="tiktok" className="w-4 h-4" />
                      </a>
                    )}
                 </div>
              </div>
           </div>
           
           <div className="mt-6 border-t border-zinc-200 dark:border-zinc-800">
              <div className="p-4">
                 <h2 className="font-bold text-lg mb-3 text-zinc-900 dark:text-white">Activity & Reviews</h2>
                 <div className="space-y-3">
                  {reviews.length === 0 && userReviews.length === 0 ? (
                    <div className="py-10 text-center text-zinc-500 text-sm">No activity found.</div>
                  ) : (
                    [...reviews, ...userReviews].map((r: any) => (
                      <div key={r.id} className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 shadow-sm border border-zinc-100 dark:border-zinc-800">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-2 items-center">
                            <img src={r.userPhoto || "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback"} className="w-8 h-8 rounded-full" />
                            <div>
                               <p className="font-bold text-xs text-zinc-900 dark:text-white">{r.userName || "User"}</p>
                               <span className="text-[10px] text-zinc-500">{new Date(r.createdAt || Date.now()).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm mt-3 text-zinc-700 dark:text-zinc-300">{r.comment || r.text}</p>
                      </div>
                    ))
                  )}
                 </div>
              </div>
           </div>
        </div>
      )}
      
      {isAdmin && (
        <div className="fixed bottom-20 left-4 z-50 bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 text-xs w-64">
           <h4 className="font-bold mb-2">Admin: Adjust Followers</h4>
           <div className="flex gap-2">
             <input 
                type="number" 
                className="w-full bg-zinc-100 dark:bg-zinc-800 rounded px-2 py-1"
                value={adminFollowersInput}
                onChange={(e) => setAdminFollowersInput(e.target.value)}
             />
             <Button size="sm" onClick={handleAdminAdjustFollowers}>Save</Button>
           </div>
        </div>
      )}
    </div>
  );
}
"""

with open("pages/StoreProfile.tsx", "w", encoding="utf-8") as f:
    f.write(header_code + new_ui)

