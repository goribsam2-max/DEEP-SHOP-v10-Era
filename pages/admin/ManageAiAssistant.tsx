import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Save, AlertCircle, Play, MessageSquare, Info, Shield, Zap, Clock, Terminal } from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNotify } from '../../components/Notifications';

export default function ManageAiAssistant() {
  const [settings, setSettings] = useState<any>({
    enabled: false,
    targetEmail: 'deepshop@gmail.com',
    targetUid: '',
    systemPrompt: `You are the Official Admin of DEEP SHOP.
Tone: Human-like, helpful, friendly, slightly casual Banglish/Bengali/English. 
Do NOT sound like an AI. Do NOT use bullet points or robotic lists.
Answer user queries about products, delivery, and support.
If you don't know something, ask the user to wait for a human team member.`,
    knowledgeBase: `DEEP SHOP Information:
- Delivery Fee: Dhaka 60 TK, Outside Dhaka 120 TK.
- Delivery Time: 2-3 days for Dhaka, 3-5 days for outside Dhaka.
- Products: Border cross devices, parts, and premium tech.
- Warranty: Most products have 7-day replacement warranty.
- Return: Only applicable if product is damaged or not as described.`,
    minDelay: 2,
    maxDelay: 5,
    showTyping: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const notify = useNotify();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'ai_human_agent'), (snap) => {
      if (snap.exists()) {
        setSettings((prev: any) => ({ ...prev, ...snap.data() }));
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'ai_human_agent'), settings);
      notify('AI Assistant settings saved!', 'success');
    } catch (err: any) {
      notify('Failed to save settings: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testMessage.trim()) return;
    setIsTesting(true);
    setTestResponse('');
    try {
      const prompt = `${settings.systemPrompt}\n\nContext Information:\n${settings.knowledgeBase}`;
      const res = await fetch('/api/chat-auto-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: testMessage }],
          systemPrompt: prompt
        })
      });
      const data = await res.json();
      if (data.choices?.[0]?.message?.content) {
        setTestResponse(data.choices[0].message.content);
      } else {
        setTestResponse('Error: No response from AI');
      }
    } catch (err) {
      setTestResponse('Failed to get response. Check server logs.');
    } finally {
      setIsTesting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <Bot className="w-6 h-6 text-emerald-500" />
            </div>
            AI Support Assistant
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Stealth human-like auto-reply agent for official messages</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Main Controls */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[24px] p-6 shadow-sm overflow-hidden relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 dark:text-white">Assistant Activation</h3>
                  <p className="text-xs text-zinc-500">Toggle stealth AI agent</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.enabled}
                  onChange={(e) => setSettings({...settings, enabled: e.target.checked})}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Target Account Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Shield className="h-4 w-4 text-zinc-400" />
                  </div>
                  <input
                    type="email"
                    value={settings.targetEmail}
                    onChange={(e) => setSettings({...settings, targetEmail: e.target.value})}
                    placeholder="deepshop@gmail.com"
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-emerald-500 dark:text-white transition"
                  />
                </div>
                <p className="mt-1.5 text-[10px] text-zinc-400 ml-1 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Messages sent to this email account will be auto-replied by AI.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Human Behavior Prompt</label>
                <textarea
                  value={settings.systemPrompt}
                  onChange={(e) => setSettings({...settings, systemPrompt: e.target.value})}
                  rows={6}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:border-emerald-500 dark:text-white transition resize-none"
                  placeholder="Tell the AI how to act..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Knowledge Base & Store FAQs</label>
                <textarea
                  value={settings.knowledgeBase}
                  onChange={(e) => setSettings({...settings, knowledgeBase: e.target.value})}
                  rows={6}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:border-emerald-500 dark:text-white transition resize-none"
                  placeholder="Paste store info, prices, policies here..."
                />
              </div>
            </div>
          </div>

          {/* Response Settings */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[24px] p-6 shadow-sm">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Response Dynamics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Simulated Typing Delay</label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      value={settings.minDelay} 
                      onChange={(e) => setSettings({...settings, minDelay: parseInt(e.target.value)})}
                      className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                      <span>1s</span>
                      <span>10s</span>
                    </div>
                  </div>
                  <div className="w-12 h-9 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-center font-bold text-xs text-zinc-900 dark:text-white">
                    {settings.minDelay}s
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Show Typing Indicator</h4>
                  <p className="text-[10px] text-zinc-500">Enable 'Admin is typing...' in chat</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.showTyping}
                    onChange={(e) => setSettings({...settings, showTyping: e.target.checked})}
                    className="sr-only peer" 
                  />
                  <div className="w-10 h-5 bg-zinc-200 peer-focus:outline-none dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Test Sandbox */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[24px] p-6 shadow-sm sticky top-6">
            <h3 className="font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-500" />
              Test Sandbox
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">Send a Message</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Hello, I want to buy..."
                    className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500 dark:text-white transition"
                    onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                  />
                  <button 
                    onClick={handleTest}
                    disabled={isTesting || !testMessage.trim()}
                    className="p-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl hover:scale-105 active:scale-95 transition disabled:opacity-50"
                  >
                    {isTesting ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                </div>
              </div>

              {testResponse && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">AI Response</label>
                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl">
                    <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                      "{testResponse}"
                    </p>
                  </div>
                </div>
              )}

              <div className="p-4 bg-zinc-100 dark:bg-zinc-800/40 rounded-2xl border border-zinc-200/50 dark:border-zinc-700/50">
                <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Platform Tips</h4>
                <ul className="space-y-2">
                  <li className="flex gap-2 text-[10px] text-zinc-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
                    Ensure sk-bl API key is correct in server.ts
                  </li>
                  <li className="flex gap-2 text-[10px] text-zinc-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
                    Model: qwen3.7-flash:free is optimized for cost & speed
                  </li>
                  <li className="flex gap-2 text-[10px] text-zinc-500">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
                    Stealth mode works best with low-latency delays
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
