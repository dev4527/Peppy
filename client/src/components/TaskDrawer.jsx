import React, { useState } from 'react';
import axios from 'axios';

// Input attributes block parameter setups inside TaskDrawer
function TaskDrawerComponent({ task, onClose, onRefresh }) {
  const [linkInput, setLinkInput] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // 📁 1. HANDLING ALL FILES INCLUDING PPT, IMAGES & DOCUMENTS
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please choose a file first.");
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', 'file');

    try {
      const token = localStorage.getItem('peppy_token');
      await axios.post(`https://peppy-we0g.onrender.com/api/tasks/${task._id}/attach-file`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setFile(null);
      alert("📁 Document Attached Successfully!");
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to attach asset.");
    } finally { setUploading(false); }
  };

  // 🔗 2. HANDLING WEB LINKS & AUTO-HYPERLINK GENERATION
  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    if (!linkInput.trim()) return alert("Please paste a valid URL.");

    // Automatic format detection to enforce safe hyperlinks
    let formattedUrl = linkInput.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      const token = localStorage.getItem('peppy_token');
      await axios.post(`https://peppy-we0g.onrender.com/api/tasks/${task._id}/attach-link`, {
        fileName: linkTitle.trim() || 'Shared Web Reference Link',
        fileUrl: formattedUrl,
        fileType: 'link'
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setLinkInput('');
      setLinkTitle('');
      alert("🔗 Web Hyperlink Injected Seamlessly!");
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 text-xs text-slate-300 p-4">
      
      {/* 📁 SECTION A: FILE ASSETS ATTACHMENT LAYER */}
      <div className="space-y-2">
        <label className="block text-slate-400 font-bold uppercase tracking-wider">📁 File Assets Attachment Layer</label>
        <form onSubmit={handleFileUpload} className="flex gap-2">
          <input 
            type="file" 
            // ⭐ UNLOCKED PPT: Added presentation extensions explicit tracking loops
            accept=".ppt,.pptx,.pdf,.doc,.docx,.png,.jpg,.jpeg" 
            onChange={(e) => setFile(e.target.files[0])}
            className="flex-1 bg-[#151617] border border-[#333538] rounded-xl px-3 py-2 text-white"
          />
          <button type="submit" disabled={uploading} className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-4 py-2 rounded-xl transition uppercase">
            {uploading ? 'Attaching...' : 'Attach'}
          </button>
        </form>
        <p className="text-[10px] text-slate-500">Supports: PPT, PPTX, PDF, Images, Word Documents</p>
      </div>

      {/* 🔗 SECTION B: ATTACH WEB LINKS LAYER */}
      <div className="space-y-2 border-t border-[#2d2e30] pt-4">
        <label className="block text-slate-400 font-bold uppercase tracking-wider">🔗 Attach Web Links Layer</label>
        <form onSubmit={handleLinkSubmit} className="space-y-2">
          <input 
            type="text" 
            placeholder="Link Title (e.g., Figma Workspace Design, Drive Link)" 
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            className="w-full bg-[#151617] border border-[#333538] rounded-xl px-3 py-2 text-white"
          />
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Paste secure URL pathway (e.g., google.com, figma.com)" 
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              required
              className="flex-1 bg-[#151617] border border-[#333538] rounded-xl px-3 py-2 text-white text-emerald-400 font-mono"
            />
            <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-black px-4 py-2 rounded-xl transition uppercase">
              Link
            </button>
          </div>
        </form>
      </div>

      {/* 📋 SECTION C: RENDER LIST WITH ACTIVE WORKING HYPERLINKS */}
      <div className="space-y-2 border-t border-[#2d2e30] pt-4">
        <label className="block text-slate-400 font-bold uppercase tracking-wider">Attached Repositories</label>
        <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
          {task?.attachments?.length === 0 ? (
            <p className="text-slate-500 italic text-[11px]">No documents or links repository referenced yet.</p>
          ) : (
            task?.attachments?.map((asset, idx) => (
              <div key={idx} className="bg-[#151617] border border-[#2d2e30] p-2.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span>{asset.fileType === 'link' ? '🔗' : '📄'}</span>
                  {/* ⭐ AUTOMATIC HYPERLINK RECONCILIATION */}
                  <a 
                    href={asset.fileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-slate-200 hover:text-red-400 font-bold truncate underline transition-colors"
                  >
                    {asset.fileName}
                  </a>
                </div>
                <span className="text-[9px] font-black uppercase bg-[#252628] px-2 py-0.5 rounded text-slate-400">
                  {asset.fileType}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}