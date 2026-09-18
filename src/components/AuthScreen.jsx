import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { signUp, signIn } from '../utils/db';

export default function AuthScreen({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    let result;
    if (isLogin) {
      result = await signIn(email, password);
    } else {
      result = await signUp(email, password);
    }
    
    setLoading(false);
    
    if (result.error) {
      setError(result.error);
    } else {
      onLogin(result.user);
    }
  };

  return (
    <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '32px', backgroundColor: 'rgba(28, 28, 33, 0.8)', backdropFilter: 'blur(12px)', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/favicon.png" alt="Cassete Logo" style={{ width: 80, height: 80, borderRadius: 16, objectFit: 'cover', marginBottom: '16px', boxShadow: '0 0 20px var(--accent-glow)' }} />
          <h2 style={{ fontSize: '2rem', fontWeight: '700', background: 'linear-gradient(135deg, var(--accent-primary), #d946ef)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Cassete
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            {isLogin ? 'Sign in to access your playlists' : 'Create an account to sync your playlists'}
          </p>
        </div>

        {error && (
          <div style={{ marginBottom: '24px', padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Email</label>
            <input 
              type="email" 
              className="input-field" 
              style={{ width: '100%' }}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Password</label>
            <input 
              type="password" 
              className="input-field" 
              style={{ width: '100%' }}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          
          <button type="submit" className="btn" style={{ width: '100%', marginTop: '8px' }} disabled={loading}>
            {loading ? <Loader2 size={20} style={{ animation: 'spin 2s linear infinite' }} /> : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(null); }} 
            style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: '600' }}
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}
