import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import TaskDrawer from '../components/TaskDrawer';
import CalendarView from '../components/CalendarView';
import HomePortal from '../components/HomePortal';
import AnalyticsView from '../components/AnalyticsView'; 
import ProfileView from '../components/ProfileView'; 
import FloatingAI from '../components/FloatingAI'; 
import ChatView from '../components/ChatView'; 

const socket = io('https://peppy-we0g.onrender.com');

function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const [currentProject, setCurrentProject] = useState(null);
  const [showMyTasks, setShowMyTasks] = useState(false); 
  const [viewMode, setViewMode] = useState('project_home'); 
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  
  // 🔔 REAL-TIME NOTIFICATION STATES
  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // 🌓 THEME CONTROL STATE
  const [theme, setTheme] = useState(localStorage.getItem('peppy_theme') || 'dark');

  // Task Input and Recurrence Setup Parameters
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [targetProject, setTargetProject] = useState('');
  const [recurrenceType, setRecurrenceType] = useState('One-time task'); 
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 🚀 PROJECT + WHATSAPP GROUP MERGED ONBOARDING STATES
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedCrewMembers, setSelectedCrewMembers] = useState([]);
  
  // ⭐ CONDITION SWITCH: Toggles WhatsApp Group synchronization optional state
  const [createSyncGroup, setCreateSyncGroup] = useState(false);

  // 🎯 ACTIVE SELECTED TASK STATE (Drawer Matrix)
  const [selectedTask, setSelectedTask] = useState(null);

  const columns = ['To Do', 'In Progress', 'Review', 'Completed'];
  const intervalSchedules = ['Daily task', 'Weekly task', 'Monthly task', 'Quarterly task', 'One-time task'];

  // 🌓 THEME SYNCHRONIZATION RUNTIME EFFECT
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') { root.classList.add('dark'); } else { root.classList.remove('dark'); }
    localStorage.setItem('peppy_theme', theme);
  }, [theme]);

  const toggleTheme = () => { setTheme(prev => (prev === 'dark' ? 'light' : 'dark')); };

  // 🔄 FETCH ALL WORKSPACE NOTIFICATIONS
  const fetchMyAlerts = async () => {
    try {
      const token = localStorage.getItem('peppy_token');
      const headers = { 'Authorization': `Bearer ${token}`, 'x-auth-token': token };
      const res = await axios.get('https://peppy-we0g.onrender.com/api/notifications', { headers });
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to pull system notification matrix:', err);
    }
  };

  // 👑 GLOBAL VISIBILITY ENGINE: Pulls filtered dashboard arrays matching backend security layers
  const fetchInitialGlobalData = async () => {
    const token = localStorage.getItem('peppy_token');
    if (!token) return;

    try {
      const headers = { 'Authorization': `Bearer ${token}`, 'x-auth-token': token };
      const [membersRes, projectsRes] = await Promise.all([
        axios.get('https://peppy-we0g.onrender.com/api/auth/users', { headers }),
        axios.get('https://peppy-we0g.onrender.com/api/projects', { headers })
      ]);
      
      setTeamMembers(membersRes.data || []);
      
      // ⭐ DIRECT STRUCTURAL BIND: Avoid loose client side filters to prevent missing rows
      setProjects(projectsRes.data || []);

    } catch (err) {
      console.error('Core catalog cluster synchronization fail:', err);
    }
  };

  // 🔄 THE REALTIME MASTER DATA STREAM SYNCHRONIZER
  const fetchDashboardTasks = async () => {
    const token = localStorage.getItem('peppy_token');
    if (!token) return;

    try {
      const headers = { 'Authorization': `Bearer ${token}`, 'x-auth-token': token };
      let freshDataDeck = [];

      if (showMyTasks) {
        const res = await axios.get('https://peppy-we0g.onrender.com/api/tasks/my-tasks', { headers });
        freshDataDeck = res.data || [];
      } else if (currentProject?._id) {
        const res = await axios.get(`https://peppy-we0g.onrender.com/api/tasks/project/${currentProject._id}`, { headers });
        freshDataDeck = res.data || [];
      } else {
        const res = await axios.get('https://peppy-we0g.onrender.com/api/tasks/my-tasks', { headers });
        freshDataDeck = res.data || [];
      }
      
      setTasks(freshDataDeck);

      if (selectedTask) {
        const currentlyInspectedTask = freshDataDeck.find(t => t._id === selectedTask._id);
        if (currentlyInspectedTask) {
          setSelectedTask(currentlyInspectedTask);
        } else {
          const singleTaskRes = await axios.get(`https://peppy-we0g.onrender.com/api/tasks/${selectedTask._id}`, { headers });
          if (singleTaskRes.data) { setSelectedTask(singleTaskRes.data); }
        }
      }
    } catch (err) {
      console.error('Task dynamic tracking loop load failure:', err);
    }
  };

  // 📡 NOTIFICATION REALTIME HOOKS
  useEffect(() => {
    const currentUserId = user?.id || user?._id;
    if (currentUserId) {
      fetchMyAlerts();
      socket.emit('register_user', currentUserId);
      socket.on('new_notification', (newAlert) => { setNotifications(prev => [newAlert, ...prev]); });
    }
    return () => { socket.off('new_notification'); };
  }, [user]);

  const handleMarkRead = async (id) => {
    try {
      const token = localStorage.getItem('peppy_token');
      const headers = { 'Authorization': `Bearer ${token}`, 'x-auth-token': token };
      await axios.put(`https://peppy-we0g.onrender.com/api/notifications/${id}/read`, {}, { headers });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to update alert state:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => { if (user) { fetchInitialGlobalData(); } }, [currentProject, user, viewMode]);

  useEffect(() => {
    fetchDashboardTasks();
    if (currentProject?._id && !showMyTasks) { socket.emit('join_project', currentProject._id); }
  }, [currentProject, showMyTasks, viewMode]);

  useEffect(() => {
    socket.on('task_changed', () => { fetchDashboardTasks(); });
    return () => { socket.off('task_changed'); };
  }, [currentProject, showMyTasks, viewMode, selectedTask]);

  useEffect(() => {
    if (currentProject?._id) {
      setTargetProject(currentProject._id);
    } else if (projects.length > 0) {
      setTargetProject(projects[0]._id);
    }
  }, [currentProject, projects, showModal]);

  // 📝 DEPLOY TASK COMPONENT ACTION ENGINE
  const handleCreateTask = async (e) => {
    e.preventDefault();
    const finalProjectID = targetProject || currentProject?._id || (projects.length > 0 ? projects[0]._id : null);
    
    if (!finalProjectID || !title.trim()) {
      alert("Please designate a valid tracking workspace target board project.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('peppy_token');
      const headers = { 'Authorization': `Bearer ${token}`, 'x-auth-token': token };

      await axios.post('https://peppy-we0g.onrender.com/api/tasks', 
        { title, description, priority, project: finalProjectID, dueDate, assignedTo: assignedTo || null, recurrenceType },
        { headers }
      );
      setTitle(''); setDescription(''); setPriority('Medium'); setDueDate(''); setAssignedTo(''); setRecurrenceType('One-time task');
      setShowModal(false);
      fetchDashboardTasks();
      alert("📋 Task card successfully deployed into work lanes board!");
    } catch (err) { 
      console.error(err);
      alert(err.response?.data?.message || "Failed to deploy new task item card.");
    } finally { setLoading(false); }
  };

  // 🚀 PROJECT + WHATSAPP GROUPS TWIN DISPATCH LAYER
  const handleOnboardProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('peppy_token');
      const headers = { 'Authorization': `Bearer ${token}`, 'x-auth-token': token };
      
      const targetedTeamCategory = user?.role === 'Admin' ? 'Technical Team' : (user?.team || 'Technical Team');
      const currentUserId = user?.id || user?._id || localStorage.getItem('peppy_userId');

      // 1. Post project card layout setup
      const projectResponse = await axios.post('https://peppy-we0g.onrender.com/api/projects', {
        name: newProjectName.trim(),
        teamCategory: targetedTeamCategory
      }, { headers });

      // Condition deployment checks
      if (createSyncGroup) {
        let finalGroupMembers = [...selectedCrewMembers];
        
        if (currentUserId && !finalGroupMembers.includes(String(currentUserId))) {
          finalGroupMembers.push(String(currentUserId));
        }

        await axios.post('https://peppy-we0g.onrender.com/api/chats/groups', {
          name: `${newProjectName.trim()} Sync Group`,
          description: `Official communications broadcast deck for ${newProjectName.trim()} sprint roadmap.`,
          members: finalGroupMembers, 
          teamScope: targetedTeamCategory,
          project: projectResponse.data?._id || null
        }, { headers });

        alert(`🚀 Project Board and matching WhatsApp Channel deployed together successfully!`);
      } else {
        alert(`🚀 Project Board "${newProjectName.trim()}" successfully initialized! (Sync Group skipped)`);
      }
      
      setNewProjectName('');
      setSelectedCrewMembers([]);
      setCreateSyncGroup(false);
      setShowProjectModal(false);
      fetchInitialGlobalData();
    } catch (err) {
      console.error('❌ Project onboarding suite failure:', err);
      alert(err.response?.data?.message || 'Failed to execute continuous integration onboarding sequence.');
    } finally { setLoading(false); }
  };

  const handleCrewToggle = (id) => {
    setSelectedCrewMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const moveTaskStatus = async (taskId, currentStatus) => {
    const statusOrder = ['To Do', 'In Progress', 'Review', 'Completed'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex === statusOrder.length - 1) return;
    const nextStatus = statusOrder[currentIndex + 1];

    setTasks(prevTasks => prevTasks.map(t => t._id === taskId ? { ...t, status: nextStatus } : t));
    try {
      const token = localStorage.getItem('peppy_token');
      const headers = { 'Authorization': `Bearer ${token}`, 'x-auth-token': token };
      await axios.put(`https://peppy-we0g.onrender.com/api/tasks/${taskId}`, { status: nextStatus }, { headers });
      fetchDashboardTasks();
    } catch (err) { console.error(err); fetchDashboardTasks(); }
  };

  const renderRecurrenceChip = (type) => {
    const baselineStyle = "text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider border ";
    switch (type) {
      case 'Daily task': return <span className={baselineStyle + "bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20"}>🔁 Daily</span>;
      case 'Weekly task': return <span className={baselineStyle + "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"}>📅 Weekly</span>;
      case 'Monthly task': return <span className={baselineStyle + "bg-purple-500/10 text-purple-400 border-purple-500/20"}>🦅 Monthly</span>;
      case 'Quarterly task': return <span className={baselineStyle + "bg-amber-500/10 text-amber-400 border-amber-500/20"}>💎 Quarterly</span>;
      default: return <span className={baselineStyle + "bg-slate-200 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600/30"}>⚡ One-time</span>;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#f3f4f6] dark:bg-[#151617] text-slate-900 dark:text-white overflow-hidden relative font-sans antialiased select-none transition-colors duration-300">
      
      {/* ⭐ DYNAMIC PROPS INJECTED: Passing core project array state directly into sidebar lane */}
      <Sidebar 
        currentProject={currentProject} setCurrentProject={setCurrentProject} 
        showMyTasks={showMyTasks} setShowMyTasks={setShowMyTasks} 
        viewMode={viewMode} setViewMode={setViewMode}
        theme={theme}
        setShowProjectModal={setShowProjectModal}
        projects={projects}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-[#1e1f21] transition-colors duration-300">
        
        <header className="bg-white dark:bg-[#1e1f21] border-b border-slate-200 dark:border-[#2d2e30] px-8 pt-5 pb-1 flex flex-col shrink-0 gap-3 transition-colors duration-300">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {viewMode === 'project_home' ? "🎯 Executive Control Deck" : (viewMode === 'chat_room' ? "💬 Team Operations Room" : (showMyTasks ? "📋 Core Registry Tasks" : (currentProject ? currentProject.name : 'Corporate Control Space')))}
              </h1>
              <p className="text-xs text-slate-500 dark:text-[#848285] mt-0.5 font-medium">
                Operational Framework Track: <span className="text-red-500 dark:text-[#ff4757] font-black uppercase tracking-wider">{user?.role === 'Manager' ? user.team : (user?.role === 'Admin' ? 'Global Command Hub' : (currentProject?.teamCategory || 'Global Infrastructure Control'))}</span>
              </p>
            </div>
            
            <div className="flex gap-2.5 items-center relative">
              <button onClick={toggleTheme} className="bg-slate-100 dark:bg-[#252628] border border-slate-200 dark:border-[#333538] hover:border-slate-300 dark:hover:border-[#45474a] p-2.5 rounded-xl text-slate-700 dark:text-slate-300 transition cursor-pointer text-base shadow-sm" title="Toggle UI Theme">
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>

              <button onClick={() => setIsNotificationOpen(!isNotificationOpen)} className="bg-slate-100 dark:bg-[#252628] border border-slate-200 dark:border-[#333538] hover:border-slate-300 dark:hover:border-[#45474a] p-2.5 rounded-xl text-slate-700 dark:text-slate-300 transition cursor-pointer relative shadow-sm">
                <span className="text-base">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black rounded-full text-[9px] w-4 h-4 flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationOpen && (
                <div className="absolute right-[190px] top-12 w-80 bg-white dark:bg-[#151617] border border-slate-200 dark:border-[#2d2e30] rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="p-4 bg-slate-50 dark:bg-[#1e1f21] border-b border-slate-200 dark:border-[#2d2e30] flex justify-between items-center">
                    <h4 className="font-black text-[10px] tracking-wider uppercase text-slate-500 dark:text-slate-300">NOTIFICATIONS</h4>
                    {unreadCount > 0 && <span className="text-[9px] font-bold text-red-500 dark:text-red-400 uppercase bg-red-500/10 px-2 py-0.5 rounded border border-red-500/10">{unreadCount} New</span>}
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-[#2d2e30]/40 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 dark:text-slate-500 italic text-[11px]">No activity notifications yet.</div>
                    ) : (
                      notifications.map((alert) => (
                        <div key={alert._id} onClick={() => { handleMarkRead(alert._id); }} className={`p-3.5 transition cursor-pointer flex flex-col gap-1 text-left ${alert.isRead ? 'bg-transparent opacity-40' : 'bg-slate-50 dark:bg-red-500/5 border-l-2 border-red-500'}`}>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900 dark:text-white text-[11px]">{alert.title}</span>
                            <span className="text-[8px] text-slate-400 dark:text-slate-500 font-medium">{new Date(alert.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <p className="text-slate-600 dark:text-[#a2a0a2] text-[10px] leading-relaxed">{alert.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {(user?.role === 'Admin' || user?.role === 'Manager') && (
                <button onClick={() => setShowProjectModal(true)} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer shadow-md transition-all active:scale-[0.98]">
                  🚀 Onboard Project
                </button>
              )}

              <button onClick={() => setShowModal(true)} className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer shadow-lg transition-all">
                + Add Task
              </button>
              <button onClick={logout} className="bg-slate-100 dark:bg-[#2a2b2d] hover:bg-slate-200 dark:hover:bg-[#36373a] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#3f4144] font-bold text-xs uppercase px-4 py-2.5 rounded-xl cursor-pointer">Exit Space</button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-[#f9fafb] dark:bg-[#1e1f21] transition-colors duration-300">
          {viewMode === 'project_home' ? (
            <HomePortal tasks={tasks} projects={projects} setCurrentProject={setCurrentProject} setShowMyTasks={setShowMyTasks} setViewMode={setViewMode} userName={user?.name} theme={theme} />
          ) : viewMode === 'chat_room' ? (
            <div className="p-8"><ChatView theme={theme} /></div>
          ) : viewMode === 'calendar' ? (
            <div className="p-8"><CalendarView tasks={tasks} onSelectTask={setSelectedTask} /></div>
          ) : viewMode === 'analytics' ? (
            <div className="p-8"><AnalyticsView tasks={tasks} /></div>
          ) : viewMode === 'profile' ? (
            <div className="p-8"><ProfileView tasks={tasks} /></div>
          ) : (
            <div className="p-8"></div>
          )}
        </div>
      </div>

      <TaskDrawer task={selectedTask} onClose={() => setSelectedTask(null)} onRefresh={fetchDashboardTasks} />

      {/* CREATE TASK CARD INITIALIZER MODAL POPUP */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-[#1e1f21] w-full max-w-md p-6 rounded-2xl border border-slate-200 dark:border-[#333538] shadow-2xl text-left">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Initialize Task Card</h2>
            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 dark:text-[#a2a0a2] font-semibold mb-1.5">Task Title</label>
                <input type="text" className="w-full bg-slate-50 dark:bg-[#252628] border border-slate-200 dark:border-[#333538] rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-red-500" placeholder="Identify target task action item..." value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div>
                <label className="block text-slate-500 dark:text-[#a2a0a2] font-semibold mb-1.5">Task Frequency Cadence</label>
                <select className="w-full bg-slate-50 dark:bg-[#252628] border border-slate-200 dark:border-[#333538] rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none cursor-pointer" value={recurrenceType} onChange={(e) => setRecurrenceType(e.target.value)}>
                  {intervalSchedules.map((schedule) => (<option key={schedule} value={schedule}>{schedule}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-slate-500 dark:text-[#a2a0a2] font-semibold mb-1.5">Target Workspace Project</label>
                <select className="w-full bg-slate-50 dark:bg-[#252628] border border-slate-200 dark:border-[#333538] rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none cursor-pointer" value={targetProject} onChange={(e) => setTargetProject(e.target.value)}>
                  {projects.map((proj) => (<option key={proj._id} value={proj._id}>{proj.name} ({proj.teamCategory || 'Base'})</option>))}
                </select>
              </div>
              <div>
                <label className="block text-slate-500 dark:text-[#a2a0a2] font-semibold mb-1.5">Description Context</label>
                <textarea rows="2" className="w-full bg-slate-50 dark:bg-[#252628] border border-slate-200 dark:border-[#333538] rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-red-500 resize-none" placeholder="Specify descriptive guidelines..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              
              {/* 👥 FIXED ASSIGNEE CONTROL CHIP */}
              <div>
                <label className="block text-slate-500 dark:text-[#a2a0a2] font-semibold mb-1.5">Assign Task To Employee</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-[#252628] border border-slate-200 dark:border-[#333538] rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none cursor-pointer text-xs" 
                  value={assignedTo} 
                  onChange={(e) => setAssignedTo(e.target.value)}
                >
                  <option value="">-- Select Team Employee --</option>
                  
                  {/* ⭐ STABLE SHORTCUT FALLBACK VECTOR */}
                  <option value={user?.id || user?._id || ""} className="text-emerald-500 font-bold bg-emerald-500/10">
                    🙋‍♂️ Assign to Me ({user?.name || 'Myself'})
                  </option>
                  
                  <option disabled className="text-slate-400">────────────────────</option>
                  
                  {teamMembers.map((member) => (
                    <option key={member._id} value={member._id}>{member.name} ({member.role} &bull; {member.team})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 dark:text-[#a2a0a2] font-semibold mb-1.5">Priority Rank</label>
                  <select className="w-full bg-slate-50 dark:bg-[#252628] border border-slate-200 dark:border-[#333538] rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option></select>
                </div>
                <div>
                  <label className="block text-slate-500 dark:text-[#a2a0a2] font-semibold mb-1.5">Due Date</label>
                  <input type="date" className="w-full bg-slate-50 dark:bg-[#252628] border border-slate-200 dark:border-[#333538] rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none cursor-pointer" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition disabled:opacity-50 cursor-pointer">{loading ? 'Deploying...' : 'Deploy Card'}</button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-2.5 rounded-xl transition cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 PROJECT ONBOARDING MODAL POPOUT */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1e1f21] border border-[#2d2e30] w-full max-w-md p-6 rounded-2xl shadow-2xl text-left">
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider">🚀 Initialize Team Project Board</h2>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Assign To Corporate Domain Team Branch: <span className="text-red-500 font-bold uppercase">{user?.role === 'Admin' ? 'Global Command Hub' : user?.team}</span>
              </p>
            </div>
            
            <form onSubmit={handleOnboardProject} className="space-y-4 text-xs mt-4">
              <div>
                <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Project Name</label>
                <input type="text" className="w-full bg-[#151617] border border-[#333538] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500 text-xs" placeholder="e.g., Q3 Operational Roadmap" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} required />
              </div>

              <div className="bg-[#151617]/50 border border-[#2d2e30] p-3 rounded-xl flex items-center justify-between">
                <div>
                  <label className="block text-emerald-400 font-bold uppercase tracking-wider mb-0.5">📱 Sync Group Channel Title</label>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Auto-generated Channel: <span className="text-white font-semibold italic">"{newProjectName ? newProjectName.trim() : 'Project'} Sync Group"</span>
                  </p>
                </div>
                <div className="flex items-center">
                  <input type="checkbox" id="sync-group-toggle" checked={createSyncGroup} onChange={(e) => setCreateSyncGroup(e.target.checked)} className="w-4 h-4 accent-emerald-500 cursor-pointer rounded" />
                  <label htmlFor="sync-group-toggle" className="ml-2 text-[10px] font-bold text-slate-300 uppercase tracking-wide cursor-pointer">Sync Group</label>
                </div>
              </div>

              {createSyncGroup && (
                <div className="space-y-2 animate-fade-in">
                  <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1">Select Crew Core Members for WhatsApp sync channel</label>
                  <div className="max-h-44 overflow-y-auto bg-[#151617] border border-[#333538] rounded-xl p-2.5 space-y-2 custom-scrollbar">
                    {teamMembers.map(u => (
                      <label key={u._id} className="flex items-center gap-3 px-3 py-2 hover:bg-[#252628] rounded-xl cursor-pointer text-slate-300 transition border border-transparent hover:border-[#333538]">
                        <input type="checkbox" checked={selectedCrewMembers.includes(u._id)} onChange={() => handleCrewToggle(u._id)} className="accent-red-500 cursor-pointer h-4 w-4 rounded border-[#333338]" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-xs text-white truncate">{u.name}</span>
                          <span className="text-[9px] text-red-400 uppercase font-black tracking-wider mt-0.5">Designation: {u.role} &bull; Team: {u.team || 'Global'}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-wider py-2.5 rounded-xl transition disabled:opacity-50 cursor-pointer shadow-lg shadow-red-500/10">{loading ? 'Deploying...' : 'Build Space 🚀'}</button>
                <button type="button" onClick={() => { setShowProjectModal(false); setCreateSyncGroup(false); }} className="flex-1 bg-[#252628] hover:bg-[#2d2e30] text-slate-400 font-bold py-2.5 rounded-xl transition cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <FloatingAI currentProjectId={currentProject?._id} />

    </div>
  );
}

export default Dashboard;