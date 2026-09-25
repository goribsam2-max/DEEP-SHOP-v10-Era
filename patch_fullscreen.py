import re

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

# Fix Review modal
old_review = """        {showReviewModal && (
          <div className="fixed inset-0 z-[10000] bg-white dark:bg-zinc-950 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden font-inter"
            >"""
new_review = """        {showReviewModal && (
          <div className="fixed inset-0 z-[10000] bg-white dark:bg-zinc-950 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="bg-white dark:bg-zinc-950 min-h-screen w-full flex flex-col max-w-lg mx-auto p-6 font-inter"
            >"""
content = content.replace(old_review, new_review)

# Fix Forward modal
old_forward = """        {showForwardModal && forwardingMessage && (
          <div className="fixed inset-0 z-[10000] bg-white dark:bg-zinc-950 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-hidden font-inter"
            >"""
new_forward = """        {showForwardModal && forwardingMessage && (
          <div className="fixed inset-0 z-[10000] bg-white dark:bg-zinc-950 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              className="bg-white dark:bg-zinc-950 min-h-screen w-full flex flex-col max-w-lg mx-auto p-6 font-inter"
            >"""
content = content.replace(old_forward, new_forward)

with open('pages/Messages.tsx', 'w') as f:
    f.write(content)

print("Fullscreen patched")
