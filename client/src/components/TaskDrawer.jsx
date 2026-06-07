import React, { useState } from 'react';
import axios from 'axios';

function TaskDrawer({ task, onClose, onRefresh }) {
  const [linkInput, setLinkInput] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  if (!task) return null;

  // 📁 1. HANDLING ALL FILE ASSETS (PPT, PPTX, PDF, IMAGES)
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please choose a file first.");
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('peppy_token');
      await axios.post(`https://peppy-we0g.onrender.com/api/tasks/${task._id}/attach-file`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setFile(null);
      alert("📁 Asset attached successfully!");
      onRefresh();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to attach file.");
    } finally { setUploading(false); }
  };

  // 🔗 2. HANDLING LINK ENTRIES AND CONVERTING TO HYPERLINKS
  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!linkInput.trim()) return alert("Please paste a valid URL path.");

    // Strict hyperlink formation protocol check
    let formattedUrl = linkInput.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      const token = localStorage.getItem('peppy_token');
      await axios.post(`https://peppy-we0g.onrender.com/api/tasks/${task._id}/attach-link`, {
        title: linkTitle.trim() || 'Workspace Resource Link',
        url: formattedUrl
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setLinkInput('');
      setLinkTitle('');
      alert("🔗 Clickable Hyperlink Injected!");
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to save tracking hyperlink.");
    }
  };

  return (
    <div className="fixed top-0 right-0 h-full w-96 bg-[#1e1f21] border-l border-[#2d2e30] p-6 shadow-2xl overflow-y-auto text-white z-50 text-xs font-sans text-left custom-scrollbar">
      
      {/* DRAWER DRAWS MAIN HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-sm font-black truncate uppercase tracking-wider text-red-400">📋 {task.title}</h2>
          <span className="inline-block mt-1 text-[9px] px-2 py-0.5 rounded font-black tracking-widest bg-red-500/10 text-red-500 border border-red-500/20 uppercase">
            RANK: {task.priority || 'Medium'}
          </span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer p-1">✕</button>
      </div>

      <div className="space-y-6">
        
        {/* DESCRIPTION FIELD BOX */}
        <div>
          <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Description Context</label>
          <div className="w-full bg-[#151617] border border-[#333538] rounded-xl p-3 text-slate-300 min-h-[50px] leading-relaxed">
            {task.description || <span className="text-slate-600 italic">No description context dropped.</span>}
          </div>
        </div>

        {/* 📁 FILE ASSETS ATTACHMENT LAYER */}
        <div className="space-y-2 border-t border-[#2d2e30] pt-4">
          <label className="block text-slate-400 font-bold uppercase tracking-wider">📁 File Assets Attachment Layer</label>
          <form onSubmit={handleFileUpload} className="flex gap-2">
            <input 
              type="file" 
              accept=".ppt,.pptx,.pdf,.doc,.docx,.png,.jpg,.jpeg" 
              onChange={(e) => setFile(e.target.files[0])}
              className="flex-1 bg-[#151617] border border-[#333538] rounded-xl px-3 py-1.5 text-white text-[10px] focus:outline-none"
            />
            <button type="submit" disabled={uploading} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-4 py-1.5 rounded-xl transition uppercase text-[10px] cursor-pointer">
              {uploading ? '...' : 'Attach'}
            </button>
          </form>
          <p className="text-[9px] text-slate-500">Supports: Presentations (PPT/PPTX), PDF, Word, Images</p>
        </div>

        {/* 🔗 ✅ REPLACED: SUBTASK BREAKDOWN UTILITY IS REMOVED, LINK FORM CONNECTED */}
        <div className="space-y-2 border-t border-[#2d2e30] pt-4">
          <label className="block text-emerald-400 font-bold uppercase tracking-wider">🔗 Insert Resource Web Link</label>
          <form onSubmit={handleLinkSubmit} className="space-y-2">
            <input 
              type="text" 
              placeholder="Enter Link Description Title (e.g., Sprint Presentation)" 
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              className="w-full bg-[#151617] border border-[#333538] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Paste destination URL path (e.g., google.com)..." 
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                required
                className="flex-1 bg-[#151617] border border-[#333538] rounded-xl px-3 py-2 text-emerald-400 font-mono text-[11px] focus:outline-none focus:border-emerald-500"
              />
              <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-black px-4 py-2 rounded-xl transition uppercase text-[10px] cursor-pointer">
                Insert
              </button>
            </div>
          </form>
        </div>

        {/* 📋 ATTACHED ASSETS REPOSITORIES & CLICKABLE HYPERLINKS LIST */}
        <div className="space-y-2 border-t border-[#2d2e30] pt-4">
          <label className="block text-slate-400 font-bold uppercase tracking-wider">Attached Repositories</label>
          <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
            
            {/* Render Documents & Uploads */}
            {task.attachments?.map((asset, idx) => (
              <div key={`file-${idx}`} className="bg-[#151617] border border-[#2d2e30] p-2 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span>📄</span>
                  <a href={`https://peppy-we0g.onrender.com${asset.filePath}`} target="_blank" rel="noopener noreferrer" className="text-slate-200 hover:text-red-400 font-bold truncate underline transition-colors">
                    {asset.fileName}
                  </a>
                </div>
                <span className="text-[8px] font-black uppercase bg-[#252628] px-1.5 py-0.5 rounded text-slate-400">File</span>
              </div>
            ))}

            {/* Render Clickable Automated Hyperlinks */}
            {task.links?.map((lnk, idx) => (
              <div key={`link-${idx}`} className="bg-[#151617] border border-[#2d2e30] p-2 rounded-xl flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span>🔗</span>
                  {/* ⭐ TARGET BALANCED HYPERLINK VIEW */}
                  <a href={lnk.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 font-bold truncate underline transition-colors">
                    {lnk.title || 'Resource Link'}
                  </a>
                </div>
                <span className="text-[8px] font-black uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-400">Link</span>
              </div>
            ))}

            {(!task.attachments?.length && !task.links?.length) && (
              <p className="text-slate-500 italic text-[10px] text-center py-2">No documents or links repository referenced yet.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default TaskDrawer;