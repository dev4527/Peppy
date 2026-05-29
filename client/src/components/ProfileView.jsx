import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

function ProfileView({ tasks }) {
  const { user } = useContext(AuthContext);

  // Calculate quick metrics numbers for this logged-in user
  const totalMyTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const pendingTasks = totalMyTasks - completedTasks;

  if (!user) {
    return (
      <div className="bg-[#151617] border border-[#2d2e30] p-6 rounded-2xl text-center text-xs text-slate-500 italic">
        🔒 Unauthorized access. Please log in again to sync user credentials context.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-2 font-sans text-left select-none animate-fade-in">
      
      {/* Profile Header Deck */}
      <div className="bg-[#1e1f21] border border-[#2d2e30] p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-5 shadow-xl">
        <div className="h-16 w-16 bg-red-500 text-white rounded-2xl flex items-center justify-center font-black text-2xl uppercase tracking-wider shadow-lg">
          {user.name ? user.name.substring(0, 2) : 'TM'}
        </div>
        <div className="text-center sm:text-left flex-1">
          <h2 className="text-lg font-black text-white tracking-tight">{user.name || 'Team Member'}</h2>
          <p className="text-xs text-red-400 font-bold uppercase tracking-wider mt-0.5">{user.role || 'Operational Executive'}</p>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">📧 {user.email}</span>
        </div>
      </div>

      {/* Workspace Performance Dashboard Metrics Grid */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-[#1e1f21] border border-[#2d2e30] p-4 rounded-xl text-center">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Assigned Scope</span>
          <h3 className="text-xl font-black text-white mt-1">{totalMyTasks}</h3>
        </div>
        <div className="bg-[#1e1f21] border border-[#2d2e30] p-4 rounded-xl text-center border-b-2 border-emerald-500">
          <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider block">Closed Nodes</span>
          <h3 className="text-xl font-black text-white mt-1">{completedTasks}</h3>
        </div>
        <div className="bg-[#1e1f21] border border-[#2d2e30] p-4 rounded-xl text-center border-b-2 border-amber-500">
          <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider block">In Pipeline</span>
          <h3 className="text-xl font-black text-white mt-1">{pendingTasks}</h3>
        </div>
      </div>

      {/* Account Authentication & Security Status Card */}
      <div className="bg-[#1e1f21] border border-[#2d2e30] p-5 rounded-2xl mt-6 space-y-4">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-[#2d2e30] pb-2">🛡️ Workspace Node Security Identity</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-500 font-bold block">Telemetry Access Status</span>
            <p className="text-emerald-400 font-extrabold mt-0.5">🟢 ACTIVE ENCRYPTED LOOP</p>
          </div>
          <div>
            <span className="text-slate-500 font-bold block">Network Authority Layer</span>
            <p className="text-slate-300 font-bold mt-0.5 uppercase">Level-01 Operational Staff</p>
          </div>
        </div>
      </div>

    </div>
  );
}

export default ProfileView;