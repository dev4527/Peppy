import { useState, useEffect, useRef, useContext } from 'react';
import api, { API_BASE } from '../utils/api';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';

const socket = io(API_BASE || undefined);

function ChatView() {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('private'); // 'private' or 'groups'
  const [chatGroups, setChatGroups] = useState([]);
  const [activeChatTarget, setActiveChatTarget] = useState(null); 
  const [messages, setMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState('');
  
  // 👥 WHATSAPP SIDE-DRAWER STATE
  const [showMembersList, setShowMembersList] = useState(false);

  // CREATE GROUP STATE
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const messagesEndRef = useRef(null);

  const renderMessageWithLinks = (text) => {
    if (!text) return "";
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-200 underline font-semibold break-all inline-block">
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
      const [usersRes, groupsRes] = await Promise.all([
        api.get('/api/auth/users'),
        api.get('/api/chats/groups')
      ]);

      const currentUserId = user?.id || user?._id;
      const filteredList = (usersRes.data || []).filter(u => u._id !== currentUserId);
      
      setUsers(filteredList);
      setChatGroups(groupsRes.data || []);

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
    setShowMembersList(false); 
    const fetchHistory = async () => {
      if (!activeChatTarget) return;
      try {
        // ⭐ BROAD BYPASS: Checking if it's a group conversation by comparing active Tab type
        const isGroup = activeTab === 'groups';
        const endpoint = isGroup ? `/api/chats/group/history/${activeChatTarget._id}` : `/api/chats/history/${activeChatTarget._id}`;

        const res = await api.get(endpoint);
        setMessages(res.data || []);
      } catch (err) {
        console.error('❌ Chat thread load breakdown:', err);
      }
    };
    fetchHistory();
  }, [activeChatTarget]);

  // 📡 WEBSOCKET INTERCEPTORS
  useEffect(() => {
    socket.on('receive_direct_message', (incomingMessage) => {
      if (activeChatTarget && activeTab === 'private') {
        const incomingSenderId = incomingMessage.sender?._id || incomingMessage.sender;
        if (incomingSenderId === activeChatTarget._id) {
          setMessages(prev => [...prev, incomingMessage]);
        }
      }
    });

    socket.on('receive_group_message', (incomingGroupMsg) => {
      if (activeChatTarget && activeTab === 'groups' && incomingGroupMsg.group === activeChatTarget._id) {
        setMessages(prev => [...prev, incomingGroupMsg]);
      }
    });

    return () => {
      socket.off('receive_direct_message');
      socket.off('receive_group_message');
    };
  }, [activeChatTarget, activeTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    try {
      const targetedTeamCategory = user?.role === 'Admin' ? 'Technical Team' : (user?.team || 'Technical Team');

      const res = await api.post('/api/chats/groups', { name: newGroupName.trim(), description: newGroupDesc.trim(), teamScope: targetedTeamCategory, members: selectedMembers });

      setChatGroups(prev => [res.data, ...prev]);
      socket.emit('join_chat_groups', [res.data._id]);

      setNewGroupName('');
      setNewGroupDesc('');
      setSelectedMembers([]);
      setIsGroupModalOpen(false);
      alert(`💬 Group "${res.data.name}" deployed successfully!`);
      fetchInitialData();
    } catch (err) {
      console.error('❌ Group create endpoint breakdown:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !activeChatTarget) return;

    const currentUserId = user?.id || user?._id;
    if (!currentUserId) return;

    const isGroupChat = activeTab === 'groups';

    try {
      if (isGroupChat) {
        const res = await api.post('/api/chats/group/send', { groupId: activeChatTarget._id, text: typedMessage.trim() });

        socket.emit('send_group_message', { groupId: activeChatTarget._id, senderId: currentUserId, group: activeChatTarget._id, text: typedMessage.trim(), sender: { _id: currentUserId, name: user.name || 'Operator' }, _id: res.data._id, createdAt: res.data.createdAt });

        setMessages(prev => [...prev, res.data]);
      } else {
        const res = await api.post('/api/chats/send', { receiverId: activeChatTarget._id, text: typedMessage.trim() });

        socket.emit('send_direct_message', { senderId: currentUserId, receiverId: activeChatTarget._id, text: typedMessage.trim(), _id: res.data._id, createdAt: res.data.createdAt });

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
    <div className="flex h-[74vh] w-full bg-[#1e1f21] border border-[#2d2e30] rounded-2xl overflow-hidden shadow-2xl animate-fade-in relative z-10 text-left select-none">
      
      {/* 👥 LEFT PANELS NAVIGATION LANE */}
      <div className="w-80 bg-[#252628]/60 border-r border-[#2d2e30] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#2d2e30]/60 shrink-0 flex justify-between items-center bg-[#1a1b1c]/20">
          <div>
            <h2 className="text-xs font-black tracking-wider text-slate-300 uppercase">Peppy Chat Hub</h2>
            <p className="text-[10px] text-[#848285] font-semibold capitalize">Global Channels Desk Active</p>
          </div>
          <button onClick={() => setIsGroupModalOpen(true)} className="bg-red-500 hover:bg-red-600 text-white font-extrabold text-[10px] uppercase px-2 py-1 rounded-md tracking-wider transition shadow-md shrink-0 cursor-pointer">+ Group</button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-2 bg-[#17181a]/50 border-b border-[#2d2e30]/40 shrink-0">
          <button onClick={() => { setActiveTab('private'); setActiveChatTarget(null); setMessages([]); setShowMembersList(false); }} className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition cursor-pointer ${activeTab === 'private' ? 'bg-red-500/10 border border-red-500/30 text-white' : 'text-slate-400 hover:bg-[#2a2b2d]/30'}`}>💬 Private Chats</button>
          <button onClick={() => { setActiveTab('groups'); setActiveChatTarget(null); setMessages([]); setShowMembersList(false); }} className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition cursor-pointer ${activeTab === 'groups' ? 'bg-red-500/10 border border-red-500/30 text-white' : 'text-slate-400 hover:bg-[#2a2b2d]/30'}`}>📱 WhatsApp Groups</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
          {activeTab === 'private' ? (
            users.map((member) => (
              <div key={member._id} onClick={() => { setActiveChatTarget(member); }} className={`flex items-center gap-3 p-3 rounded-xl transition cursor-pointer border ${activeChatTarget?._id === member._id ? 'bg-red-500/10 border-red-500/40 text-white' : 'bg-transparent border-transparent hover:bg-[#2a2b2d]/50 text-slate-400 hover:text-white'}`}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-500 to-amber-500 flex items-center justify-center font-black text-xs text-white uppercase shadow-md shrink-0">{member.name ? member.name.substring(0, 2) : 'OP'}</div>
                <div className="min-w-0"><h4 className="text-xs font-bold truncate text-white">{member.name}</h4><p className="text-[9px] text-[#848285] font-black truncate uppercase mt-0.5">{member.role} &bull; Dept: {member.team}</p></div>
              </div>
            ))
          ) : (
            chatGroups.map((group) => (
              <div key={group._id} onClick={() => { setActiveChatTarget(group); }} className={`flex items-center gap-3 p-3 rounded-xl transition cursor-pointer border ${activeChatTarget?._id === group._id ? 'bg-purple-500/10 border-purple-500/40 text-white' : 'bg-transparent border-transparent hover:bg-[#2a2b2d]/50 text-slate-400 hover:text-white'}`}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-black text-xs text-white shadow-md shrink-0">👥</div>
                <div className="min-w-0 flex-1"><div className="flex justify-between items-center"><h4 className="text-xs font-bold truncate text-slate-200">{group.name}</h4><span className="text-[8px] bg-purple-900/40 text-purple-400 border border-purple-500/20 px-1 rounded uppercase font-bold shrink-0">{group.teamScope || 'Sync'}</span></div><p className="text-[10px] text-[#848285] font-medium truncate mt-0.5">{group.description || 'No broadcast logs.'}</p></div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 💬 MIDDLE ENGINE COLUMN: CONTENT CONTAINER */}
      <div className="flex-1 flex flex-col bg-[#1e1f21] min-w-0 relative">
        {activeChatTarget ? (
          <>
            {/* 📱 WHATSAPP HEADER CHAT DECK */}
            <div className="px-6 py-4 border-b border-[#2d2e30]/60 bg-[#252628]/30 flex items-center justify-between gap-3 shrink-0 relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <div className="min-w-0">
                  <h3 className="text-xs font-black tracking-wide text-white truncate">{activeChatTarget.name}</h3>
                  <p className="text-[9px] text-[#848285] font-bold uppercase tracking-wider truncate">
                    {activeTab === 'groups'
                      ? `📱 WhatsApp Group Connected &bull; ${activeChatTarget.members?.length || 0} Members` 
                      : activeChatTarget.email || `Secure Communication Thread`}
                  </p>
                </div>
              </div>
              
              {/* ⭐ COMPULSORY CONDITION RE-PATCHED: Checking direct Active Tab state trigger to un-hide button completely */}
              {activeTab === 'groups' && (
                <button 
                  type="button"
                  onClick={() => setShowMembersList(!showMembersList)}
                  className="text-[10px] font-black uppercase bg-purple-600 hover:bg-purple-700 text-white border border-purple-500 px-3 py-1.5 rounded-xl transition cursor-pointer shadow-md select-none shrink-0"
                >
                  {showMembersList ? 'Hide Group Members ✕' : 'View Group Members 👥'}
                </button>
              )}
            </div>

            {/* MESSAGES FLOW LAYER */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-[#1a1b1c]/40 relative z-10">
              {messages.length === 0 ? (
                <div className="text-center text-slate-600 dark:text-slate-500 italic text-[11px] pt-12">No corporate logs broadcasted in this space yet.</div>
              ) : (
                messages.map((msg) => {
                  const currentUserId = user?.id || user?._id;
                  const msgSenderId = msg.sender?._id || msg.sender;
                  const isMe = msgSenderId === currentUserId;
                  const msgSenderName = msg.sender?.name || 'Team Member';
                  return (
                    <div key={msg._id} className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}>
                      {!isMe && activeTab === 'groups' && (
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
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* SEND INPUT CONTROL BAR */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[#2d2e30]/60 bg-[#252628]/80 flex gap-3 shrink-0 relative items-center z-20">
              <input type="text" className="flex-1 bg-[#151617] border border-[#333538] rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition h-11" placeholder={`Type secure message thread to ${activeChatTarget.name}...`} value={typedMessage} onChange={(e) => setTypedMessage(e.target.value)} required />
              <button type="submit" className="bg-red-500 hover:bg-red-600 text-white px-6 h-11 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-2xl flex items-center justify-center shrink-0 cursor-pointer">Send 🚀</button>
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

      {/* ⭐ RIGHT SIDE PANEL: EXTENDED MEMBERS REPOSITORY INTERFACE */}
      {activeChatTarget && activeTab === 'groups' && showMembersList && (
        <div className="w-64 bg-[#1a1b1c] border-l border-[#2d2e30] flex flex-col shrink-0 animate-fade-in relative z-20">
          <div className="p-4 border-b border-[#2d2e30]/60 bg-[#252628]/20 shrink-0">
            <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-wider">Group Info Deck</h4>
            <p className="text-white text-xs font-black mt-1 truncate">{activeChatTarget.name}</p>
          </div>
          
          <div className="p-4 border-b border-[#2d2e30]/40 space-y-1 shrink-0">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Description/Purpose</span>
            <p className="text-[11px] text-slate-300 leading-relaxed font-medium">{activeChatTarget.description || 'No descriptive logs found for this channel.'}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2.5">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
              Group Members List ({activeChatTarget.members?.length || 0})
            </span>
            
            {activeChatTarget.members && activeChatTarget.members.length > 0 ? (
              activeChatTarget.members.map((memberIdx) => {
                const isCreator = memberIdx._id === activeChatTarget.createdBy || memberIdx === activeChatTarget.createdBy;
                return (
                  <div key={memberIdx._id || memberIdx} className="flex items-center gap-2.5 bg-[#252628]/40 p-2 rounded-xl border border-[#2d2e30]/50 hover:border-[#333538] transition duration-150">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 border border-slate-600/30 flex items-center justify-center font-black text-[9px] text-slate-200 uppercase shrink-0 shadow-sm">
                      {memberIdx.name ? memberIdx.name.substring(0, 2) : 'EM'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <h5 className="text-[11px] font-black text-slate-200 truncate">{memberIdx.name || 'Team Employee'}</h5>
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
              <p className="text-[10px] text-slate-500 italic text-center p-2">No profiles populated records found.</p>
            )}
          </div>
        </div>
      )}

      {/* RE-USABLE MODAL PANEL GENERATOR */}
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