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
  const [activeChatTarget, setActiveChatTarget] = useState(null); // 🎯 Holds active User or ChatGroup object
  const [messages, setMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');
  
  // ⭐ WHATSAPP CONFIGURATION EXTRA: Toggle link state to display active channels crew info stack
  const [showMembersList, setShowMembersList] = useState(false);

  // ➕ CREATE GROUP STATE
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const messagesEndRef = useRef(null);

  // 🔗 FEATURE: AUTOMATED TEXT HYPERLINK CONVERTER ENGINE
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

  // 📂 FETCH ALL EMPLOYEES GLOBALLY & ALL SYNCED CHAT GROUPS
  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('peppy_token');
      if (!token) return;

      const headers = { 
        'Authorization': `Bearer ${token}`,
        'x-auth-token': token 
      };

      // ⭐ UNRESTRICTED CORE SYSTEM OVERRIDE: Base routes pull absolutely EVERYONE for global mapping
      const [usersRes, groupsRes] = await Promise.all([
        axios.get('https://peppy-we0g.onrender.com/api/auth/users', { headers }),
        axios.get('https://peppy-we0g.onrender.com/api/chats/groups', { headers })
      ]);

      const currentUserId = user?.id || user?._id;
      const filteredList = (usersRes.data || []).filter(u => u._id !== currentUserId);
      
      setUsers(filteredList);
      setChatGroups(groupsRes.data || []);

      // Anchor sockets for real-time channels dynamically
      if (groupsRes.data && groupsRes.data.length > 0) {
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

  // 🧠 RE-QUERY CONVERSATION TIMELINE ON CHAT TARGET SWITCH
  useEffect(() => {
    // WhatsApp style panel override: collapse detail deck whenever target room alters
    setShowMembersList(false);
    
    const fetchHistory = async () => {
      if (!activeChatTarget) return;
      try {
        const token = localStorage.getItem('peppy_token');
        const headers = { 
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token 
        };

        const isGroup = activeChatTarget.hasOwnProperty('teamScope');
        const endpoint = isGroup 
          ? `https://peppy-we0g.onrender.com/api/chats/group/history/${activeChatTarget._id}`
          : `https://peppy-we0g.onrender.com/api/chats/history/${activeChatTarget._id}`;

        const res = await axios.get(endpoint, { headers });
        setMessages(res.data || []);
      } catch (err) {
        console.error('❌ Chat thread load breakdown:', err);
      }
    };
    fetchHistory();
  }, [activeChatTarget]);

  // 📡 WEBSOCKET INTERCEPTORS LOGIC
  useEffect(() => {
    socket.on('receive_direct_message', (incomingMessage) => {
      if (activeChatTarget && !activeChatTarget.hasOwnProperty('teamScope')) {
        const incomingSenderId = incomingMessage.sender?._id || incomingMessage.sender;
        if (incomingSenderId === activeChatTarget._id) {
          setMessages(prev => [...prev, incomingMessage]);
        }
      }
    });

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

  // ➕ HANDLER: MANUAL GROUP CREATION
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const token = localStorage.getItem('peppy_token');
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'x-auth-token': token 
      };
      const targetedTeamCategory = user?.role === 'Admin' ? 'Technical Team' : (user?.team || 'Technical Team');

      const res = await axios.post('https://peppy-we0g.onrender.com/api/chats/groups', {
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        teamScope: targetedTeamCategory,
        members: selectedMembers
      }, { headers });

      setChatGroups(prev => [res.data, ...prev]);
      socket.emit('join_chat_groups', [res.data._id]);

      setNewGroupName('');
      setNewGroupDesc('');
      setSelectedMembers([]);
      setIsGroupModalOpen(false);
      alert(`💬 Group "${res.data.name}" deployed successfully!`);
      fetchInitialData(); // Hot reloads internal objects structure arrays mapping
    } catch (err) {
      console.error('❌ Group create endpoint breakdown:', err);
    }
  };

  // 📬 MESSAGE SUBMISSION TRANSMISSION
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeChatTarget) return;

    const currentUserId = user?.id || user?._id;
    if (!currentUserId) return;

    const token = localStorage.getItem('peppy_token');
    const isGroupChat = activeChatTarget.hasOwnProperty('teamScope');
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'x-auth-token': token 
    };

    try {
      if (isGroupChat) {
        const res = await axios.post('https://peppy-we0g.onrender.com/api/chats/group/send', {
          groupId: activeChatTarget._id,
          text: typedMessage.trim()
        }, { headers });

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
        const res = await axios.post('https://peppy-we0g.onrender.com/api/chats/send', 
          { receiverId: activeChatTarget._id, text: typedMessage.trim() },
          { headers }
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
    <div className="flex h-[74vh] w-full bg-[#1e1f21] border border-[#2d2e30] rounded-2xl overflow-hidden shadow-2xl animate-fade-in relative z-10 text-left">
      
      {/* 👥 LEFT COLUMN: DISPATCH PANELS DIRECTORY */}
      <div className="w-80 bg-[#252628]/60 border-r border-[#2d2e30] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#2d2e30]/60 shrink-0 flex justify-between items-center bg-[#1a1b1c]/20">
          <div>
            <h2 className="text-xs font-black tracking-wider text-slate-300 uppercase">Peppy Chat Hub</h2>
            <p className="text-[10px] text-[#848285] font-semibold capitalize">Global Corporate Access Enabled</p>
          </div>
          <button 
            onClick={() => setIsGroupModalOpen(true)} 
            className="bg-red-500 hover:bg-red-600 text-white font-extrabold text-[10px] uppercase px-2 py-1 rounded-md tracking-wider transition shadow-md"
          >
            + Group
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-2 bg-[#17181a]/50 border-b border-[#2d2e30]/40 shrink-0">
          <button onClick={() => { setActiveTab('private'); setActiveChatTarget(null); setMessages([]); }} className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition ${activeTab === 'private' ? 'bg-red-500/10 border border-red-500/30 text-white' : 'text-slate-400 hover:bg-[#2a2b2d]/30'}`}>💬 Private Chats</button>
          <button onClick={() => { setActiveTab('groups'); setActiveChatTarget(null); setMessages([]); }} className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition ${activeTab === 'groups' ? 'bg-red-500/10 border border-red-500/30 text-white' : 'text-slate-400 hover:bg-[#2a2b2d]/30'}`}>📱 WhatsApp Groups</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {activeTab === 'private' ? (
            users.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic p-4 text-center">No workspace employees found.</p>
            ) : (
              users.map((member) => (
                <div 
                  key={member._id} 
                  onClick={() => setActiveChatTarget(member)} 
                  className={`flex items-center gap-3 p-3 rounded-xl transition cursor-pointer border ${activeChatTarget?._id === member._id ? 'bg-red-500/10 border-red-500/40 text-white' : 'bg-transparent border-transparent hover:bg-[#2a2b2d]/50 text-slate-400 hover:text-white'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-500 to-amber-500 flex items-center justify-center font-black text-xs text-white uppercase shadow-md shrink-0">
                    {member.name ? member.name.substring(0, 2) : 'OP'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold truncate text-white">{member.name}</h4>
                    <p className="text-[9px] text-[#848285] font-black truncate uppercase mt-0.5">{member.role} &bull; Dept: {member.team}</p>
                  </div>
                </div>
              ))
            )
          ) : (
            chatGroups.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic p-4 text-center">No active channels synced.</p>
            ) : (
              chatGroups.map((group) => (
                <div 
                  key={group._id} 
                  onClick={() => setActiveChatTarget(group)} 
                  className={`flex items-center gap-3 p-3 rounded-xl transition cursor-pointer border ${activeChatTarget?._id === group._id ? 'bg-purple-500/10 border-purple-500/40 text-white' : 'bg-transparent border-transparent hover:bg-[#2a2b2d]/50 text-slate-400 hover:text-white'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-black text-xs text-white shadow-md shrink-0">👥</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold truncate text-slate-200">{group.name}</h4>
                      <span className="text-[8px] bg-purple-900/40 text-purple-400 border border-purple-500/20 px-1 rounded uppercase font-bold shrink-0">{group.teamScope}</span>
                    </div>
                    <p className="text-[10px] text-[#848285] font-medium truncate mt-0.5">{group.description || 'No broadcast logs.'}</p>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* 💬 MIDDLE COLUMN: ENCRYPTED MESSAGE WINDOW */}
      <div className="flex-1 flex flex-col bg-[#1e1f21] min-w-0 relative">
        {activeChatTarget ? (
          <>
            {/* ⭐ WHATSAPP STANDARD HEADER ACTION BAR: Clicking this bar expands the crew tracking directory side-panel */}
            <div 
              onClick={() => { if (activeChatTarget.hasOwnProperty('teamScope')) { setShowMembersList(!showMembersList); } }}
              className={`px-6 py-4 border-b border-[#2d2e30]/60 bg-[#252628]/30 flex items-center justify-between gap-3 shrink-0 relative z-10 ${activeChatTarget.hasOwnProperty('teamScope') ? 'cursor-pointer hover:bg-[#252628]/40 transition-all duration-150' : ''}`}
              title={activeChatTarget.hasOwnProperty('teamScope') ? "Click here to toggle group information panel" : ""}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black tracking-wide text-white truncate">{activeChatTarget.name}</h3>
                  <p className="text-[9px] text-[#848285] font-bold uppercase tracking-wider truncate">
                    {activeChatTarget.hasOwnProperty('teamScope') 
                      ? `📱 WHATSAPP GROUP (${activeChatTarget.members?.length || 0} Members Connected &bull; Tap here)` 
                      : activeChatTarget.email}
                  </p>
                </div>
              </div>
              
              {activeChatTarget.hasOwnProperty('teamScope') && (
                <div className="text-[10px] text-slate-400 font-bold bg-[#1e1f21] border border-[#2d2e30] px-2.5 py-1 rounded-lg shrink-0 uppercase tracking-wide">
                  {showMembersList ? 'Hide Info ✕' : 'View Info 📋'}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#1a1b1c]/40 relative z-10">
              {messages.map((msg) => {
                const currentUserId = user?.id || user?._id;
                const msgSenderId = msg.sender?._id || msg.sender;
                const isMe = msgSenderId === currentUserId;
                const msgSenderName = msg.sender?.name || 'Operator';
                return (
                  <div key={msg._id} className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
                    {!isMe && activeChatTarget.hasOwnProperty('teamScope') && (
                      <span className="text-[9px] text-purple-400 font-extrabold mb-1 ml-1 uppercase">{msgSenderName}</span>
                    )}
                    <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-xs font-medium shadow-md leading-relaxed ${isMe ? 'bg-red-500 text-white rounded-br-none' : 'bg-[#252628] border border-[#333538] text-slate-200 rounded-bl-none'}`}>
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

            <form onSubmit={handleSendMessage} className="p-4 border-t border-[#2d2e30]/60 bg-[#252628]/80 flex gap-3 shrink-0 relative items-center z-20">
              <input type="text" className="flex-1 bg-[#151617] border border-[#333538] rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition h-11" placeholder={`Type secure message thread to ${activeChatTarget.name}...`} value={typedMessage} onChange={(e) => setTypedMessage(e.target.value)} required />
              <button type="submit" className="bg-red-500 hover:bg-red-600 text-white px-6 h-11 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-2xl cursor-pointer flex items-center justify-center shrink-0">Send 🚀</button>
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

      {/* ⭐ RIGHT SIDE PANEL: WHATSAPP-STYLE CREW MEMBERS INSPECTOR DRAWER */}
      {activeChatTarget && activeChatTarget.hasOwnProperty('teamScope') && showMembersList && (
        <div className="w-64 bg-[#1a1b1c] border-l border-[#2d2e30] flex flex-col shrink-0 animate-fade-in relative z-20">
          <div className="p-4 border-b border-[#2d2e30]/60 bg-[#252628]/20 shrink-0">
            <h4 className="text-[10px] font-black text-red-400 uppercase tracking-wider">Group Info Deck</h4>
            <p className="text-white text-xs font-black mt-1 truncate">{activeChatTarget.name}</p>
          </div>
          
          <div className="p-4 border-b border-[#2d2e30]/40 space-y-1 shrink-0">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Description/Purpose</span>
            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">{activeChatTarget.description || 'No descriptive logs found for this channel.'}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2.5">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              Group Members ({activeChatTarget.members?.length || 0})
            </span>
            
            {activeChatTarget.members && activeChatTarget.members.length > 0 ? (
              activeChatTarget.members.map((memberIdx) => {
                const isCreator = memberIdx._id === activeChatTarget.createdBy;
                return (
                  <div key={memberIdx._id} className="flex items-center gap-2.5 bg-[#252628]/40 p-2 rounded-xl border border-[#2d2e30]/50 hover:border-[#333538] transition duration-150">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 border border-slate-600/30 flex items-center justify-center font-black text-[9px] text-slate-200 uppercase shrink-0 shadow-sm">
                      {memberIdx.name ? memberIdx.name.substring(0, 2) : 'EM'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h5 className="text-[11px] font-black text-slate-200 truncate">{memberIdx.name || 'Team Operator'}</h5>
                        {isCreator && (
                          <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 font-black rounded px-1 uppercase shrink-0 tracking-tighter">Admin</span>
                        )}
                      </div>
                      <p className="text-[9px] text-[#848285] font-bold uppercase tracking-wide truncate mt-0.5">{memberIdx.role || 'Member'} &bull; {memberIdx.team || 'HQ'}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-[10px] text-slate-500 italic text-center p-2">No populated profile records.</p>
            )}
          </div>
        </div>
      )}

      {/* 📱 MANUAL MANIFEST DEPLOY GROUP CHANNEL MODAL POPOUT */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[999] p-4 animate-fade-in">
          <div className="bg-[#1e1f21] border border-[#2d2e30] w-full max-w-md rounded-2xl overflow-hidden p-6 shadow-2xl space-y-4">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Deploy WhatsApp Workspace Group Channel</h3>
              <p className="text-[10px] text-[#848285] mt-0.5">Select members globally across any track role bounds.</p>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-3.5">
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Group Channel Title</label><input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full bg-[#151617] border border-[#333538] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500" placeholder="e.g., UI Sprint Sync Team" required /></div>
              <div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description Note</label><textarea value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} className="w-full bg-[#151617] border border-[#333538] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 h-16 resize-none" placeholder="What is this discussion channel optimized for..." /></div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Select Crew Core Members (Global Active)</label>
                <div className="max-h-28 overflow-y-auto bg-[#151617] border border-[#333538] rounded-xl p-2 space-y-1.5 custom-scrollbar">
                  {users.map(u => (
                    <label key={u._id} className="flex items-center gap-2 px-2 py-1 hover:bg-[#252628] rounded-md cursor-pointer text-xs text-slate-300">
                      <input type="checkbox" checked={selectedMembers.includes(u._id)} onChange={() => handleMemberToggle(u._id)} className="accent-red-500 cursor-pointer" />
                      <span>{u.name} <span className="text-[9px] text-red-400">({u.role})</span></span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsGroupModalOpen(false)} className="px-4 py-2.5 bg-[#252628] hover:bg-[#2d2e30] rounded-xl text-xs font-bold text-slate-400 transition">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-xs font-black text-white uppercase tracking-wide transition shadow-lg">Deploy Group 🚀</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ChatView;