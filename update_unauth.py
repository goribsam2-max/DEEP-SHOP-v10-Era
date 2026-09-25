import re

with open('pages/Messages.tsx', 'r', encoding='utf8') as f:
    content = f.read()

match = re.search(r'(<div className="min-h-screen w-full bg-gradient-to-tr from-indigo-700.*?<SEO title="Chat and Connect".*?</div>\s*</div>\s*</div>\s*\);\s*})', content, re.DOTALL)
if match:
    old_block = match.group(1)
    
    new_block = """<div className="min-h-screen w-full bg-[#4E4AEB] flex flex-col items-center justify-center p-4 sm:p-6 font-inter select-none">
            <SEO title="Chat and Connect" description="Sign in to chat with sellers and friends easily" noindex />
            <div className="bg-white text-zinc-900 rounded-[36px] w-full max-w-sm h-[740px] shadow-2xl flex flex-col p-8 relative overflow-hidden">
                {/* Main Heading styled exactly like the mockup */}
                <div className="flex flex-col text-left mt-8">
                    <h1 className="text-[38px] font-medium text-zinc-900 tracking-tight leading-[1.1] mb-6">
                        Chat And <br />
                        <span className="inline-flex items-center gap-1.5">
                            Connect 
                            <span className="inline-flex items-center justify-center -space-x-1 ml-1 mr-1">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Samantha" alt="User 1" className="w-8 h-8 rounded-full object-cover border-[3px] border-white shadow-sm" />
                            </span>
                            With
                        </span> <br />
                        <span className="inline-flex items-center gap-1.5">
                            Your 
                            <span className="inline-flex items-center justify-center -space-x-1 ml-1 mr-1">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jaden" alt="User 2" className="w-8 h-8 rounded-full object-cover border-[3px] border-white shadow-sm" />
                            </span>
                            Loved
                        </span> <br />
                        Ones Easily
                    </h1>
                    <p className="text-zinc-500 text-xs font-medium leading-relaxed max-w-[280px] mb-8">
                        Sign in right now to get started and get all the greatest perks!
                    </p>
                </div>

                {/* Beautiful Mockup Chat Rows exactly as pictured */}
                <div className="flex-1 flex flex-col gap-4 justify-center relative py-4">
                    {/* Mock Card 1 */}
                    <div className="bg-white border border-zinc-100 p-4 rounded-3xl flex items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10 w-full max-w-[280px]">
                        <div className="relative shrink-0">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Adam" className="w-10 h-10 rounded-full object-cover bg-indigo-50" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <div className="flex justify-between items-center mb-0.5">
                                <h4 className="font-semibold text-sm text-zinc-800">Adam Kepler</h4>
                                <span className="text-[10px] text-zinc-400">12:15</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 font-medium truncate">I had a lovely conversation</p>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center shadow-sm">
                            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        </div>
                    </div>

                    {/* Mock Card 2 */}
                    <div className="bg-white border border-zinc-100 p-4 rounded-3xl flex items-center gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative ml-8 z-0 w-full max-w-[280px]">
                        <div className="relative shrink-0">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Julia" className="w-10 h-10 rounded-full object-cover bg-amber-50" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <div className="flex justify-between items-center mb-0.5">
                                <h4 className="font-semibold text-sm text-zinc-800">Julia Robinson</h4>
                                <span className="text-[10px] text-zinc-400">12:15</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 font-medium truncate">Today we will have lunch...</p>
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center shadow-sm">
                            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        </div>
                    </div>
                </div>

                {/* Bottom Onboarding Buttons matching the mockup exactly */}
                <div className="flex flex-col gap-4 mt-auto">
                    {/* Button 1: Sign up with phone number (Orange style with Phone logo) */}
                    <button 
                        onClick={() => navigate('/auth-selector')}
                        className="w-full bg-[#F8F9FB] hover:bg-zinc-100 p-2 pl-6 rounded-[24px] flex items-center justify-between transition-all group cursor-pointer"
                    >
                        <span className="text-zinc-600 font-medium text-sm">Sign up with phone number</span>
                        <div className="w-12 h-12 rounded-[20px] bg-[#FFB800] flex items-center justify-center text-white shrink-0">
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        </div>
                    </button>

                    {/* Button 2: Sign up with Google/Email (Indigo/Blue style with G logo) */}
                    <button 
                        onClick={() => navigate('/auth-selector')}
                        className="w-full bg-[#4E4AEB] hover:bg-[#3d39db] p-2 pl-6 rounded-[24px] flex items-center justify-between shadow-md transition-all group cursor-pointer"
                    >
                        <span className="text-white font-medium text-sm">Sign up with Google account</span>
                        <div className="w-12 h-12 rounded-[20px] bg-white flex items-center justify-center text-[#4E4AEB] shrink-0 font-bold text-xl">
                            G
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
  }"""
    with open('pages/Messages.tsx', 'w', encoding='utf8') as f:
        f.write(content.replace(old_block, new_block))
    print("Updated")
else:
    print("Not found")
