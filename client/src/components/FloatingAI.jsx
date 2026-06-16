import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

function FloatingAI({ currentProjectId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! Peppy Team, Hope you are doing well. If you have any doubts, feel free to ask!" }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    
    // Append user query to thread locally
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setLoading(true);

    try {
      const res = await api.post('/api/ai/chat', { message: userText, projectId: currentProjectId || null });

      // Append clean English response from backend routing cluster
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch (err) {
      console.error("AI Node fetch crash:", err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "⚠️ Cloud connection timeout. Key verification missing or engine mapping failure." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    // 🎯 FIXED POSITION LAYOUT: Shifted to bottom-24 and strict z-40 block index to prevent click hijacking
    <div className="fixed bottom-24 right-6 z-40 text-left font-sans text-xs antialiased select-none">
      
      {/* 🤖 FLOATING ACTION BUBBLE TOGGLE TRIGGER */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-black px-4 py-3 rounded-2xl cursor-pointer shadow-2xl flex items-center gap-2 border border-red-500/20 group relative transition-all duration-300 transform hover:scale-105"
        >
          <span className="text-sm animate-bounce">🤖</span>
          <span className="uppercase tracking-wider text-[10px]">Peppy AI</span>
          {/* Live System Signal Pulse Node */}
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#1e1f21]"></span>
        </button>
      )}

      {/* 💬 EXPANDED INTELLIGENCE DESK DRAWER LAYOUT */}
      {isOpen && (
        <div className="bg-[#151617] w-80 sm:w-96 h-[480px] rounded-2xl border border-[#2d2e30] shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          
          {/* Drawer Header Panel Control Deck */}
          <div className="bg-[#1e1f21] px-4 py-3.5 border-b border-[#2d2e30] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <h3 className="font-black tracking-wider uppercase text-slate-200 text-[10px]">Gemini Intelligence Desk</h3>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-[#848285] hover:text-white font-bold transition text-sm cursor-pointer px-1.5 py-0.5 rounded-lg hover:bg-[#2a2b2d]"
            >
              ✕
            </button>
          </div>

          {/* Core Generative Conversational Scroll Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#1e1f21]/30 custom-scrollbar">
            {messages.map((msg, index) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div key={index} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-xl leading-relaxed whitespace-pre-wrap ${
                    isAssistant 
                      ? 'bg-[#252628] text-slate-300 border border-[#2d2e30]' 
                      : 'bg-red-500 text-white font-medium'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              );
            })}
            
            {/* Real-time Processing Wave Signals Indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#252628] text-slate-400 border border-[#2d2e30] px-3.5 py-2.5 rounded-xl italic font-medium animate-pulse flex items-center gap-1.5">
                  <span>⚙️</span> Compiling operations matrix...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Interface Formulation Deck Terminal */}
          <form onSubmit={handleSendMessage} className="p-3 bg-[#1e1f21] border-t border-[#2d2e30] flex gap-2 shrink-0">
            <input 
              type="text"
              className="flex-1 bg-[#252628] border border-[#333538] rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 text-xs"
              placeholder={currentProjectId ? "Query this active project details..." : "Ask anything, code doubt or project status..."}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              required
            />
            <button 
              type="submit" 
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl px-3 transition cursor-pointer flex items-center justify-center disabled:opacity-50"
            >
              ➔
            </button>
          </form>

        </div>
      )}

    </div>
  );
}

export default FloatingAI;