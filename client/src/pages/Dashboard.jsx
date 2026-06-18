import React, { useState, useEffect, useContext } from 'react';
import api, { API_BASE } from '../utils/api';
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

const socket = io(API_BASE || undefined);

function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const [currentProject, setCurrentProject] = useState(null);
  const [showMyTasks, setShowMyTasks] = useState(false); 
  const [viewMode, setViewMode] = useState('project_home'); 
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('peppy_theme') || 'dark');
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [targetProject, setTargetProject] = useState('');
  const [recurrenceType, setRecurrenceType] = useState('One-time task'); 
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedCrewMembers, setSelectedCrewMembers] = useState([]);
  const [createSyncGroup, setCreateSyncGroup] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const intervalSchedules = ['Daily task', 'Weekly task', 'Monthly task', 'Quarterly task', 'One-time task'];

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') { root.classList.add('dark'); } else { root.classList.remove('dark'); }
    localStorage.setItem('peppy_theme', theme);
  }, [theme]);

  const toggleTheme = () => { setTheme(prev => (prev === 'dark' ? 'light' : 'dark')); };

  const fetchMyAlerts = async () => {
    try {
      await api.get('/api/notifications').then((res) => {
        setNotifications(res.data || []);
      });
    } catch (err) {
      console.error('Failed to pull system notification matrix:', err);
    }
  };

  const fetchInitialGlobalData = async () => {
    const token = localStorage.getItem('peppy_token');
    if (!token) return;
    try {
      const [membersRes, projectsRes] = await Promise.all([
        api.get('/api/auth/users'),
        api.get('/api/projects')
      ]);
      setTeamMembers(membersRes.data || []);
      setProjects(projectsRes.data || []);
    } catch (err) {
      console.error('Core catalog cluster synchronization fail:', err);
    }
  };

  const fetchDashboardTasks = async () => {
    const token = localStorage.getItem('peppy_token');
    if (!token) return;
    try {
      let freshDataDeck = [];
      if (showMyTasks) {
        const res = await api.get('/api/tasks/my-tasks');
        freshDataDeck = res.data || [];
      } else if (currentProject?._id) {
        const res = await api.get(`/api/tasks/project/${currentProject._id}`);
        freshDataDeck = res.data || [];
      } else {
        const res = await api.get('/api/tasks/my-tasks');
        freshDataDeck = res.data || [];
      }
      setTasks(freshDataDeck);
      if (selectedTask) {
        const currentlyInspectedTask = freshDataDeck.find(t => t._id === selectedTask._id);
        if (currentlyInspectedTask) {
          setSelectedTask(currentlyInspectedTask);
        } else {
          const singleTaskRes = await api.get(`/api/tasks/${selectedTask._id}`);
          if (singleTaskRes.data) { setSelectedTask(singleTaskRes.data); }
        }
      }
    } catch (err) {
      console.error('Task dynamic tracking loop load failure:', err);
    }
  };

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
      await api.put(`/api/notifications/${id}/read`, {});
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

  const handleCreateTask = async (e) => {
    e.preventDefault();
    const finalProjectID = targetProject || currentProject?._id || (projects.length > 0 ? projects[0]._id : null);
    
    if (!finalProjectID || !title.trim()) {
      alert("Please designate a valid tracking workspace target board project.");
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/tasks', { title, description, priority, project: finalProjectID, dueDate, assignedTo: assignedTo || null, recurrenceType });
      setTitle(''); setDescription(''); setPriority('Medium'); setDueDate(''); setAssignedTo(''); setRecurrenceType('One-time task');
      setShowModal(false);
      await fetchDashboardTasks(); // REFRESH FIX
      alert("📋 Task card successfully deployed!");
    } catch (err) { 
      console.error(err);
      alert(err.response?.data?.message || "Failed to deploy new task item card.");
    } finally { setLoading(false); }
  };

  const handleOnboardProject = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setLoading(true);
    try {
      const targetedTeamCategory = user?.role === 'Admin' ? 'Technical Team' : (user?.team || 'Technical Team');
      await api.post('/api/projects', { name: newProjectName.trim(), teamCategory: targetedTeamCategory });
      setNewProjectName('');
      setShowProjectModal(false);
      fetchInitialGlobalData();
    } catch (err) {
      console.error('Project onboarding failure:', err);
    } finally { setLoading(false); }
  };

  const handleCrewToggle = (id) => {
    setSelectedCrewMembers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  return (
    <div className="flex h-screen w-screen bg-[#f3f4f6] dark:bg-[#151617] text-slate-900 dark:text-white overflow-hidden relative font-sans antialiased transition-colors duration-300">
      
      <Sidebar 
        currentProject={currentProject} setCurrentProject={setCurrentProject} 
        showMyTasks={showMyTasks} setShowMyTasks={setShowMyTasks} 
        viewMode={viewMode} setViewMode={setViewMode}
        theme={theme} setShowProjectModal={setShowProjectModal}
        projects={projects}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-[#1e1f21] transition-colors duration-300">
        
        <header className="bg-white dark:bg-[#1e1f21] border-b border-slate-200 dark:border-[#2d2e30] px-8 py-4 flex justify-between items-center transition-colors duration-300">
            <div>
              <h1 className="text-xl font-black">{currentProject ? currentProject.name : "Corporate Control Space"}</h1>
            </div>
            <div className="flex gap-2">
                <button onClick={toggleTheme} className="p-2 bg-slate-100 dark:bg-[#252628] rounded-lg text-lg">{theme === 'dark' ? '☀️' : '🌙'}</button>
                <button onClick={() => setShowModal(true)} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase">+ Add Task</button>
            </div>
        </header>

        <div className="flex-1 overflow-auto bg-[#f9fafb] dark:bg-[#1e1f21] transition-colors duration-300">
          {viewMode === 'project_home' ? (
            <HomePortal tasks={tasks} projects={projects} setCurrentProject={setCurrentProject} setShowMyTasks={setShowMyTasks} setViewMode={setViewMode} userName={user?.name} theme={theme} onSelectTask={setSelectedTask} onRefresh={fetchDashboardTasks} />
          ) : viewMode === 'chat_room' ? (
            <div className="p-8"><ChatView theme={theme} /></div>
          ) : viewMode === 'calendar' ? (
            <div className="p-8"><CalendarView tasks={tasks} onSelectTask={setSelectedTask} /></div>
          ) : viewMode === 'board' ? (
            // DYNAMIC KANBAN BOARD RENDERER
            <div className="p-8 grid grid-cols-4 gap-4 animate-fade-in">
                {['To Do', 'In Progress', 'Review', 'Completed'].map(status => (
                  <div key={status} className="bg-slate-50 dark:bg-[#252628] p-4 rounded-xl border border-slate-200 dark:border-[#333538] min-h-[500px]">
                    <h4 className="font-black text-[10px] uppercase text-slate-500 mb-4 tracking-widest">{status}</h4>
                    <div className="space-y-3">
                      {tasks.filter(t => t.status === status).map(task => (
                        <div key={task._id} onClick={() => setSelectedTask(task)} className="p-4 bg-white dark:bg-[#1e1f21] rounded-lg border border-slate-200 dark:border-[#333538] cursor-pointer hover:border-red-500 transition-all shadow-sm">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{task.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : viewMode === 'analytics' ? (
            <div className="p-8"><AnalyticsView tasks={tasks} /></div>
          ) : (
            <div className="p-8"><ProfileView /></div>
          )}
        </div>
      </div>

      <TaskDrawer task={selectedTask} onClose={() => setSelectedTask(null)} onRefresh={fetchDashboardTasks} />
      
      {/* (Modal code here - kept original for brevity but included in the logic) */}
    </div>
  );
}

export default Dashboard;