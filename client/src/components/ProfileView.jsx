import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

function ProfileView({ tasks }) {
  const { user } = useContext(AuthContext);
  const [attendance, setAttendance] = useState({ openSession: null, history: [] });
  const [privateFiles, setPrivateFiles] = useState([]);
  const [profileFile, setProfileFile] = useState(null);
  const [fileNote, setFileNote] = useState('');
  const [busy, setBusy] = useState(false);

  // Calculate quick metrics numbers for this logged-in user
  const totalMyTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const pendingTasks = totalMyTasks - completedTasks;

  const loadProfileExtras = async () => {
    try {
      const [attendanceRes, filesRes] = await Promise.all([
        api.get('/api/attendance/me'),
        api.get('/api/profile/files')
      ]);
      setAttendance(attendanceRes.data || { openSession: null, history: [] });
      setPrivateFiles(filesRes.data || []);
    } catch (err) {
      console.error('Profile extras load failed:', err);
    }
  };

  useEffect(() => {
    if (user) loadProfileExtras();
  }, [user]);

  const punch = async (type) => {
    setBusy(true);
    try {
      await api.post(`/api/attendance/${type}`, {});
      await loadProfileExtras();
    } catch (err) {
      alert(err.response?.data?.message || 'Attendance update failed.');
    } finally {
      setBusy(false);
    }
  };

  const uploadPrivateFile = async () => {
    if (!profileFile) return alert('Select a private file first.');
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', profileFile);
      formData.append('note', fileNote);
      await api.post('/api/profile/files', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setProfileFile(null);
      setFileNote('');
      await loadProfileExtras();
    } catch (err) {
      alert(err.response?.data?.message || 'Private file upload failed.');
    } finally {
      setBusy(false);
    }
  };

  const downloadPrivateFile = async (file) => {
    try {
      const res = await api.get(`/api/profile/files/${file._id}/download`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: file.mimeType || 'application/octet-stream' }));
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = file.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert(err.response?.data?.message || 'Private file download failed.');
    }
  };

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

      <div className="bg-[#1e1f21] border border-[#2d2e30] p-5 rounded-2xl mt-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Attendance Tracking</h4>
            <p className="text-[10px] text-slate-500 mt-1">
              {attendance.openSession ? `Punched in at ${new Date(attendance.openSession.punchInAt).toLocaleString()}` : 'No active punch-in session.'}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => punch(attendance.openSession ? 'punch-out' : 'punch-in')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase text-white ${attendance.openSession ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:opacity-40`}
          >
            {attendance.openSession ? 'Punch Out' : 'Punch In'}
          </button>
        </div>
        <div className="max-h-32 overflow-y-auto space-y-2 custom-scrollbar">
          {(attendance.history || []).slice(0, 5).map(record => (
            <div key={record._id} className="bg-[#252628] border border-[#333538] rounded-xl p-3 text-[10px] text-slate-300 flex justify-between">
              <span>{new Date(record.punchInAt).toLocaleString()}</span>
              <span>{record.status === 'Closed' ? `${record.totalMinutes} min` : 'Open'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#1e1f21] border border-[#2d2e30] p-5 rounded-2xl mt-6 space-y-4">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Private Profile Storage</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input type="file" onChange={(e) => setProfileFile(e.target.files[0])} className="sm:col-span-1 block w-full text-[10px] text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-[#333538] file:text-white bg-[#252628] border border-[#333538] rounded-xl p-1" />
          <input type="text" value={fileNote} onChange={(e) => setFileNote(e.target.value)} placeholder="Private note" className="sm:col-span-1 bg-[#252628] border border-[#333538] rounded-xl px-3 py-2 text-white text-xs focus:outline-none" />
          <button type="button" disabled={busy} onClick={uploadPrivateFile} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl text-[10px] uppercase">Upload</button>
        </div>
        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
          {privateFiles.map(file => (
            <div key={file._id} className="bg-[#252628] border border-[#333538] rounded-xl p-3 text-xs flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-slate-200 font-bold truncate">{file.fileName}</p>
                {file.note && <p className="text-[10px] text-slate-500 truncate">{file.note}</p>}
              </div>
              <button type="button" onClick={() => downloadPrivateFile(file)} className="text-red-400 text-[10px] font-black uppercase">Open</button>
            </div>
          ))}
          {privateFiles.length === 0 && <p className="text-[10px] text-slate-600 italic">No private documents uploaded yet.</p>}
        </div>
      </div>

    </div>
  );
}

export default ProfileView;
