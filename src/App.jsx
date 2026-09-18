import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import PlaylistView from './components/PlaylistView';
import { getPlaylists, savePlaylists } from './utils/storage';
import { PlaySquare } from 'lucide-react';

export default function App() {
  const [playlists, setPlaylists] = useState([]);
  const [activePlaylistId, setActivePlaylistId] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadedPlaylists = getPlaylists();
    setPlaylists(loadedPlaylists);
    if (loadedPlaylists.length > 0) {
      setActivePlaylistId(loadedPlaylists[0].id);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      savePlaylists(playlists);
    }
  }, [playlists, isLoaded]);

  const handleCreatePlaylist = (name) => {
    const newPlaylist = {
      id: crypto.randomUUID(),
      name,
      videos: []
    };
    setPlaylists(prev => [...prev, newPlaylist]);
    setActivePlaylistId(newPlaylist.id);
  };

  const handleDeletePlaylist = (id) => {
    setPlaylists(prev => {
      const filtered = prev.filter(p => p.id !== id);
      if (activePlaylistId === id) {
        setActivePlaylistId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const handleUpdatePlaylist = (updatedPlaylist) => {
    setPlaylists(prev => prev.map(p => p.id === updatedPlaylist.id ? updatedPlaylist : p));
  };

  const activePlaylist = playlists.find(p => p.id === activePlaylistId);

  if (!isLoaded) return null;

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
            <PlaySquare size={64} />
            <h2>Welcome to YT Playlists</h2>
            <p>Create a playlist to start adding videos.</p>
          </div>
        )}
      </main>
    </div>
  );
}
