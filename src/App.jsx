import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import AuthScreen from './components/AuthScreen';
import PlaylistView from './components/PlaylistView';
import { fetchPlaylists, createPlaylist, deletePlaylist, updatePlaylistVideos, renamePlaylist, getSession, signOut, migrateAnonymousData, supabase } from './utils/db';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [playlists, setPlaylists] = useState([]);
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [isConfigured, setIsConfigured] = useState(true);

  const [user, setUser] = useState(null);

  const loadData = async () => {
    const loadedPlaylists = await fetchPlaylists();
    setPlaylists(loadedPlaylists);
    if (loadedPlaylists.length > 0) {
      setActivePlaylistId(loadedPlaylists[0].id);
    } else {
      setActivePlaylistId(null);
    }
    setIsLoaded(true);
  };

  useEffect(() => {
    async function init() {
      try {
        const sessionUser = await getSession();
        if (sessionUser) {
          setUser(sessionUser);
          await migrateAnonymousData(sessionUser.id);
          await loadData();
        } else {
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('Init error:', err);
        if (err.message === 'Supabase not configured') {
          setIsConfigured(false);
        }
        setIsLoaded(true);
      }
    }
    init();

    // Listen to Auth state changes to correctly handle login via Magic Link/Verification Link
    let subscription;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user && !user) {
          setUser(session.user);
          await migrateAnonymousData(session.user.id);
          await loadData();
        } else if (!session?.user && user) {
          setUser(null);
          setPlaylists([]);
          setActivePlaylistId(null);
          setIsLoaded(true);
        }
      });
      subscription = data.subscription;
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogin = async (sessionUser) => {
    setIsLoaded(false);
    setUser(sessionUser);
    await loadData();
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setPlaylists([]);
    setActivePlaylistId(null);
  };

  const handleCreatePlaylist = async (name) => {
    const newPlaylist = await createPlaylist(name);
    if (newPlaylist) {
      setPlaylists(prev => [...prev, newPlaylist]);
      setActivePlaylistId(newPlaylist.id);
    }
  };

  const handleDeletePlaylist = async (id) => {
    await deletePlaylist(id);
    setPlaylists(prev => {
      const filtered = prev.filter(p => p.id !== id);
      if (activePlaylistId === id) {
        setActivePlaylistId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const handleRenamePlaylist = async (id, newName) => {
    const success = await renamePlaylist(id, newName);
    if (success) {
      setPlaylists(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
    }
  };

  const handleUpdatePlaylist = async (updatedPlaylist) => {
    setPlaylists(prev => prev.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p));
    await updatePlaylistVideos(updatedPlaylist.id, updatedPlaylist.videos);
  };

  const activePlaylist = playlists.find(p => p.id === activePlaylistId);

  if (!isConfigured) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', flexDirection: 'column' }}>
        <img src="/favicon.png" alt="Cassete Logo" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', marginBottom: '16px' }} />
        <h2>Database Not Configured</h2>
        <p style={{ maxWidth: '400px', textAlign: 'center', color: 'var(--text-muted)', marginTop: '8px' }}>
          It looks like the Supabase Environment Variables are missing. Make sure to add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel and redeploy the app!
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="app-container" style={{ alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw' }}>
        <Loader2 size={48} color="var(--accent-primary)" style={{ animation: 'spin 2s linear infinite' }} />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <Sidebar 
        playlists={playlists}
        activePlaylistId={activePlaylistId}
        onSelectPlaylist={setActivePlaylistId}
        onCreatePlaylist={handleCreatePlaylist}
        onDeletePlaylist={handleDeletePlaylist}
        onRenamePlaylist={handleRenamePlaylist}
        onSignOut={handleSignOut}
        userEmail={user?.email}
      />
      <main className="main-content">
        {activePlaylist ? (
          <PlaylistView 
            playlist={activePlaylist} 
            onUpdatePlaylist={handleUpdatePlaylist}
          />
        ) : (
          <div className="empty-state">
            <img src="/favicon.png" alt="Cassete Logo" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', marginBottom: '16px' }} />
            <h2>Welcome to Cassete</h2>
            <p>Create a playlist to start adding videos.</p>
          </div>
        )}
      </main>
    </div>
  );
}
