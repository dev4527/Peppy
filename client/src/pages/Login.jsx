import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.success) {
      navigate('/dashboard'); // Direct user to the tracking engine area
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="bg-slate-800 w-full max-w-md p-8 rounded-2xl shadow-2xl border border-slate-700/60">
        
        {/* Branding header block */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black tracking-tight text-white">
            Peppy <span className="text-red-500">Tracker</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">Sign in with your corporate email account</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-xl mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Corporate Email</label>
            <input 
              type="email" 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 transition duration-150"
              placeholder="name@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 transition duration-150"
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-red-500/10 transition duration-150 active:scale-[0.99] mt-2"
          >
            Access Terminal
          </button>
        </form>

        {/* Dynamic Navigation Link Section */}
        <div className="text-center mt-6 pt-4 border-t border-slate-700/40">
          <p className="text-xs text-slate-400">
            New to the tracking system?{' '}
            <span 
              onClick={() => navigate('/register')} 
              className="text-red-400 hover:text-red-300 font-semibold hover:underline cursor-pointer transition duration-150"
            >
              Onboard your account
            </span>
          </p>
        </div>

      </div>
    </div>
  );
}

export default Login;