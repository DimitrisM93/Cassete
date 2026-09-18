import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PlaylistView from './components/PlaylistView';
import { fetchPlaylists, createPlaylist, deletePlaylist, updatePlaylistVideos } from './utils/db';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [playlists, setPlaylists] = useState([]);
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const loadedPlaylists = await fetchPlaylists();
        setPlaylists(loadedPlaylists);
        if (loadedPlaylists.length > 0) {
          setActivePlaylistId(loadedPlaylists[0].id);
        }
      } catch (err) {
        if (err.message === 'Supabase not configured') {
          setIsConfigured(false);
        }
      }
      setIsLoaded(true);
    }
    loadData();
  }, []);

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

  return (
    <div className="app-container">
      <Sidebar 
        playlists={playlists}
        activePlaylistId={activePlaylistId}
        onSelectPlaylist={setActivePlaylistId}
        onCreatePlaylist={handleCreatePlaylist}
        onDeletePlaylist={handleDeletePlaylist}
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
            <h2>Welcome to YT Playlists</h2>
            <p>Create a playlist to start adding videos.</p>
          </div>
        )}
      </main>
    </div>
  );
}
