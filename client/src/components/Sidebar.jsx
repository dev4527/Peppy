import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

function Sidebar({ 
  currentProject, 
  setCurrentProject, 
  showMyTasks, 
  setShowMyTasks, 
  viewMode, 
  setViewMode,
  setShowProjectModal // 🌟 CONNECTED: Directly triggers dashboard's updated onboarding view
}) {
  const { user } = useContext(AuthContext); // 👑 Captured to manage role visibility matrices
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]); 
  const [showTeamModal, setShowTeamModal] = useState(false); 
  const [newTeamName, setNewTeamName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchGlobalSidebarData = async () => {
    try {
      const token = localStorage.getItem('peppy_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [projRes, teamRes] = await Promise.all([
        axios.get('https://peppy-we0g.onrender.com/api/projects', { headers }),
        axios.get('https://peppy-we0g.onrender.com/api/teams', { headers })
      ]);
      
      // 🏢 MANAGER DASHBOARD BOUNDS: If user is manager, restrict client visibility mapping 
      if (user?.role === 'Manager' && user?.team) {
        const filteredProj = projRes.data.filter(p => p.teamCategory === user.team);
        const filteredTeam = teamRes.data.filter(t => t.name === user.team);
        setProjects(filteredProj);
        setTeams(filteredTeam);
      } else {
        setProjects(projRes.data);
        setTeams(teamRes.data);
      }
    } catch (err) {
      console.error('Sidebar dynamic query array pull fail:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchGlobalSidebarData();
    }
  }, [currentProject, showTeamModal, user]);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('peppy_token');
      await axios.post('https://peppy-we0g.onrender.com/api/teams', 
        { name: newTeamName.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewTeamName('');
      setShowTeamModal(false);
      await fetchGlobalSidebarData();
    } catch (err) {
      console.error(err);
    } finally { loading(false); }
  };

  const handleDeleteTeam = async (teamId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to permanently eliminate this department team?')) return;
    try {
      const token = localStorage.getItem('peppy_token');
      await axios.delete(`https://peppy-we0g.onrender.com/api/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchGlobalSidebarData();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="w-60 bg-[#1e1f21] border-r border-[#2d2e30] flex flex-col h-screen shrink-0 text-white font-sans text-left select-none">
      
      <div className="p-4 flex items-center justify-between border-b border-[#2d2e30]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-red-500 text-white flex items-center justify-center font-black text-xs shadow-md">P</div>
          <h2 className="text-sm font-bold tracking-tight text-[#f5f4f4]">peppy <span className="text-red-500">tracker</span></h2>
        </div>
        
        {/* 👑 MANAGER & ADMIN ACCESSIBILITY RULES CONTAINER */}
        {(user?.role === 'Admin' || user?.role === 'Manager') && (
          <div className="flex gap-2">
            {user?.role === 'Admin' && (
              <button onClick={() => setShowTeamModal(true)} className="text-[#a2a0a2] hover:text-emerald-400 text-xs font-bold transition cursor-pointer" title="Add New Team Department">👥 ＋</button>
            )}
            <button 
              onClick={() => setShowProjectModal(true)} // 🚀 FIXED: Triggers the full-proof dual checkbox modal sheet now!
              className="text-[#a2a0a2] hover:text-red-400 text-sm font-bold transition cursor-pointer" 
              title="Add New Project Board"
            >
              ＋
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs font-medium custom-scrollbar">
        <div className="space-y-0.5">
          <button onClick={() => { setViewMode('project_home'); setShowMyTasks(false); setCurrentProject(null); }} className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center gap-2.5 ${viewMode === 'project_home' && !showMyTasks && !currentProject ? 'bg-[#333538] text-white font-bold' : 'text-[#a2a0a2] hover:bg-[#252628]'}`}><span className="text-sm">🏠</span> <span>Home Portal</span></button>
          <button onClick={() => { setShowMyTasks(true); setCurrentProject(null); setViewMode('list'); }} className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center gap-2.5 ${showMyTasks ? 'bg-[#333538] text-white font-bold' : 'text-[#a2a0a2] hover:bg-[#252628]'}`}><span className="text-sm">✅</span> <span>My tasks</span></button>
          
          <button 
            onClick={() => { setViewMode('chat_room'); setShowMyTasks(false); setCurrentProject(null); }} 
            className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center gap-2.5 ${viewMode === 'chat_room' ? 'bg-[#333538] text-white font-bold' : 'text-[#a2a0a2] hover:bg-[#252628]'}`}
          >
            <span className="text-sm">💬</span> <span>Team Chat Room</span>
          </button>
        </div>

        {/* 👥 ASANA DYNAMIC INTEGRAL TEAM FILTER TREE HOOKS */}
        {teams.map((team) => {
          const matchedProjects = projects.filter(p => {
            if (!p.teamCategory) return false;
            const pTeam = String(p.teamCategory).toLowerCase().trim();
            const tName = String(team.name).toLowerCase().trim();
            return pTeam === tName || pTeam.includes(tName) || tName.includes(pTeam);
          });

          return (
            <div key={team._id} className="border-t border-[#2d2e30] pt-2.5 mt-2 group/team">
              <div className="flex justify-between items-center px-2 mb-1.5">
                <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">{team.name}</span>
                {user?.role === 'Admin' && (
                  <button onClick={(e) => handleDeleteTeam(team._id, e)} className="opacity-0 group-hover/team:opacity-100 text-slate-500 hover:text-red-500 text-[10px] transition cursor-pointer">🗑️</button>
                )}
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
                  <div className="text-[10px] text-slate-600 italic pl-3 pt-1">No active boards linked.</div>
                )}
              </nav>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: ADD NEW TEAM */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e1f21] w-full max-w-sm p-6 rounded-2xl border border-[#333538] text-white text-left">
            <h3 className="text-sm font-bold text-white mb-4">Initialize New Department Team</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#a2a0a2] font-semibold mb-1.5">Department Name</label>
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