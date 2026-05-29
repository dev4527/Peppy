import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function AnalyticsView({ tasks }) {
  
  // 🧠 PROCESS DATA FOR PIE CHART: TASK STATUS DISTRIBUTION
  const statusData = useMemo(() => {
    const counts = { 'To Do': 0, 'In Progress': 0, 'Review': 0, 'Completed': 0 };
    tasks.forEach(task => {
      if (counts[task.status] !== undefined) {
        counts[task.status]++;
      }
    });

    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key]
    })).filter(item => item.value > 0); // Display only states that have data
  }, [tasks]);

  // 🧠 PROCESS DATA FOR BAR CHART: PRIORITY CHECKS MATRIX
  const priorityData = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0 };
    tasks.forEach(task => {
      if (counts[task.priority] !== undefined) {
        counts[task.priority]++;
      }
    });

    return Object.keys(counts).map(key => ({
      name: `${key} Priority`,
      count: counts[key]
    }));
  }, [tasks]);

  // Premium Dark UI Theme Color Schemes
  const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981']; // Red, Blue, Amber, Emerald
  const BAR_COLOR = '#34d399'; // Emerald Neon

  if (!tasks || tasks.length === 0) {
    return (
      <div className="bg-[#151617] border border-[#2d2e30] p-8 rounded-2xl text-center text-xs text-slate-500 italic select-none">
        📡 No task metrics database found inside this workspace deck to generate data streams.
      </div>
    );
  }

  return (
    <div className="space-y-6 select-none font-sans text-left">
      
      {/* Dynamic Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#1e1f21] border border-[#2d2e30] p-4 rounded-xl">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Active Load</span>
          <h2 className="text-2xl font-black text-white mt-1">{tasks.length} <span className="text-xs text-slate-600 font-medium">Tasks</span></h2>
        </div>
        <div className="bg-[#1e1f21] border border-[#2d2e30] p-4 rounded-xl border-l-4 border-emerald-500">
          <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Velocity Closure</span>
          <h2 className="text-2xl font-black text-white mt-1">
            {tasks.filter(t => t.status === 'Completed').length} <span className="text-xs text-slate-600 font-medium">Done</span>
          </h2>
        </div>
        <div className="bg-[#1e1f21] border border-[#2d2e30] p-4 rounded-xl border-l-4 border-red-500">
          <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">High Risk Blockers</span>
          <h2 className="text-2xl font-black text-white mt-1">
            {tasks.filter(t => t.priority === 'High' && t.status !== 'Completed').length} <span className="text-xs text-slate-600 font-medium">Pending</span>
          </h2>
        </div>
      </div>

      {/* Charts Dual Grid Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. PIE CHART: STATUS DISPATCH GATEWAY */}
        <div className="bg-[#1e1f21] border border-[#2d2e30] p-5 rounded-2xl flex flex-col h-80">
          <h4 className="text-white font-extrabold text-xs uppercase tracking-wider mb-4">📊 Task Status Distribution Metric</h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#151617', borderColor: '#333538', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Legend 
                  wrapperStyle={{ fontSize: '10px', color: '#94a3b8', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. BAR CHART: PRIORITY INTENSITY LEVEL MAP */}
        <div className="bg-[#1e1f21] border border-[#2d2e30] p-5 rounded-2xl flex flex-col h-80">
          <h4 className="text-white font-extrabold text-xs uppercase tracking-wider mb-4">📈 Workload Priority Weight Matrix</h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2e30" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                <YAxis stroke="#52525b" style={{ fontSize: '10px' }} allowDecimals={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: '#151617', borderColor: '#333538', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill={BAR_COLOR} radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}

export default AnalyticsView;