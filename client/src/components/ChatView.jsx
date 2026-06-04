import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';

const socket = io('https://peppy-we0g.onrender.com');

function ChatView() {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('private'); // 📱 'private' or 'groups'
  const [chatGroups, setChatGroups] = useState([]);
  const [activeChatTarget, setActiveChatTarget] = useState(null); // 🎯 Can hold User object or ChatGroup object
  const [messages, setMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');
  
  // ➕ CREATE GROUP STATE parameters
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const messagesEndRef = useRef(null);

  // 🔗 FEATURE 3: AUTOMATED TEXT HYPERLINK CONVERTER ENGINE
  const renderMessageWithLinks = (text) => {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={index} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-cyan-300 hover:text-cyan-200 underline font-semibold break-all inline-block"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // 📂 FETCH EMPLOYEES DIRECTORY & ALL VISIBLE WHATSAPP CHAT GROUPS
  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('peppy_token');
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch Users
      const usersRes = await axios.get('https://peppy-we0g.onrender.com/api/auth/users', { headers });
      const currentUserId = user?.id || user?._id;
      const filteredList = usersRes.data.filter(u => u._id !== currentUserId);
      setUsers(filteredList);

      // 2. Fetch Chat Groups Deployed on Backend
      const groupsRes = await axios.get('https://peppy-we0g.onrender.com/api/chats/groups', { headers });
      setChatGroups(groupsRes.data);

      // 3. Anchor socket channels for all groups instantly
      if (groupsRes.data.length > 0) {
        const groupIds = groupsRes.data.map(g => g._id);
        socket.emit('join_chat_groups', groupIds);
      }
    } catch (err) {
      console.error('❌ Data stream aggregation crash:', err);
    }
  };

  useEffect(() => {
    const currentUserId = user?.id || user?._id;
    if (currentUserId) {
      fetchInitialData();
      socket.emit('register_user', currentUserId);
    }
  }, [user]);

  // 🧠 RE-QUERY CHRONOLOGICAL FLOW WHENEVER TARGET DISCUSSION SWITCHES
  useEffect(() => {
    const fetchHistory = async () => {
      if (!activeChatTarget) return;
      try {
        const token = localStorage.getItem('peppy_token');
        const headers = { Authorization: `Bearer ${token}` };

        // Differentiate endpoint query by checking schema types properties
        const isGroup = activeChatTarget.hasOwnProperty('teamScope');
        const endpoint = isGroup 
          ? `https://peppy-we0g.onrender.com/api/chats/group/history/${activeChatTarget._id}`
          : `https://peppy-we0g.onrender.com/api/chats/history/${activeChatTarget._id}`;

        const res = await axios.get(endpoint, { headers });
        setMessages(res.data);
      } catch (err) {
        console.error('❌ Chat thread load breakdown:', err);
      }
    };
    fetchHistory();
  }, [activeChatTarget]);

  // 📡 WEBSOCKET DYNAMIC PROTOCOL INTERCEPTORS
  useEffect(() => {
    // Listen to 1-on-1 private logs
    socket.on('receive_direct_message', (incomingMessage) => {
      if (activeChatTarget && !activeChatTarget.hasOwnProperty('teamScope') && incomingMessage.sender === activeChatTarget._id) {
        setMessages(prev => [...prev, incomingMessage]);
      }
    });

    // Listen to WhatsApp Groups broadcasts room frames
    socket.on('receive_group_message', (incomingGroupMsg) => {
      if (activeChatTarget && activeChatTarget.hasOwnProperty('teamScope') && incomingGroupMsg.group === activeChatTarget._id) {
        setMessages(prev => [...prev, incomingGroupMsg]);
      }
    });

    return () => {
      socket.off('receive_direct_message');
      socket.off('receive_group_message');
    };
  }, [activeChatTarget]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ➕ CREATE WHATSAPP GROUP SUBMISSION CORE
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const token = localStorage.getItem('peppy_token');
      const res = await axios.post('https://peppy-we0g.onrender.com/api/chats/groups', {
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        members: selectedMembers
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update Local arrays instantly
      setChatGroups(prev => [res.data, ...prev]);
      socket.emit('join_chat_groups', [res.data._id]);

      // Flush Form Inputs clean
      setNewGroupName('');
      setNewGroupDesc('');
      setSelectedMembers([]);
      setIsGroupModalOpen(false);
      alert(`💬 Group "${res.data.name}" deployed successfully!`);
    } catch (err) {
      console.error('❌ Group create endpoint breakdown:', err);
      alert('Failed to deploy group chat channel.');
    }
  };

  // 📬 UNIVERSAL SEND DISPATCHER BLOCK
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeChatTarget) return;

    const currentUserId = user?.id || user?._id;
    if (!currentUserId) return;

    const token = localStorage.getItem('peppy_token');
    const isGroupChat = activeChatTarget.hasOwnProperty('teamScope');

    try {
      if (isGroupChat) {
        // 👥 WHATSAPP GROUP TARGETING ROUTE 📱
        const res = await axios.post('https://peppy-we0g.onrender.com/api/chats/group/send', {
          groupId: activeChatTarget._id,
          text: typedMessage.trim()
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Broadcast over socket room boundaries
        socket.emit('send_group_message', {
          groupId: activeChatTarget._id,
          senderId: currentUserId,
          group: activeChatTarget._id,
          text: typedMessage.trim(),
          sender: { _id: currentUserId, name: user.name || 'Operator' },
          _id: res.data._id,
          createdAt: res.data.createdAt
        });

        setMessages(prev => [...prev, res.data]);
      } else {
        // 👤 PRIVATE 1-ON-1 TARGETING ROUTE
        const res = await axios.post('https://peppy-we0g.onrender.com/api/chats/send', 
          { receiverId: activeChatTarget._id, text: typedMessage.trim() },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        socket.emit('send_direct_message', {
          senderId: currentUserId,
          receiverId: activeChatTarget._id,
          text: typedMessage.trim(),
          _id: res.data._id,
          createdAt: res.data.createdAt
        });

        setMessages(prev => [...prev, res.data]);
      }
      setTypedMessage('');
    } catch (err) {
      console.error('❌ DISPATCH EXCEPTION:', err);
    }
  };

  const handleMemberToggle = (id) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  return (
    <div className="flex h-[74vh] w-full bg-[#1e1f21] border border-[#2d2e30] rounded-2xl overflow-hidden shadow-2xl animate-fade-in relative z-10">
      
      {/* 👥 LEFT COLUMN: WORKSPACE SWITCHER DIRECTORY PANEL */}
      <div className="w-80 bg-[#252628]/60 border-r border-[#2d2e30] flex flex-col shrink-0">
        
        {/* Header Block with Role Access Rules Option */}
        <div className="p-4 border-b border-[#2d2e30]/60 shrink-0 flex justify-between items-center bg-[#1a1b1c]/20">
          <div>
            <h2 className="text-xs font-black tracking-wider text-slate-300 uppercase">Peppy Chat Hub</h2>
            <p className="text-[10px] text-[#848285] font-semibold capitalize">Role: {user?.role || 'Member'} ({user?.team || 'Global Org'})</p>
          </div>
          {(user?.role === 'Admin' || user?.role === 'Manager') && (
            <button 
              onClick={() => setIsGroupModalOpen(true)}
              className="bg-red-500 hover:bg-red-600 text-white font-extrabold text-[10px] uppercase px-2 py-1 rounded-md tracking-wider transition shadow-md"
            >
              + Group
            </button>
          )}
        </div>

        {/* 📱 WHATSAPP-STYLE TAB SWITCHER DECK */}
        <div className="grid grid-cols-2 gap-1.5 p-2 bg-[#17181a]/50 border-b border-[#2d2e30]/40 shrink-0">
          <button
            onClick={() => { setActiveTab('private'); setActiveChatTarget(null); setMessages([]); }}
            className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition ${activeTab === 'private' ? 'bg-red-500/10 border border-red-500/30 text-white' : 'text-slate-400 hover:bg-[#2a2b2d]/30'}`}
          >
            💬 Private Chats
          </button>
          <button
            onClick={() => { setActiveTab('groups'); setActiveChatTarget(null); setMessages([]); }}
            className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition ${activeTab === 'groups' ? 'bg-red-500/10 border border-red-500/30 text-white' : 'text-slate-400 hover:bg-[#2a2b2d]/30'}`}
          >
            📱 WhatsApp Groups
          </button>
        </div>

        {/* LISTINGS CONTAINER */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {activeTab === 'private' ? (
            users.map((member) => (
              <div 
                key={member._id}
                onClick={() => setActiveChatTarget(member)}
                className={`flex items-center gap-3 p-3 rounded-xl transition cursor-pointer border ${activeChatTarget?._id === member._id ? 'bg-red-500/10 border-red-500/40 text-white' : 'bg-transparent border-transparent hover:bg-[#2a2b2d]/50 text-slate-400 hover:text-white'}`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-500 to-amber-500 flex items-center justify-center font-black text-xs text-white uppercase shadow-md shrink-0">
                  {member.name.substring(0, 2)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold truncate">{member.name}</h4>
                  <p className="text-[10px] text-[#848285] font-semibold truncate uppercase">{member.team} &bull; {member.role}</p>
                </div>
              </div>
            ))
          ) : (
            chatGroups.map((group) => (
              <div 
                key={group._id}
                onClick={() => setActiveChatTarget(group)}
                className={`flex items-center gap-3 p-3 rounded-xl transition cursor-pointer border ${activeChatTarget?._id === group._id ? 'bg-purple-500/10 border-purple-500/40 text-white' : 'bg-transparent border-transparent hover:bg-[#2a2b2d]/50 text-slate-400 hover:text-white'}`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-black text-xs text-white shadow-md shrink-0">
                  👥
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold truncate text-slate-200">{group.name}</h4>
                    <span className="text-[8px] bg-purple-900/40 text-purple-400 border border-purple-500/20 px-1 rounded uppercase font-bold shrink-0">{group.teamScope}</span>
                  </div>
                  <p className="text-[10px] text-[#848285] font-medium truncate mt-0.5">{group.description || 'No broadcast description logs.'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 💬 RIGHT COLUMN: ENCRYPTED LIVE COMMUNICATION GRID */}
      <div className="flex-1 flex flex-col bg-[#1e1f21] min-w-0 relative">
        {activeChatTarget ? (
          <>
            {/* Context Thread Header Layout */}
            <div className="px-6 py-4 border-b border-[#2d2e30]/60 bg-[#252628]/30 flex items-center gap-3 shrink-0 relative z-10">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <div>
                <h3 className="text-xs font-black tracking-wide text-white">
                  {activeChatTarget.name}
                </h3>
                <p className="text-[9px] text-[#848285] font-bold uppercase tracking-wider">
                  {activeChatTarget.hasOwnProperty('teamScope') ? ` WhatsApp Group Workspace Target Channel` : activeChatTarget.email}
                </p>
              </div>
            </div>

            {/* Chat Messages Frame Window Layer */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#1a1b1c]/40 relative z-10">
              {messages.map((msg) => {
                const currentUserId = user?.id || user?._id;
                const isMe = (msg.sender?._id || msg.sender) === currentUserId;
                const msgSenderName = msg.sender?.name || 'Operator';

                return (
                  <div key={msg._id} className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
                    {/* Render group username identities for dynamic visual awareness context */}
                    {!isMe && activeChatTarget.hasOwnProperty('teamScope') && (
                      <span className="text-[9px] text-purple-400 font-extrabold mb-1 ml-1 uppercase">{msgSenderName}</span>
                    )}
                    <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-xs font-medium shadow-md leading-relaxed ${isMe ? 'bg-red-500 text-white rounded-br-none' : 'bg-[#252628] border border-[#333538] text-slate-200 rounded-bl-none'}`}>
                      {/* FEATURE 3: Render via hyperlinking layer */}
                      <p>{renderMessageWithLinks(msg.text)}</p>
                      <span className="block text-[8px] mt-1.5 opacity-60 text-right font-semibold">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* TEXT DESK SPRINT FIELD DECK */}
            <form 
              onSubmit={handleSendMessage} 
              className="p-4 pr-36 border-t border-[#2d2e30]/60 bg-[#252628]/80 flex gap-3 shrink-0 relative items-center z-50 pointer-events-auto"
            >
              <input 
                type="text"
                className="flex-1 bg-[#151617] border border-[#333538] rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition h-11 relative z-50 pointer-events-auto"
                placeholder={`Type secure message thread to ${activeChatTarget.name}...`}
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
            <p className="text-[11px] text-[#848285] max-w-xs mt-1">Select an employee private channel or join a corporate WhatsApp Group stream inside the panels directory.</p>
          </div>
        )}
      </div>

      {/* 📱 WHATSAPP NEW GROUP MODAL CREATOR ENGINES POP-UP */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[999] p-4 animate-fade-in">
          <div className="bg-[#1e1f21] border border-[#2d2e30] w-full max-w-md rounded-2xl overflow-hidden p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Deploy WhatsApp Workspace Group Channel</h3>
              <p className="text-[10px] text-[#848285] mt-0.5">Asana restrictions map matching profiles automatically.</p>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Group Channel Title</label>
                <input 
                  type="text" 
                  value={newGroupName} 
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-[#151617] border border-[#333538] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500" 
                  placeholder="e.g., UI Sprint Sync Team"
                  required 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description Note</label>
                <textarea 
                  value={newGroupDesc} 
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full bg-[#151617] border border-[#333538] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 h-16 resize-none" 
                  placeholder="What is this discussion channel optimized for..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Crew Core Members</label>
                <div className="max-h-28 overflow-y-auto bg-[#151617] border border-[#333538] rounded-xl p-2 space-y-1.5 custom-scrollbar">
                  {users.map(u => (
                    <label key={u._id} className="flex items-center gap-2 px-2 py-1 hover:bg-[#252628] rounded-md cursor-pointer text-xs text-slate-300">
                      <input 
                        type="checkbox" 
                        checked={selectedMembers.includes(u._id)}
                        onChange={() => handleMemberToggle(u._id)}
                        className="accent-red-500 cursor-pointer"
                      />
                      <span>{u.name} <span className="text-[9px] text-gray-500">({u.team})</span></span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2.5 bg-[#252628] hover:bg-[#2d2e30] rounded-xl text-xs font-bold text-slate-400 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-black text-white uppercase tracking-wide transition shadow-lg"
                >
                  Deploy Group 🚀
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ChatView;