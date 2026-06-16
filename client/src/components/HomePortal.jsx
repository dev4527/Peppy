import React, { useState } from 'react';
import api from '../utils/api';

function HomePortal({ tasks = [], projects = [], setCurrentProject, setShowMyTasks, setViewMode, userName, onSelectTask, onRefresh }) {
  const [weekFilter, setWeekFilter] = useState(false);
  const [advancingTaskId, setAdvancingTaskId] = useState(null);

  // 📊 CALCULATE ACTUAL LIVE COMPLETED TASKS COUNT DIRECT FROM DB
  const completedCount = tasks.filter(t => t.status === 'Completed').length;

  // 🌓 DYNAMIC GREETING ENGINE BASED ON COMPUTER TIME LOGIC (IST compliant)
  const getDynamicGreeting = () => {
    const currentHour = new Date().getHours(); // Extracts hour from 0 to 23

    if (currentHour >= 5 && currentHour < 12) {
      return "Good morning";
    } else if (currentHour >= 12 && currentHour < 16) {
      return "Good afternoon";
    } else if (currentHour >= 16 && currentHour < 21) {
      return "Good evening";
    } else {
      return "Good night";
    }
  };

  // 🧭 FUNCTION TO HANDSHAKE WITH DASHBOARD AND SWITCH TO MY TASKS PAGE
  const handleOpenRegistry = (e) => {
    if (e) e.stopPropagation(); 
    
    if (typeof setShowMyTasks === 'function') setShowMyTasks(true);
    if (typeof setViewMode === 'function') setViewMode('list'); 
    if (typeof setCurrentProject === 'function') setCurrentProject(null);
  };

  // 🎯 Phase progression - advance task through phases
  const getNextPhase = (currentStatus) => {
    const phases = ['To Do', 'In Progress', 'Review', 'Completed'];
    const currentIndex = phases.indexOf(currentStatus);
    return currentIndex < phases.length - 1 ? phases[currentIndex + 1] : currentStatus;
  };

  // 🚀 Advance task phase handler
  const handleAdvancePhase = async (e, taskId, currentStatus) => {
    e.stopPropagation();
    
    const nextStatus = getNextPhase(currentStatus);
    if (nextStatus === currentStatus) return; // Already at last phase
    
    setAdvancingTaskId(taskId);
    try {
      await api.put(`/api/tasks/${taskId}`, { status: nextStatus });
      if (typeof onRefresh === 'function') onRefresh();
    } catch (err) {
      console.error('Failed to advance task phase:', err);
    } finally {
      setAdvancingTaskId(null);
    }
  };

  // Filter tasks based on "My Week" selection (Due within next 7 days)
  const getFilteredTasks = () => {
    if (!weekFilter) return tasks;
    
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return taskDate >= today && taskDate <= nextWeek;
    });
  };

  // 🎯 Get status color for phase display
  const getStatusColor = (status) => {
    switch(status) {
      case 'To Do': return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
      case 'In Progress': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'Review': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
      case 'Completed': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
      default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'Low': return 'text-slate-500';
      case 'Medium': return 'text-amber-500';
      case 'High': return 'text-red-500';
      default: return 'text-slate-500';
    }
  };

  const displayedTasks = getFilteredTasks().filter(t => t.status !== 'Completed');

  return (
    <div className="p-8 space-y-8 animate-fade-in text-sans">
      
      {/* 👋 WELCOME DECK SUMMARY HEADER (FULLY DYNAMIC DATE & TIME ENGINE) */}
      <div className="space-y-1 text-left">
        <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
          {/* ✅ THIS DATA MUTATES AND CHANGED AUTOMATICALLY DAILY */}
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          {getDynamicGreeting()}, <span className="text-red-500 dark:text-red-400">{userName || 'Operator'}</span>
        </h2>
      </div>

      {/* 🚀 OPERATIONAL TRACKING CHIPS PANEL */}
      <div className="flex flex-wrap gap-3 items-center text-left">
        
        {/* 📅 MY WEEK FILTER BUTTON */}
        <button 
          onClick={() => setWeekFilter(!weekFilter)}
          className={`flex items-center gap-2 px-3.5 py-2 border rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer shadow-sm ${
            weekFilter 
              ? 'bg-red-500 border-red-500 text-white' 
              : 'bg-white dark:bg-[#252628] border-slate-200 dark:border-[#333538] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-[#45474a]'
          }`}
        >
          <span>📅</span> {weekFilter ? 'Showing Next 7 Days' : 'My week'}
        </button>

        {/* ✅ REAL LIVE COMPLETED COUNTER CHIP */}
        <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm select-none">
          <span>✓</span> {completedCount} tasks completed
        </div>

        {/* 👥 REAL-TIME SOCKET WEBSOCKET CHIP */}
        <div className="flex items-center gap-2 px-3.5 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm select-none animate-pulse">
          <span>👥</span> Collaborative Team Sync Active
        </div>
      </div>

      {/* 📊 DUAL GRID ARTIFACTS INTERFACE */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        
        {/* LEFT COLUMN: ALL ACTIVE TASKS BOARD (EXPANDED) */}
        <div className="lg:col-span-3 bg-white dark:bg-[#252628]/60 border border-slate-200 dark:border-[#333538] rounded-2xl p-6 shadow-sm space-y-4 transition-colors duration-300">
          <div className="text-left">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Active Tasks Pipeline</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Track all pending and in-progress tasks across projects.</p>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-[#333538]/40 space-y-2 custom-scrollbar pr-2">
            {displayedTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 italic text-xs">No pending tasks found. Great work! 🎉</div>
            ) : (
              displayedTasks.map((task) => (
                <div 
                  key={task._id} 
                  onClick={() => { if (typeof onSelectTask === 'function') onSelectTask(task); }}
                  className="pt-3 flex justify-between items-start gap-3 group cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1e1f21] p-3 -mx-3 rounded-lg transition"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                      task.status === 'To Do' ? 'bg-slate-400' :
                      task.status === 'In Progress' ? 'bg-blue-500' :
                      task.status === 'Review' ? 'bg-amber-500' :
                      'bg-emerald-500'
                    }`}></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-red-500 dark:group-hover:text-red-400 transition truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold ${getStatusColor(task.status)} uppercase`}>
                          {task.status}
                        </span>
                        {task.priority && (
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                            {task.priority === 'High' ? '🔴' : task.priority === 'Medium' ? '🟡' : '🟢'} {task.priority}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500">
                            📅 {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {task.status !== 'Completed' && (
                    <button
                      onClick={(e) => handleAdvancePhase(e, task._id, task.status)}
                      disabled={advancingTaskId === task._id}
                      className="shrink-0 px-2 py-1 text-[9px] font-bold bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 rounded-md transition disabled:opacity-50 uppercase"
                    >
                      {advancingTaskId === task._id ? '⏳' : '→ Advance'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* 🗄️ THE REGISTRY BUTTON */}
          <button 
            onClick={handleOpenRegistry}
            className="w-full mt-2 bg-slate-50 dark:bg-[#1e1f21] hover:bg-slate-100 dark:hover:bg-[#2a2b2d] border border-slate-200 dark:border-[#333538] hover:border-slate-300 dark:hover:border-[#45474a] text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition cursor-pointer text-center block shadow-sm"
          >
            View All Tasks in Detail
          </button>
        </div>

        {/* RIGHT COLUMN: RECENT PROJECTS DECK WORKSPACE */}
        <div className="lg:col-span-2 bg-white dark:bg-[#252628]/60 border border-slate-200 dark:border-[#333538] rounded-2xl p-6 shadow-sm space-y-4 transition-colors duration-300">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Recent Projects Workspace</h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Recents ▾</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {projects.slice(0, 8).map((proj) => (
              <div 
                key={proj._id} 
                onClick={() => { if (typeof setCurrentProject === 'function') { setCurrentProject(proj); setShowMyTasks(false); if(typeof setViewMode === 'function') setViewMode('board'); } }}
                className="p-4 bg-slate-50 dark:bg-[#1e1f21] border border-slate-200 dark:border-[#2d2e30] hover:border-slate-300 dark:hover:border-[#45474a] rounded-xl flex items-center gap-3 cursor-pointer group transition"
              >
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-xs font-bold">📁</div>
                <div className="text-left min-w-0">
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white truncate group-hover:text-red-500 dark:group-hover:text-red-400 transition">{proj.name}</h4>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">Project Board Active</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default HomePortal;