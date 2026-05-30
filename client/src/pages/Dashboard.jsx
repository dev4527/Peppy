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
  
  // 🎯 ACTIVE SELECTED TASK STATE (Drawer Matrix)
  const [selectedTask, setSelectedTask] = useState(null);

  const columns = ['To Do', 'In Progress', 'Review', 'Completed'];
  const intervalSchedules = ['Daily task', 'Weekly task', 'Monthly task', 'Quarterly task', 'One-time task'];

  // 🌓 THEME SYNCHRONIZATION RUNTIME EFFECT
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('peppy_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // 🔄 FETCH ALL WORKSPACE NOTIFICATIONS
  const fetchMyAlerts = async () => {
    try {
      const token = localStorage.getItem('peppy_token');
      const res = await axios.get('https://peppy-we0g.onrender.com/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to pull system notification matrix:', err);
    }
  };

  // Fetch employees dynamically filtered by the active project's team category
  const fetchInitialGlobalData = async () => {
    const token = localStorage.getItem('peppy_token');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      let membersUrl = 'https://peppy-we0g.onrender.com/api/auth/users';
      if (currentProject?.teamCategory) {
        membersUrl = `https://peppy-we0g.onrender.com/api/auth/users/team/${encodeURIComponent(currentProject.teamCategory)}`;
      }

      const [membersRes, projectsRes] = await Promise.all([
        axios.get(membersUrl, { headers }),
        axios.get('https://peppy-we0g.onrender.com/api/projects', { headers })
      ]);
      
      setTeamMembers(membersRes.data);
      setProjects(projectsRes.data);
    } catch (err) {
      console.error('Core catalog cluster synchronization fail:', err);
    }
  };

  // 🔄 THE REALTIME MASTER DATA STREAM SYNCHRONIZER
  const fetchDashboardTasks = async () => {
    const token = localStorage.getItem('peppy_token');
    try {
      let freshDataDeck = [];
      if (showMyTasks) {
        const res = await axios.get('https://peppy-we0g.onrender.com/api/tasks/my-tasks', { headers: { Authorization: `Bearer ${token}` } });
        freshDataDeck = res.data;
      } else if (currentProject?._id) {
        const res = await axios.get(`https://peppy-we0g.onrender.com/api/tasks/project/${currentProject._id}`, { headers: { Authorization: `Bearer ${token}` } });
        freshDataDeck = res.data;
      } else {
        const res = await axios.get('https://peppy-we0g.onrender.com/api/tasks/my-tasks', { headers: { Authorization: `Bearer ${token}` } });
        freshDataDeck = res.data;
      }
      
      setTasks(freshDataDeck);

      // ✅ STATE CONNECTION LOCK: This keeps the open drawer updated with fresh comments/attachments instantly!
      if (selectedTask) {
        const currentlyInspectedTask = freshDataDeck.find(t => t._id === selectedTask._id);
        if (currentlyInspectedTask) {
          setSelectedTask(currentlyInspectedTask);
        } else {
          // Deep tracking query fallback
          const singleTaskRes = await axios.get(`https://peppy-we0g.onrender.com/api/tasks/${selectedTask._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (singleTaskRes.data) {
            setSelectedTask(singleTaskRes.data);
          }
        }
      }
    } catch (err) {
      console.error('Task dynamic tracking loop load failure:', err);
    }
  };

  // 📡 NOTIFICATION REALTIME HOOKS & HANDSHAKES
  useEffect(() => {
    const currentUserId = user?.id || user?._id;
    if (currentUserId) {
      fetchMyAlerts();
      socket.emit('register_user', currentUserId);

      socket.on('new_notification', (newAlert) => {
        setNotifications(prev => [newAlert, ...prev]);
      });
    }
    return () => { socket.off('new_notification'); };
  }, [user]);

  const handleMarkRead = async (id) => {
    try {
      const token = localStorage.getItem('peppy_token');
      await axios.put(`https://peppy-we0g.onrender.com/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to update alert state:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    fetchInitialGlobalData();
  }, [currentProject]);

  useEffect(() => {
    fetchDashboardTasks();
    if (currentProject?._id && !showMyTasks) {
      socket.emit('join_project', currentProject._id);
    }
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

  const handleCreateTask = async (e) => {
    e.preventDefault();
    const finalProjectID = targetProject || currentProject?._id || (projects.length > 0 ? projects[0]._id : null);
    
    if (!finalProjectID || !title.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('peppy_token');
      await axios.post('https://peppy-we0g.onrender.com/api/tasks', 
        { title, description, priority, project: finalProjectID, dueDate, assignedTo: assignedTo || null, recurrenceType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTitle(''); setDescription(''); setPriority('Medium'); setDueDate(''); setAssignedTo(''); setRecurrenceType('One-time task');
      setShowModal(false);
      fetchDashboardTasks();
    } catch (err) { 
      console.error(err);
    } finally { 
      setLoading(false); 
    }
  };

  const moveTaskStatus = async (taskId, currentStatus) => {
    const statusOrder = ['To Do', 'In Progress', 'Review', 'Completed'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex === statusOrder.length - 1) return;
    const nextStatus = statusOrder[currentIndex + 1];

    setTasks(prevTasks => prevTasks.map(t => t._id === taskId ? { ...t, status: nextStatus } : t));
    try {
      const token = localStorage.getItem('peppy_token');
      await axios.put(`https://peppy-we0g.onrender.com/api/tasks/${taskId}`, { status: nextStatus }, { headers: { Authorization: `Bearer ${token}` } });
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
      
      <Sidebar 
        currentProject={currentProject} setCurrentProject={setCurrentProject} 
        showMyTasks={showMyTasks} setShowMyTasks={setShowMyTasks} 
        viewMode={viewMode} setViewMode={setViewMode}
        theme={theme}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-[#1e1f21] transition-colors duration-300">
        
        <header className="bg-white dark:bg-[#1e1f21] border-b border-slate-200 dark:border-[#2d2e30] px-8 pt-5 pb-1 flex flex-col shrink-0 gap-3 transition-colors duration-300">
          <div className="flex justify-between items-center">
            <div>
              {/* ✅ CORE LAYOUT TITLES UPDATED TO PREMIUM ARCHITECTURE STYLE */}
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {viewMode === 'project_home' ? "🎯 Executive Control Deck" : (viewMode === 'chat_room' ? "💬 Team Operations Room" : (showMyTasks ? "📋 Core Registry Tasks" : (currentProject ? currentProject.name : 'Corporate Control Space')))}
              </h1>
              <p className="text-xs text-slate-500 dark:text-[#848285] mt-0.5 font-medium">
                Operational Framework Track: <span className="text-red-500 dark:text-[#ff4757] font-black uppercase tracking-wider">{currentProject?.teamCategory || 'Global Infrastructure Control'}</span>
              </p>
            </div>
            
            <div className="flex gap-2.5 items-center relative">
              <button 
                onClick={toggleTheme}
                className="bg-slate-100 dark:bg-[#252628] border border-slate-200 dark:border-[#333538] hover:border-slate-300 dark:hover:border-[#45474a] p-2.5 rounded-xl text-slate-700 dark:text-slate-300 transition cursor-pointer text-base shadow-sm"
                title="Toggle UI Theme"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>

              <button 
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="bg-slate-100 dark:bg-[#252628] border border-slate-200 dark:border-[#333538] hover:border-slate-300 dark:hover:border-[#45474a] p-2.5 rounded-xl text-slate-700 dark:text-slate-300 transition cursor-pointer relative shadow-sm"
              >
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
                        <div 
                          key={alert._id} 
                          onClick={() => { handleMarkRead(alert._id); }}
                          className={`p-3.5 transition cursor-pointer flex flex-col gap-1 text-left ${alert.isRead ? 'bg-transparent opacity-40' : 'bg-slate-50 dark:bg-red-500/5 border-l-2 border-red-500'}`}
                        >
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

              <button 
                onClick={() => setShowModal(true)} 
                className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl cursor-pointer shadow-lg transition-all"
              >
                + Add Task
              </button>
              <button onClick={logout} className="bg-slate-100 dark:bg-[#2a2b2d] hover:bg-slate-200 dark:hover:bg-[#36373a] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#3f4144] font-bold text-xs uppercase px-4 py-2.5 rounded-xl cursor-pointer">Exit Space</button>
            </div>
          </div>
          
          {viewMode !== 'project_home' && viewMode !== 'chat_room' && !showMyTasks && currentProject && (
            <div className="flex gap-6 text-xs font-bold mt-1.5 tracking-wide text-slate-500 dark:text-[#a2a0a2]">
              <button onClick={() => setViewMode('board')} className={`pb-3 transition relative cursor-pointer ${viewMode === 'board' ? 'text-slate-900 dark:text-white border-b-2 border-red-500 font-black' : 'hover:text-slate-900 dark:hover:text-white'}`}>🫙 Board View</button>
              <button onClick={() => setViewMode('list')} className={`pb-3 transition relative cursor-pointer ${viewMode === 'list' ? 'text-slate-900 dark:text-white border-b-2 border-red-500 font-black' : 'hover:text-slate-900 dark:hover:text-white'}`}>📑 List View</button>
              <button onClick={() => setViewMode('calendar')} className={`pb-3 transition relative cursor-pointer ${viewMode === 'calendar' ? 'text-slate-900 dark:text-white border-b-2 border-red-500 font-black' : 'hover:text-slate-900 dark:hover:text-white'}`}>📅 Calendar View</button>
              <button onClick={() => setViewMode('analytics')} className={`pb-3 transition relative cursor-pointer ${viewMode === 'analytics' ? 'text-slate-900 dark:text-white border-b-2 border-red-500 font-black' : 'hover:text-slate-900 dark:hover:text-white'}`}>📊 Analytics View</button>
              <button onClick={() => setViewMode('profile')} className={`pb-3 transition relative cursor-pointer ${viewMode === 'profile' ? 'text-slate-900 dark:text-white border-b-2 border-red-500 font-black' : 'hover:text-slate-900 dark:hover:text-white'}`}>👤 My Profile</button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-auto bg-[#f9fafb] dark:bg-[#1e1f21] transition-colors duration-300">
          {viewMode === 'project_home' ? (
            <HomePortal tasks={tasks} projects={projects} setCurrentProject={setCurrentProject} setShowMyTasks={setShowMyTasks} setViewMode={setViewMode} userName={user?.name} theme={theme} />
          ) : viewMode === 'chat_room' ? (
            <div className="p-8"><ChatView theme={theme} /></div>
          ) : showMyTasks ? (
            <div className="p-8 animate-fade-in">
              <div className="w-full bg-white dark:bg-[#252628] border border-slate-200 dark:border-[#333538] rounded-2xl overflow-hidden shadow-xl min-w-[800px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#1e1f21] border-b border-slate-200 dark:border-[#333538] text-xs font-extrabold text-slate-500 dark:text-[#a2a0a2] uppercase tracking-wider">
                      <th className="px-6 py-4 w-1/4">Task Item</th>
                      <th className="px-6 py-4">Interval Schedule</th>
                      <th className="px-6 py-4">Parent Workspace Link</th>
                      <th className="px-6 py-4">Process Phase</th>
                      <th className="px-6 py-4">Priority</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#333538]/40 text-sm bg-white dark:bg-transparent">
                    {tasks.map((task) => (
                      <tr key={task._id} onClick={() => setSelectedTask(task)} className="hover:bg-slate-50 dark:hover:bg-[#333538]/20 transition group cursor-pointer">
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white group-hover:text-red-500 transition">{task.title}</td>
                        <td className="px-6 py-4">{renderRecurrenceChip(task.recurrenceType)}</td>
                        <td className="px-6 py-4"><span className="text-xs bg-red-500/10 text-red-500 dark:text-red-400 font-bold px-2.5 py-1 rounded-md border border-red-500/20">{task.project?.name || "Corporate Base"}</span></td>
                        <td className="px-6 py-4"><span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-1 rounded-full font-semibold">{task.status}</span></td>
                        <td className="px-6 py-4"><span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${task.priority === 'High' ? 'text-red-500 bg-red-500/10' : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'}`}>{task.priority}</span></td>
                        <td className="px-6 py-4 text-right">
                          {task.status !== 'Completed' ? <button onClick={(e) => { e.stopPropagation(); moveTaskStatus(task._id, task.status); }} className="bg-white dark:bg-[#1e1f21] hover:bg-red-500 hover:text-white border border-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg transition">Advance Phase →</button> : <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 italic">Finished ✓</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8">
              {viewMode === 'board' ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 min-w-[1000px] h-full items-start">
                  {columns.map((col) => (
                    <div key={col} className="bg-white dark:bg-[#252628]/60 border border-slate-200 dark:border-[#333538] rounded-2xl p-4 flex flex-col max-h-[75vh] shadow-sm">
                      <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-[#333538]/40 shrink-0">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-[#cbd5e1]">{col}</h3>
                        <span className="bg-slate-100 dark:bg-[#1e1f21] px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-500 dark:text-slate-400">{tasks.filter(t => t.status === col).length}</span>
                      </div>
                      <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar pb-2">
                        {tasks.filter(t => t.status === col).map((task) => (
                          <div key={task._id} onClick={() => setSelectedTask(task)} className="bg-white dark:bg-[#1e1f21] border border-slate-100 dark:border-[#2d2e30] rounded-xl p-4 shadow-sm group hover:border-slate-300 transition cursor-pointer">
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-red-500 transition">{task.title}</h4>
                              <div className="flex flex-col gap-1 items-end shrink-0">
                                <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${task.priority === 'High' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-400'}`}>{task.priority}</span>
                                {renderRecurrenceChip(task.recurrenceType)}
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-[#a2a0a2] line-clamp-2 mb-2">{task.description || 'No instructions context.'}</p>
                            {task.dueDate && <p className="text-[10px] text-red-500 dark:text-red-400/80 font-bold mb-3">📅 Due: {new Date(task.dueDate).toLocaleDateString()}</p>}
                            {col !== 'Completed' && (
                              <button onClick={(e) => { e.stopPropagation(); moveTaskStatus(task._id, task.status); }} className="w-full bg-slate-50 dark:bg-[#2a2b2d] hover:bg-red-500 hover:text-white text-[10px] font-bold uppercase py-1.5 rounded-lg border border-slate-200 transition text-center block">Advance Phase →</button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : viewMode === 'list' ? (
                <div className="w-full bg-white dark:bg-[#252628] border border-slate-200 dark:border-[#333538] rounded-2xl overflow-hidden shadow-xl min-w-[800px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-[#1e1f21] border-b border-slate-200 dark:border-[#333538] text-xs font-extrabold text-slate-500 dark:text-[#a2a0a2] uppercase tracking-wider">
                        <th className="px-6 py-4 w-1/4">Task Title</th>
                        <th>Interval</th>
                        <th>Assignee</th>
                        <th>Status Lane</th>
                        <th>Priority Rank</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#333538]/40 text-sm bg-white dark:bg-transparent">
                      {tasks.map((task) => (
                        <tr key={task._id} onClick={() => setSelectedTask(task)} className="hover:bg-slate-50 dark:hover:bg-[#333538]/20 transition group cursor-pointer">
                          <td className="px-6 py-4 font-bold text-slate-900 dark:text-white group-hover:text-red-500 transition">{task.title}</td>
                          <td>{renderRecurrenceChip(task.recurrenceType)}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-400">{task.assignedTo ? task.assignedTo.name : <span className="text-slate-400 italic">Unassigned</span>}</td>
                          <td className="px-6 py-4"><span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-1 rounded-full font-semibold">{task.status}</span></td>
                          <td className="px-6 py-4"><span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${task.priority === 'High' ? 'text-red-500 bg-red-500/10' : 'text-amber-600 dark:text-amber-400 bg-amber-500/10'}`}>{task.priority}</span></td>
                          <td className="px-6 py-4 text-right">{task.status !== 'Completed' ? <button onClick={(e) => { e.stopPropagation(); moveTaskStatus(task._id, task.status); }} className="bg-white dark:bg-[#1e1f21] hover:bg-red-500 hover:text-white border border-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg transition">Advance Phase →</button> : <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 italic">Finished ✓</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : viewMode === 'calendar' ? (
                <CalendarView tasks={tasks} onSelectTask={(task) => setSelectedTask(task)} theme={theme} />
              ) : viewMode === 'analytics' ? (
                <AnalyticsView tasks={tasks} theme={theme} />
              ) : (
                <ProfileView tasks={tasks} theme={theme} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ✅ CRITICAL BINDING SECURED: Passing the onRefresh callback pipeline so TaskDrawer can alert Dashboard */}
      <TaskDrawer 
        task={selectedTask} 
        onClose={() => setSelectedTask(null)} 
        onRefresh={fetchDashboardTasks} 
      />

      {/* Initialize Card Input Modal Popouts Sheet */}
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
              
              <div>
                <label className="block text-slate-500 dark:text-[#a2a0a2] font-semibold mb-1.5">Assign Task To Employee</label>
                <select className="w-full bg-slate-50 dark:bg-[#252628] border border-slate-200 dark:border-[#333538] rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                  <option value="">-- Select Team Employee --</option>
                  {teamMembers.map((member) => <option key={member._id} value={member._id}>{member.name} ({member.role})</option>)}
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

      <FloatingAI currentProjectId={currentProject?._id} />

    </div>
  );
}

export default Dashboard;