import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Employee');
  const [managerTarget, setManagerTarget] = useState(''); // 🧠 Tracks reporting manager mapping
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Safe Boundary: Agar role Employee hai, toh Manager choose karna strict mandatory hai
    if (role === 'Employee' && !managerTarget) {
      setError('Please select your reporting manager to assign your workspace team.');
      return;
    }

    try {
      // 🚀 Dispatching comprehensive corporate onboarding parameters straight to backend node
      await api.post('/api/auth/register', { name, email, password, role, managerTarget: role === 'Employee' ? managerTarget : undefined });
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/login'); // Sends them to sign in after successful onboarding
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="bg-slate-800 w-full max-w-md p-8 rounded-2xl shadow-2xl border border-slate-700/60">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black tracking-tight text-white">
            Peppy <span className="text-red-500">Onboarding</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">Register a new profile terminal account</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-xl mb-6 text-center font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs py-3 px-4 rounded-xl mb-6 text-center font-semibold">
            Account successfully generated! Redirecting to login terminal...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Full Name</label>
            <input 
              type="text" 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition duration-150"
              placeholder="John Doe" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Corporate Email</label>
            <input 
              type="email" 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition duration-150"
              placeholder="name@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Password</label>
            <input 
              type="password" 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition duration-150"
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* 👑 PREMIUM REFACTORED DESIGNATION ROLE DROPDOWN */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Company Role Designation</label>
            <select 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition duration-150 cursor-pointer"
              value={role}
              onChange={(e) => { setRole(e.target.value); setManagerTarget(''); }}
            >
              <option value="Employee">Regular Employee / Crew Member</option>
              <option value="CTO">CTO (Technical Head)</option>
              <option value="CMO">CMO (Marketing Head)</option>
              <option value="COO">COO (Operations Head)</option>
              <option value="CPO">CPO (Product Design Head)</option>
              <option value="Admin">Admin (CEO / Founder)</option>
            </select>
          </div>

          {/* 🌟 DYNAMIC CONDITIONAL SECTION: Opens seamlessly if user chooses Employee role */}
          {role === 'Employee' && (
            <div className="animate-fade-in space-y-1.5 bg-slate-900/40 p-3.5 border border-slate-700/40 rounded-xl">
              <label className="block text-xs font-bold text-red-400 uppercase tracking-wider">Select Reporting Executive Manager</label>
              <p className="text-[10px] text-slate-500 font-medium">This dynamically configures your access scope to matching teams.</p>
              <select 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 transition duration-150 cursor-pointer mt-1"
                value={managerTarget}
                onChange={(e) => setManagerTarget(e.target.value)}
                required
              >
                <option value="">-- Select Workspace Lead --</option>
                <option value="CTO">CTO &bull; (Technical Department Hub)</option>
                <option value="CMO">CMO &bull; (Marketing Division Deck)</option>
                <option value="COO">COO &bull; (Operational Infrastructure Team)</option>
                <option value="CPO">CPO &bull; (Product Strategy & Framework)</option>
              </select>
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-red-500/10 transition duration-150 active:scale-[0.99] mt-4 uppercase text-xs tracking-wider font-black"
          >
            Create Workspace Account
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs text-slate-400">
            Already registered? <Link to="/login" className="text-red-400 hover:underline">Sign into terminal</Link>
          </p>
        </div>

      </div>
    </div>
  );
}

export default Register;