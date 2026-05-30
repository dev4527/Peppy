import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io('https://peppy-we0g.onrender.com');

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('peppy_token');
      const res = await axios.get('https://peppy-we0g.onrender.com/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error('Error loading alerts:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Live socket message catch karo notification updates ke liye
    socket.on('task_changed', () => {
      fetchNotifications();
    });

    return () => {
      socket.off('task_changed');
    };
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      const token = localStorage.getItem('peppy_token');
      await axios.put(`https://peppy-we0g.onrender.com/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications(); // Panel refresh
    } catch (err) {
      console.error('Error marking read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="relative">
      {/* Trigger Bell Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative bg-slate-800 hover:bg-slate-700 text-slate-300 p-2.5 rounded-xl transition cursor-pointer"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Box */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 text-white max-h-96 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800/60">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Notifications</h3>
            {unreadCount > 0 && <span className="text-[10px] bg-red-500/10 text-red-400 font-bold px-2 py-0.5 rounded-md">{unreadCount} New</span>}
          </div>

          <div className="space-y-2">
            {notifications.map((notif) => (
              <div 
                key={notif._id} 
                onClick={() => handleMarkAsRead(notif._id)}
                className={`p-3 rounded-xl border transition cursor-pointer text-left relative group ${
                  notif.isRead 
                    ? 'bg-slate-950/40 border-slate-900/60 text-slate-400' 
                    : 'bg-slate-800/60 border-slate-700/30 text-slate-200 hover:border-slate-600'
                }`}
              >
                <div className="flex justify-between items-start gap-1 mb-1">
                  <span className="text-[11px] font-bold text-red-400">{notif.senderName}</span>
                  {!notif.isRead && <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0"></span>}
                </div>
                <p className="text-xs leading-normal">{notif.message}</p>
                <p className="text-[9px] text-slate-500 mt-1.5">Just now</p>
              </div>
            ))}

            {notifications.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-600 italic">No activity notifications yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;