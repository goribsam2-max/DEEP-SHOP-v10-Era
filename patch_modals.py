import re

with open('pages/Messages.tsx', 'r') as f:
    content = f.read()

# Fix deleteMessageId modal
delete_modal_old = """<div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
              <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="bg-white dark:bg-zinc-900 w-full max-w-sm sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl font-inter flex flex-col"
              >"""
delete_modal_new = """<div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl font-inter flex flex-col"
              >"""
content = content.replace(delete_modal_old, delete_modal_new)

# Fix menu modal container just in case
menu_modal_old = """className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-3xl overflow-hidden font-inter text-zinc-900 dark:text-zinc-100\""""
menu_modal_new = """className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-[32px] overflow-hidden font-inter text-zinc-900 dark:text-zinc-100\""""
content = content.replace(menu_modal_old, menu_modal_new)

with open('pages/Messages.tsx', 'w') as f:
    f.write(content)

print("Modals patched")
