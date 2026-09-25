import re

with open("pages/StoreProfile.tsx", "r") as f:
    content = f.read()

# Add states for review submission
states_to_add = """
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
"""
# Find a place to inject state (after UI states)
content = content.replace("const [searchQuery, setSearchQuery] = useState('');", "const [searchQuery, setSearchQuery] = useState('');\n" + states_to_add)

# Add submission function
submit_func = """
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      notify('Please sign in to leave a review', 'error');
      return;
    }
    if (!newReviewComment.trim()) {
      notify('Please enter a comment', 'error');
      return;
    }
    setSubmittingReview(true);
    try {
      const newReview = {
        sellerId: sellerId,
        userId: user.uid,
        reviewerId: user.uid,
        reviewerName: user.displayName || 'Anonymous',
        reviewerPhoto: user.photoURL || '',
        rating: newReviewRating,
        comment: newReviewComment.trim(),
        createdAt: Date.now()
      };
      const docRef = await addDoc(collection(db, 'reviews'), newReview);
      
      setReviews(prev => [{ id: docRef.id, ...newReview }, ...prev]);
      setNewReviewComment('');
      setNewReviewRating(5);
      notify('Review submitted successfully!', 'success');
    } catch (error) {
      console.error(error);
      notify('Failed to submit review', 'error');
    }
    setSubmittingReview(false);
  };
"""
content = content.replace("const handleShare = () => {", submit_func + "\n  const handleShare = () => {")

# Add the UI in the star tab
review_ui = """
          {activeTab === 'star' && (
            <div className="flex flex-col gap-6">
               {/* Review Input */}
               <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800">
                 <h3 className="font-bold text-sm text-zinc-900 dark:text-white mb-3">Leave a Review</h3>
                 <form onSubmit={handleReviewSubmit} className="flex flex-col gap-3">
                   <div className="flex gap-1">
                     {[1, 2, 3, 4, 5].map((star) => (
                       <Star
                         key={star}
                         onClick={() => setNewReviewRating(star)}
                         className={`w-6 h-6 cursor-pointer transition-colors ${
                           star <= newReviewRating
                             ? 'fill-[#F97316] text-[#F97316]'
                             : 'fill-zinc-300 text-zinc-300 dark:fill-zinc-700 dark:text-zinc-700 hover:text-[#F97316]'
                         }`}
                       />
                     ))}
                   </div>
                   <textarea
                     value={newReviewComment}
                     onChange={(e) => setNewReviewComment(e.target.value)}
                     placeholder="Write your review..."
                     className="w-full bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 text-sm focus:outline-none focus:border-[#1cdb5e] transition-colors dark:text-white min-h-[80px]"
                   />
                   <button
                     type="submit"
                     disabled={submittingReview}
                     className="bg-[#1cdb5e] text-white px-4 py-2 rounded-lg font-bold text-sm self-end disabled:opacity-50"
                   >
                     {submittingReview ? 'Submitting...' : 'Post Review'}
                   </button>
                 </form>
               </div>
"""
content = content.replace("{activeTab === 'star' && (\n            <div className=\"flex flex-col gap-6\">", review_ui)

with open("pages/StoreProfile.tsx", "w") as f:
    f.write(content)
