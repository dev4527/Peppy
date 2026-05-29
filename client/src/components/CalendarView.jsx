import React, { useState } from 'react';

function CalendarView({ tasks, onSelectTask }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get names of months for header rendering
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Structural calendar math
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Build blank placeholders for days belonging to the previous month trailing frame
  const blanks = Array(firstDayOfMonth).fill(null);
  // Build day numbers matrix
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalSlots = [...blanks, ...days];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Filter and match tasks to their specific day slot configuration
  const getTasksForDay = (day) => {
    if (!day) return [];
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const d = new Date(task.dueDate);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="w-full bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col min-w-[800px]">
      
      {/* Calendar Navigation Strip */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-base font-black tracking-tight text-white">
          {monthNames[month]} <span className="text-red-500">{year}</span>
        </h2>
        <div className="flex gap-2">
          <button 
            onClick={handlePrevMonth}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            ← Prev Month
          </button>
          <button 
            onClick={handleNextMonth}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            Next Month →
          </button>
        </div>
      </div>

      {/* Week Day Header Strips */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-black text-slate-500 uppercase tracking-wider">
        {daysOfWeek.map(day => <div key={day} className="py-1">{day}</div>)}
      </div>

      {/* 35 or 42 Day Matrix Slots Grid Layout */}
      <div className="grid grid-cols-7 gap-2 flex-1">
        {totalSlots.map((day, idx) => {
          const dayTasks = getTasksForDay(day);
          return (
            <div 
              key={idx} 
              className={`min-h-[110px] bg-slate-950/40 border border-slate-900 rounded-xl p-2 flex flex-col justify-between group ${
                day ? 'hover:border-slate-800/80 transition' : 'opacity-20 bg-transparent border-transparent'
              }`}
            >
              {/* Day Numeric Label */}
              <div className="text-xs font-black text-slate-500 group-hover:text-slate-300 transition-colors text-left pl-1">
                {day}
              </div>

              {/* Day Task Row Badges List */}
              <div className="mt-1.5 flex-1 space-y-1 overflow-y-auto max-h-[75px] custom-scrollbar pr-0.5">
                {dayTasks.map(task => (
                  <div
                    key={task._id}
                    onClick={() => onSelectTask(task)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-md truncate cursor-pointer transition border border-transparent ${
                      task.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 line-through border-emerald-500/20' :
                      task.priority === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:border-red-500/50' :
                      task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:border-amber-500/50' :
                      'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CalendarView;