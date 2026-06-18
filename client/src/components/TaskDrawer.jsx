import { useState, useEffect } from 'react';
import api, { API_BASE } from '../utils/api';

function TaskDrawer({ task, onClose, onRefresh }) {
  const [commentText, setCommentText] = useState('');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  
  // Local reactive states to bypass render locks
  const [localComments, setLocalComments] = useState([]);
  const [localSubtasks, setLocalSubtasks] = useState([]);
  const [localAttachments, setLocalAttachments] = useState([]);

  useEffect(() => {
    if (task) {
      setLocalComments(task.comments || []);
      setLocalSubtasks(task.subtasks || []);
      setLocalAttachments(task.attachments || []);
    }
  }, [task]);

  if (!task) return null;

  // 🚀 1. COMMENT CLICK POST ENGINE (With Automatic @Email Alerts)
  const handleAddCommentClick = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!commentText.trim()) return;

    const userMeta = JSON.parse(localStorage.getItem('peppy_user') || '{}');
    const currentUserName = userMeta.name || 'Admin';
    const textToPost = commentText.trim();

    // Latency compensation
    const instantBubble = {
      userName: currentUserName,
      text: textToPost,
      timestamp: new Date().toISOString()
    };
    setLocalComments(prev => [...prev, instantBubble]);
    setCommentText('');

    try {
      const res = await api.post(`/api/tasks/${task._id}/comments`, { text: textToPost, userName: currentUserName });
      
      if (res.data && res.data.comments) {
        setLocalComments(res.data.comments);
      }
      if (typeof onRefresh === 'function') onRefresh();
    } catch (err) { 
      console.error("Comment dispatch failure:", err); 
    }
  };

  // 📁 2. DYNAMIC FILE ATTACH PIPELINE (CLICK-PROOF MULTIPART DATA FLOW)
  const handleAttachClick = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Safety verification check
    if (!selectedFile) {
      alert("Bhai, pehle koi file select toh karo!");
      return;
    }
    
    setUploading(true);
    const formData = new FormData();
    formData.append('attachment', selectedFile); // Links directly to Multer stream destination field

    try {
      console.log(`Streaming binary tracking blocks to server: /api/tasks/${task._id}/upload`);
      
      const res = await api.post(`/api/tasks/${task._id}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      // Flush file input field memory logs instantly
      setSelectedFile(null);
      const fileInputElement = document.getElementById('attachmentInput');
      if (fileInputElement) fileInputElement.value = '';
      
      // If server baseline returns successful document tracking schema array, reload parameters
      if (res.data && res.data.attachments) {
        setLocalAttachments(res.data.attachments);
      }
      
      alert("File asset uploaded cleanly to repository!");
      if (typeof onRefresh === 'function') onRefresh();
    } catch (err) {
      console.error('File storage sync loop dropped:', err);
      alert('Upload tracking drop: Please make sure file server node on port 5000 is functional.');
    } finally {
      setUploading(false);
    }
  };

  // 📐 3. SUBTASK INJECTION POST PIPELINE
  const handleSubtaskClick = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!subtaskTitle.trim()) return;

    const subTitleText = subtaskTitle.trim();
    setSubtaskTitle('');

    try {
      const res = await api.post(`/api/tasks/${task._id}/subtasks`, { title: subTitleText });
      if (res.data && res.data.subtasks) {
        setLocalSubtasks(res.data.subtasks);
      }
      if (typeof onRefresh === 'function') onRefresh();
    } catch (err) { 
      console.error("Subtask deployment crash:", err); 
    }
  };

  const handleToggleSubtask = async (subId) => {
    try {
      setLocalSubtasks(prev => prev.map(st => st._id === subId ? { ...st, isCompleted: !st.isCompleted } : st));
      const res = await api.put(`/api/tasks/${task._id}/subtasks/${subId}`, {});
      if (res.data && res.data.subtasks) {
        setLocalSubtasks(res.data.subtasks);
      }
      if (typeof onRefresh === 'function') onRefresh();
    } catch (err) { 
      console.error("Subtask check switch dropping error:", err); 
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recent';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-[#1e1f21] border-l border-[#2d2e30] shadow-2xl z-40 flex flex-col font-sans text-left text-white animate-slide-in select-none">
      
      {/* Drawer Header Layout */}
      <div className="p-5 border-b border-[#2d2e30] flex justify-between items-center bg-[#151617]">
        <div className="truncate pr-4">
          <h2 className="text-sm font-black text-white truncate">{task.title}</h2>
          <span className="text-[9px] uppercase font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-md mt-1 inline-block">
            Rank: {task.priority}
          </span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-base cursor-pointer font-bold transition">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar text-xs">
        
        {/* Description Context */}
        <div>
          <h4 className="text-[#848285] font-bold mb-1.5 uppercase text-[10px] tracking-wider">Description Context</h4>
          <p className="bg-[#252628] p-3 rounded-xl border border-[#333538] text-[#cbd5e1] leading-relaxed whitespace-pre-line">
            {task.description || 'No instruction context layers declared.'}
          </p>
        </div>

        {/* 📁 FILE ASSETS ATTACHMENT DECK LAYER */}
        <div className="border-t border-[#2d2e30] pt-4">
          <h4 className="text-[#848285] font-bold mb-2 uppercase text-[10px] tracking-wider">📁 File Assets Attachment Layer</h4>
          <div className="flex gap-2 mb-3">
            <input 
              id="attachmentInput"
              type="file" 
              className="block w-full text-[10px] text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-bold file:bg-[#333538] file:text-white bg-[#252628] border border-[#333538] rounded-xl p-1 cursor-pointer"
              onChange={(e) => setSelectedFile(e.target.files[0])} // Direct unhindered stream assignment
            />
            <button 
              type="button" 
              onClick={handleAttachClick} // Fixed pass through handler trigger
              disabled={uploading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white font-bold px-3 py-1.5 rounded-xl text-[10px] transition uppercase cursor-pointer shrink-0"
            >
              {uploading ? '...' : 'Attach'}
            </button>
          </div>

          {/* Rendered Uploaded Files List */}
          <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar">
            {localAttachments.map((file, idx) => (
              <div key={file._id || idx} className="flex justify-between items-center bg-[#252628] border border-[#333538] p-2.5 rounded-xl">
                <span className="text-slate-300 font-medium truncate max-w-[180px]">📎 {file.fileName}</span>
                <a 
                  href={`${API_BASE}${file.filePath}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-red-400 hover:text-red-300 font-bold text-[10px] uppercase border border-red-500/20 px-2 py-0.5 rounded-lg bg-red-500/5 transition"
                >
                  Download ↓
                </a>
              </div>
            ))}
            {localAttachments.length === 0 && (
              <p className="text-[10px] text-slate-600 italic pl-1">No documents repository linked.</p>
            )}
          </div>
          
          {/* Insert Link Panel */}
          <div className="mt-3">
            <h5 className="text-[10px] text-slate-400 font-bold mb-2">🔗 Insert Link</h5>
            <div className="flex gap-2 mb-2">
              <input type="text" placeholder="Link title (optional)" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} className="flex-1 bg-[#252628] border border-[#333538] rounded-xl px-3 py-2 text-white text-xs focus:outline-none" />
              <input type="text" placeholder="https://example.com" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="flex-1 bg-[#252628] border border-[#333538] rounded-xl px-3 py-2 text-white text-xs focus:outline-none" />
              <button onClick={async (e) => {
                e.preventDefault();
                if (!linkUrl || !linkUrl.trim()) return alert('Enter a URL');
                try {
                  const res = await api.post(`/api/tasks/${task._id}/attach-link`, { title: linkTitle, url: linkUrl });
                  if (res.data && res.data.links) {
                    setLocalAttachments(prev => prev); // keep attachments
                    // refresh via provided callback
                    if (typeof onRefresh === 'function') onRefresh();
                    setLinkTitle(''); setLinkUrl('');
                  }
                } catch (err) { console.error('Insert link failed', err); alert('Failed to attach link'); }
              }} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-[10px]">Add</button>
            </div>

            {/* Render Links */}
            <div className="space-y-2 max-h-28 overflow-y-auto">
              {(task.links || []).map((ln, idx) => (
                <div key={ln._id || idx} className="flex items-center justify-between bg-[#252628] border border-[#333538] p-2.5 rounded-xl">
                  <a href={ln.url} target="_blank" rel="noreferrer" className="text-slate-200 truncate max-w-[200px]">🔗 {ln.title || ln.url}</a>
                  <a href={ln.url} target="_blank" rel="noreferrer" className="text-red-400 hover:text-red-300 font-bold text-[10px] uppercase border border-red-500/20 px-2 py-0.5 rounded-lg bg-red-500/5">Open</a>
                </div>
              ))}
              {(task.links || []).length === 0 && (<p className="text-[10px] text-slate-600 italic">No links attached.</p>)}
            </div>
          </div>
        </div>

        {/* Subtask Breakdown Deck */}
        <div className="border-t border-[#2d2e30] pt-4">
          <h4 className="text-[#848285] font-bold mb-2 uppercase text-[10px] tracking-wider">Subtask Breakdown</h4>
          <div className="space-y-2 mb-3 max-h-32 overflow-y-auto custom-scrollbar">
            {localSubtasks.map((st, idx) => (
              <div key={st._id || `sub-${idx}`} className="flex items-center gap-2.5 bg-[#252628]/40 px-3 py-2 rounded-xl border border-[#333538]/60">
                <input 
                  type="checkbox" 
                  checked={st.isCompleted} 
                  onChange={() => handleToggleSubtask(st._id)} 
                  className="rounded text-red-500 focus:ring-0 bg-slate-800 border-slate-700 cursor-pointer w-3.5 h-3.5" 
                />
                <span className={`font-medium ${st.isCompleted ? 'line-through text-slate-600' : 'text-slate-300'}`}>{st.title}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 bg-[#252628] border border-[#333538] rounded-xl px-3 py-2 text-white text-xs focus:outline-none" 
              placeholder="Add nested items..." 
              value={subtaskTitle} 
              onChange={(e) => setSubtaskTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubtaskClick(e); }}
            />
            <button type="button" onClick={handleSubtaskClick} className="bg-[#333538] text-white font-bold px-3 rounded-xl cursor-pointer">＋</button>
          </div>
        </div>

        {/* Collaborative Activity Notes Box */}
        <div className="border-t border-[#2d2e30] pt-4">
          <h4 className="text-[#848285] font-bold mb-2 uppercase text-[10px] tracking-wider">Collaborative Activity Notes</h4>
          <div className="space-y-2.5 mb-4 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
            {localComments.map((c, i) => (
              <div key={i} className="bg-[#252628] border border-[#333538] p-2.5 rounded-xl text-left">
                <div className="flex justify-between items-center mb-1 text-[10px]">
                  <span className="font-extrabold text-red-400">{c.userName}</span>
                  <span className="text-slate-600 font-bold">{formatTimeAgo(c.timestamp)}</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed break-all">{c.text}</p>
              </div>
            ))}
            {localComments.length === 0 && (
              <p className="text-[11px] text-slate-600 italic pl-1">No logs pushed yet.</p>
            )}
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 bg-[#252628] border border-[#333538] rounded-xl px-3 py-2 text-white text-xs focus:outline-none" 
              placeholder="Write updates (use @email to send help alerts)..." 
              value={commentText} 
              onChange={(e) => setCommentText(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCommentClick(e); }}
            />
            <button 
              type="button" 
              onClick={handleAddCommentClick}
              className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 rounded-xl transition cursor-pointer"
            >
              Post
            </button>
          </div>
        </div>

        {/* History Trail Audit Panel */}
        <div className="border-t border-[#2d2e30] pt-4 pb-6">
          <h4 className="text-[#848285] font-bold mb-3 uppercase text-[10px] tracking-wider">📜 History Audit Trail</h4>
          <div className="relative pl-4 border-l-2 border-[#333538] ml-1.5 space-y-4">
            {task.activities && [...task.activities].reverse().map((act, idx) => (
              <div key={act._id || idx} className="relative group text-left">
                <div className="absolute -left-[21px] top-0.5 bg-[#ef4444] h-2 w-2 rounded-full ring-4 ring-[#1e1f21]" />
                <div>
                  <p className="text-[#cbd5e1] font-medium leading-tight">
                    <span className="font-black text-slate-300 mr-1">{act.userName}</span> 
                    {act.text}
                  </p>
                  <span className="text-[9px] text-slate-600 font-bold block mt-0.5">
                    ⏱️ {formatTimeAgo(act.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default TaskDrawer;
