// ❌ PURANA LOGIC: function TaskDrawerComponent({ task, onClose, onRefresh }) {
// ✅ FIXED BLOCK: Function ka naam exact "TaskDrawer" hona chahiye taaki niche export match ho jaye

import React, { useState } from 'react';
import axios from 'axios';

function TaskDrawer({ task, onClose, onRefresh }) {
  const [linkInput, setLinkInput] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  if (!task) return null;

  // 📁 1. FILE ASSETS UPLOAD (PPT, PPTX, PDF, Images)
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

  // 🔗 2. LINK SUBMIT WITH AUTO-HYPERLINK FORMATTING
  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!linkInput.trim()) return alert("Please paste a valid URL.");

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
      alert("🔗 Hyperlink saved successfully!");
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to save hyperlink.");
    }
  };

  return (
    <div className="fixed top-0 right-0 h-full w-96 bg-[#1e1f21] border-l border-[#2d2e30] p-6 shadow-2xl overflow-y-auto text-white z-50 text-xs font-sans text-left">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm font-black truncate uppercase tracking-wider text-red-400">📋 {task.title}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer">✕</button>
      </div>

      <div className="space-y-6">
        {/* DESCRIPTION CONTEXT */}
        <div>
          <label className="block text-slate-400 font-bold uppercase tracking-wider mb-1.5">Description Context</label>
          <div className="w-full bg-[#151617] border border-[#333538] rounded-xl p-3 text-slate-300 min-h-[50px]">
            {task.description || <span className="text-slate-600 italic">No instructions description drop.</span>}
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
              className="flex-1 bg-[#151617] border border-[#333538] rounded-xl px-3 py-1.5 text-white text-[10px]"
            />
            <button type="submit" disabled={uploading} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-4 py-1.5 rounded-xl transition uppercase">
              {uploading ? '...' : 'Attach'}
            </button>
          </form>
          <p className="text-[10px] text-slate-500">Supports: PPT, PPTX, PDF, Images, Documents</p>
        </div>

        {/* 🔗 ATTACH WEB LINKS LAYER */}
        <div className="space-y-2 border-t border-[#2d2e30] pt-4">
          <label className="block text-slate-400 font-bold uppercase tracking-wider">🔗 Attach Web Links Layer</label>
          <form onSubmit={handleLinkSubmit} className="space-y-2">
            <input 
              type="text" 
              placeholder="Link Title (e.g., Figma Board, Presentation Link)" 
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              className="w-full bg-[#151617] border border-[#333538] rounded-xl px-3 py-2 text-white"
            />
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Paste secure URL pathway..." 
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                required
                className="flex-1 bg-[#151617] border border-[#333538] rounded-xl px-3 py-2 text-emerald-400 font-mono text-[11px]"
              />
              <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-black px-4 py-2 rounded-xl transition uppercase">
                Link
              </button>
            </div>
          </form>
        </div>

        {/* 📋 RENDERING ATTACHMENTS & CLICKABLE HYPERLINKS */}
        <div className="space-y-2 border-t border-[#2d2e30] pt-4">
          <label className="block text-slate-400 font-bold uppercase tracking-wider">Attached Repositories</label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
            
            {/* Render Files */}
            {task.attachments?.map((asset, idx) => (
              <div key={`file-${idx}`} className="bg-[#151617] border border-[#2d2e30] p-2 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span>📄</span>
                  <a href={`https://peppy-we0g.onrender.com/${asset.filePath}`} target="_blank" rel="noopener noreferrer" className="text-slate-200 hover:text-red-400 font-bold truncate underline transition-colors">
                    {asset.fileName}
                  </a>
                </div>
                <span className="text-[8px] font-black uppercase bg-[#252628] px-1.5 py-0.5 rounded text-slate-400">File</span>
              </div>
            ))}

            {/* Render Clickable Hyperlinks */}
            {task.links?.map((lnk, idx) => (
              <div key={`link-${idx}`} className="bg-[#151617] border border-[#2d2e30] p-2 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span>🔗</span>
                  <a href={lnk.url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 font-bold truncate underline transition-colors">
                    {lnk.title || 'Resource Link'}
                  </a>
                </div>
                <span className="text-[8px] font-black uppercase bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-400">Link</span>
              </div>
            ))}

            {(!task.attachments?.length && !task.links?.length) && (
              <p className="text-slate-500 italic text-[11px] py-2">No documents or links repository referenced yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ⭐ Niche default export completely matched now!
export default TaskDrawer;