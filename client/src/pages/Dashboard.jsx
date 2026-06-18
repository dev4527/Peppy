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
  const [selectedTask, setSelectedTask] = useState(null);

  // Fetch Tasks with auto-refresh logic
  const fetchDashboardTasks = async () => {
    try {
      const url = showMyTasks ? '/api/tasks/my-tasks' : (currentProject ? `/api/tasks/project/${currentProject._id}` : '/api/tasks/my-tasks');
      const res = await api.get(url);
      setTasks(res.data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchDashboardTasks(); }, [currentProject, showMyTasks]);

  return (
    <div className="flex h-screen w-screen bg-[#f3f4f6] dark:bg-[#151617] text-slate-900 dark:text-white font-sans transition-colors duration-300">
      <Sidebar 
        currentProject={currentProject} setCurrentProject={setCurrentProject} 
        viewMode={viewMode} setViewMode={setViewMode}
        setShowProjectModal={setShowProjectModal} projects={projects}
        showMyTasks={showMyTasks} setShowMyTasks={setShowMyTasks} theme={theme}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-[#1e1f21]">
        {/* Header with Title and Global Actions */}
        <header className="bg-white dark:bg-[#1e1f21] border-b border-slate-200 dark:border-[#2d2e30] px-8 py-4 flex justify-between items-center">
            <h1 className="text-xl font-black">{currentProject ? currentProject.name : "Corporate Control Space"}</h1>
            <div className="flex gap-2">
                <button onClick={() => setShowModal(true)} className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase">+ Add Task</button>
            </div>
        </header>

        {/* Main Content View with Filter Buttons */}
        <main className="flex-1 overflow-auto p-8 bg-[#f9fafb] dark:bg-[#151617]">
          
          {/* Advanced Filter Phase Buttons (Ye wapas aa gaye!) */}
          <div className="flex gap-2 mb-6">
            {['All', 'To Do', 'In Progress', 'Review', 'Completed'].map(filter => (
              <button 
                key={filter}
                onClick={() => setViewMode(filter.toLowerCase().replace(' ', '_'))}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border transition-all ${viewMode === filter.toLowerCase().replace(' ', '_') ? 'bg-red-500 text-white border-red-500' : 'bg-white dark:bg-[#252628] border-slate-200 dark:border-[#333538]'}`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Dynamic Content Renderer */}
          {viewMode === 'project_home' ? (
            <HomePortal tasks={tasks} projects={projects} setCurrentProject={setCurrentProject} setViewMode={setViewMode} onSelectTask={setSelectedTask} onRefresh={fetchDashboardTasks} />
          ) : (
            <div className="space-y-3">
              {tasks.filter(t => viewMode === 'all' || t.status === filterMap(viewMode)).map(task => (
                <div key={task._id} onClick={() => setSelectedTask(task)} className="p-4 bg-white dark:bg-[#1e1f21] border border-slate-200 dark:border-[#333538] rounded-lg cursor-pointer hover:border-red-500">
                  <p className="font-bold text-sm">{task.title}</p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      <TaskDrawer task={selectedTask} onClose={() => setSelectedTask(null)} onRefresh={fetchDashboardTasks} />
    </div>
  );
}

// Helper to map filters
const filterMap = (view) => ({'to_do': 'To Do', 'in_progress': 'In Progress', 'review': 'Review', 'completed': 'Completed'}[view]);

export default Dashboard;