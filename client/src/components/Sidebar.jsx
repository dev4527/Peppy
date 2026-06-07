import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

function Sidebar({ currentProject, setCurrentProject, showMyTasks, setShowMyTasks, viewMode, setViewMode, setShowProjectModal }) {
  const { user } = useContext(AuthContext);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]); 
  const [showTeamModal, setShowTeamModal] = useState(false); 
  const [newTeamName, setNewTeamName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchGlobalSidebarData = async () => {
    try {
      const token = localStorage.getItem('peppy_token');
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'x-auth-token': token 
      };
      
      // Both routes are now strictly intercepted by server security patches
      const [projRes, teamRes] = await Promise.all([
        axios.get('https://peppy-we0g.onrender.com/api/projects', { headers }),
        axios.get('https://peppy-we0g.onrender.com/api/teams', { headers })
      ]);
      
      setProjects(projRes.data || []);
      setTeams(teamRes.data || []);
    } catch (err) {
      console.error('Sidebar framework query array pull fail:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchGlobalSidebarData();
    }
  }, [currentProject, showTeamModal, user, viewMode]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('peppy_token');
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'x-auth-token': token 
      };
      await axios.post('https://peppy-we0g.onrender.com/api/teams', 
        { name: newTeamName.trim() },
        { headers }
      );
      setNewTeamName('');
      setShowTeamModal(false);
      await fetchGlobalSidebarData();
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  return (
    <div className="w-60 bg-[#1e1f21] border-r border-[#2d2e30] flex flex-col h-screen shrink-0 text-white font-sans text-left select-none">
      
      <div className="p-4 flex items-center justify-between border-b border-[#2d2e30]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-red-500 text-white flex items-center justify-center font-black text-xs shadow-md">P</div>
          <h2 className="text-sm font-bold tracking-tight text-[#f5f4f4]">peppy <span className="text-red-500">tracker</span></h2>
        </div>
        
        {/* 👑 ASANA ACCESS: Admin and Managers can deploy spaces */}
        {(user?.role === 'Admin' || user?.role === 'Manager') && (
          <div className="flex gap-2">
            {user?.role === 'Admin' && (
              <button onClick={() => setShowTeamModal(true)} className="text-[#a2a0a2] hover:text-emerald-400 text-xs font-bold transition cursor-pointer" title="Add New Team Department">👥 ＋</button>
            )}
            <button onClick={() => setShowProjectModal(true)} className="text-[#a2a0a2] hover:text-red-400 text-sm font-bold transition cursor-pointer" title="Onboard Project Board">＋</button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs font-medium custom-scrollbar">
        <div className="space-y-0.5">
          <button onClick={() => { setViewMode('project_home'); setShowMyTasks(false); setCurrentProject(null); }} className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center gap-2.5 ${viewMode === 'project_home' && !showMyTasks && !currentProject ? 'bg-[#333538] text-white font-bold' : 'text-[#a2a0a2] hover:bg-[#252628]'}`}><span className="text-sm">🏠</span> <span>Home Portal</span></button>
          <button onClick={() => { setShowMyTasks(true); setCurrentProject(null); setViewMode('list'); }} className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center gap-2.5 ${showMyTasks ? 'bg-[#333538] text-white font-bold' : 'text-[#a2a0a2] hover:bg-[#252628]'}`}><span className="text-sm">✅</span> <span>My tasks</span></button>
          <button onClick={() => { setViewMode('chat_room'); setShowMyTasks(false); setCurrentProject(null); }} className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center gap-2.5 ${viewMode === 'chat_room' ? 'bg-[#333538] text-white font-bold' : 'text-[#a2a0a2] hover:bg-[#252628]'}`}><span className="text-sm">💬</span> <span>Team Chat Room</span></button>
        </div>

        {/* 👥 ASANA DYNAMIC INTEGRAL TEAM FILTER TREE */}
        {teams.map((team) => {
          const matchedProjects = projects.filter(p => {
            if (!p.teamCategory) return false;
            return String(p.teamCategory).toLowerCase().trim() === String(team.name).toLowerCase().trim();
          });

          // ⭐ STRICTOR ROLES HYPER-GATEWAY OVERRIDE: 
          // If the logged-in user is a Manager OR an Employee, completely hide other department team headers from their dashboard sidebar view.
          if ((user?.role === 'Manager' || user?.role === 'Employee') && String(user?.team).toLowerCase().trim() !== String(team.name).toLowerCase().trim()) {
            return null;
          }

          return (
            <div key={team._id} className="border-t border-[#2d2e30] pt-2.5 mt-2 group/team">
              <div className="flex justify-between items-center px-2 mb-1.5">
                <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">📁 {team.name}</span>
              </div>
              <nav className="space-y-0.5">
                {matchedProjects.map((proj) => (
                  <button
                    key={proj._id}
                    onClick={() => { setShowMyTasks(false); setCurrentProject(proj); setViewMode('board'); }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center gap-2 truncate ${currentProject?._id === proj._id && !showMyTasks ? 'bg-[#333538] text-white font-bold border-l-2 border-red-500 pl-2 rounded-l-none' : 'text-[#a2a0a2] hover:bg-[#252628] hover:text-white'}`}
                  >
                    <span className="text-emerald-400 text-[11px]">📋</span>
                    <span className="truncate">{proj.name}</span>
                  </button>
                ))}
                {matchedProjects.length === 0 && (
                  <div className="text-[10px] text-slate-600 italic pl-3 pt-1">No boards linked under this track.</div>
                )}
              </nav>
            </div>
          );
        })}
      </div>

      {/* TEAM CREATE MODAL POPUP */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e1f21] w-full max-w-sm p-6 rounded-2xl border border-[#333538] text-white text-left">
            <h3 className="text-sm font-bold text-white mb-4">Initialize New Team Branch</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#a2a0a2] font-semibold mb-1.5">Team Group Name</label>
                <input type="text" className="w-full bg-[#252628] border border-[#333538] rounded-xl px-4 py-2.5 text-white focus:outline-none" placeholder="e.g., Technical Team, Marketing Team" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} required />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition cursor-pointer">{loading ? 'Creating...' : 'Create Team'}</button>
                <button type="button" onClick={() => setShowTeamModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl transition cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;