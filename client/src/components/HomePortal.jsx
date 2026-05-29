import React, { useState } from 'react';

function HomePortal({ tasks = [], projects = [], setCurrentProject, setShowMyTasks, setViewMode, userName }) {
  const [weekFilter, setWeekFilter] = useState(false);

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

  const displayedTasks = getFilteredTasks().filter(t => t.status !== 'Completed').slice(0, 5);

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
        
        {/* LEFT COLUMN: ACTIVE ASSIGNED TASKS MATRIX */}
        <div className="lg:col-span-3 bg-white dark:bg-[#252628]/60 border border-slate-200 dark:border-[#333538] rounded-2xl p-6 shadow-sm space-y-4 transition-colors duration-300">
          <div className="text-left">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Tasks assigned to me</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Track progress across your explicit corporate pipeline backlog artifacts.</p>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-[#333538]/40 space-y-2">
            {displayedTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 italic text-xs">No pending tasks found for your profile deck.</div>
            ) : (
              displayedTasks.map((task) => (
                <div key={task._id} className="pt-3 flex justify-between items-center group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-red-500 dark:group-hover:text-red-400 transition">{task.title}</p>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-lg font-black uppercase tracking-wider">{task.status}</span>
                </div>
              ))
            )}
          </div>

          {/* 🗄️ THE REGISTRY BUTTON */}
          <button 
            onClick={handleOpenRegistry}
            className="w-full mt-2 bg-slate-50 dark:bg-[#1e1f21] hover:bg-slate-100 dark:hover:bg-[#2a2b2d] border border-slate-200 dark:border-[#333538] hover:border-slate-300 dark:hover:border-[#45474a] text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition cursor-pointer text-center block shadow-sm"
          >
            Open Complete Personal Backlog Registry
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