import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';

const socket = io('https://peppy-we0g.onrender.com');

function ChatView() {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');
  const messagesEndRef = useRef(null);

  // 📂 Fetch all workspace employees list
  useEffect(() => {
    const fetchUsersList = async () => {
      try {
        const token = localStorage.getItem('peppy_token');
        const res = await axios.get('https://peppy-we0g.onrender.com/api/auth/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Filter out logged-in user securely
        const currentUserId = user?.id || user?._id;
        const filteredList = res.data.filter(u => u._id !== currentUserId);
        setUsers(filteredList);
      } catch (err) {
        console.error('❌ Directory list fetch error:', err);
      }
    };
    
    const currentUserId = user?.id || user?._id;
    if (currentUserId) {
      fetchUsersList();
      socket.emit('register_user', currentUserId);
    }
  }, [user]);

  // 🧠 Fetch conversation history whenever target chat partner switches
  useEffect(() => {
    const fetchConversationHistory = async () => {
      if (!activeChatUser) return;
      try {
        const token = localStorage.getItem('peppy_token');
        const res = await axios.get(`https://peppy-we0g.onrender.com/api/chats/history/${activeChatUser._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data);
      } catch (err) {
        console.error('❌ Chat thread load breakdown:', err);
      }
    };
    fetchConversationHistory();
  }, [activeChatUser]);

  // 📡 Socket handshake packet hook to intercept incoming messages live
  useEffect(() => {
    socket.on('receive_direct_message', (incomingMessage) => {
      if (activeChatUser && incomingMessage.sender === activeChatUser._id) {
        setMessages(prev => [...prev, incomingMessage]);
      }
    });

    return () => { socket.off('receive_direct_message'); };
  }, [activeChatUser]);

  // 📜 Autoscroll view stack to keep recent chat element locked on screen bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 📬 Send Message dispatcher routine
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeChatUser) return;

    const currentUserId = user?.id || user?._id;
    if (!currentUserId) {
      alert("Session expired. Please log in again.");
      return;
    }

    try {
      const token = localStorage.getItem('peppy_token');
      
      // 1. Post text payload block straight into backend mongo cluster storage logs
      const res = await axios.post('https://peppy-we0g.onrender.com/api/chats/send', 
        { receiverId: activeChatUser._id, text: typedMessage.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 2. Broadcast via live active web socket pipeline
      socket.emit('send_direct_message', {
        senderId: currentUserId,
        receiverId: activeChatUser._id,
        text: typedMessage.trim(),
        _id: res.data._id,
        createdAt: res.data.createdAt
      });

      // 3. Update local state and wipe input deck clean
      setMessages(prev => [...prev, res.data]);
      setTypedMessage('');
    } catch (err) {
      // ✅ ALERT ERROR IN CONSOLE FOR DYNAMIC DEBUGGING
      console.error('❌ SEND BUTTON FAILURE LOGS:', err.response?.data || err.message);
      alert("Failed to send message: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="flex h-[74vh] w-full bg-[#1e1f21] border border-[#2d2e30] rounded-2xl overflow-hidden shadow-2xl animate-fade-in relative z-10">
      
      {/* 👥 LEFT COLUMN: ACTIVE WORKFORCE DIRECTORY SELECTION CONTAINER */}
      <div className="w-72 bg-[#252628]/60 border-r border-[#2d2e30] flex flex-col shrink-0">
        <div className="p-5 border-b border-[#2d2e30]/60 shrink-0">
          <h2 className="text-sm font-black tracking-wider text-slate-300 uppercase">Workspace Employees</h2>
          <p className="text-[10px] text-[#848285] mt-0.5 font-medium">Select a member to chat</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {users.map((member) => (
            <div 
              key={member._id}
              onClick={() => setActiveChatUser(member)}
              className={`flex items-center gap-3 p-3.5 rounded-xl transition cursor-pointer border ${
                activeChatUser?._id === member._id 
                  ? 'bg-red-500/10 border-red-500/40 text-white' 
                  : 'bg-transparent border-transparent hover:bg-[#2a2b2d]/50 text-slate-400 hover:text-white'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-500 to-amber-500 flex items-center justify-center font-black text-xs text-white shrink-0 uppercase shadow-md">
                {member.name.substring(0, 2)}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold truncate">{member.name}</h4>
                <p className="text-[10px] text-[#848285] font-semibold truncate capitalize">{member.role || 'Team Partner'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 💬 RIGHT COLUMN: SECURE LIVE TEXT STREAM CHAT FEED CORE */}
      <div className="flex-1 flex flex-col bg-[#1e1f21] min-w-0 relative">
        {activeChatUser ? (
          <>
            {/* Thread Header Context Details */}
            <div className="px-6 py-4 border-b border-[#2d2e30]/60 bg-[#252628]/30 flex items-center gap-3 shrink-0 relative z-10">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <div>
                <h3 className="text-xs font-black tracking-wide text-white">{activeChatUser.name}</h3>
                <p className="text-[9px] text-[#848285] font-bold uppercase tracking-wider">{activeChatUser.email}</p>
              </div>
            </div>

            {/* Scrolling Core Conversational Stream Matrix */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#1a1b1c]/40 relative z-10">
              {messages.map((msg) => {
                const currentUserId = user?.id || user?._id;
                const isMe = msg.sender === currentUserId;
                return (
                  <div key={msg._id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-xs font-medium shadow-md leading-relaxed ${
                      isMe 
                        ? 'bg-red-500 text-white rounded-br-none' 
                        : 'bg-[#252628] border border-[#333538] text-slate-200 rounded-bl-none'
                    }`}>
                      <p>{msg.text}</p>
                      <span className="block text-[8px] mt-1.5 opacity-60 text-right font-semibold">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* 🎯 ULTRA FIXED SEND ENGINE DECK */}
            <form 
              onSubmit={handleSendMessage} 
              className="p-4 pr-36 border-t border-[#2d2e30]/60 bg-[#252628]/80 flex gap-3 shrink-0 relative items-center z-50 pointer-events-auto"
            >
              <input 
                type="text"
                className="flex-1 bg-[#151617] border border-[#333538] rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition h-11 relative z-50 pointer-events-auto"
                placeholder={`Type secure message to ${activeChatUser.name}...`}
                value={typedMessage}
                onChange={(e) => setTypedMessage(e.target.value)}
                required
              />
              <button 
                type="submit"
                className="bg-red-500 hover:bg-red-600 text-white px-6 h-11 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-2xl cursor-pointer flex items-center justify-center shrink-0 relative z-50 pointer-events-auto"
                style={{ minWidth: '95px' }}
              >
                Send 🚀
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <span className="text-4xl mb-3">💬</span>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Peppy Encrypted Chat Grid Active</h3>
            <p className="text-[11px] text-[#848285] max-w-xs mt-1">Select an employee from the left panel directory to query live direct conversations.</p>
          </div>
        )}
      </div>

    </div>
  );
}

export default ChatView;