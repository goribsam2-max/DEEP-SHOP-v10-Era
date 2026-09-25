import re
import sys

with open('App.tsx', 'r') as f:
    content = f.read()

ban_render = """
  if (userData && userData.isBanned) {
    return (
      <div className="fixed inset-0 z-[999999] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Access Revoked</h1>
        <p className="text-zinc-400 max-w-sm mb-6">
          {userData.banReason || "Your account has been banned due to violations of our terms of service."}
        </p>
        <button onClick={() => auth.signOut()} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition">
          Sign Out
        </button>
      </div>
    );
  }
"""

# Insert before `return (` inside App component
# Let's find `return (\n    <PageLoadingContext.Provider` or similar

content = content.replace('  return (\n    <PageLoadingContext.Provider', ban_render + '\n  return (\n    <PageLoadingContext.Provider')

with open('App.tsx', 'w') as f:
    f.write(content)
print("Added ban UI to App.tsx")
