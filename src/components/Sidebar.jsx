import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function Sidebar({ playlists, activePlaylistId, onSelectPlaylist, onCreatePlaylist, onDeletePlaylist }) {
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src="/favicon.png" alt="Logo" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
        <h1>YT Playlists</h1>
      </div>
      
      <div className="playlists-container">
        {playlists.length === 0 ? (
          <div className="text-muted" style={{ fontSize: '0.875rem', textAlign: 'center', marginTop: '20px' }}>
            No playlists yet.<br/>Create one below.
          </div>
        ) : (
          playlists.map(playlist => (
            <div 
              key={playlist.id}
              className={`playlist-nav-item ${playlist.id === activePlaylistId ? 'active' : ''}`}
              onClick={() => onSelectPlaylist(playlist.id)}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {playlist.name}
              </span>
              <button 
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePlaylist(playlist.id);
                }}
                title="Delete playlist"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="add-playlist-container">
        <form onSubmit={handleCreate} className="input-group">
          <input
            type="text"
            className="input-field"
            placeholder="New Playlist..."
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
          />
          <button type="submit" className="btn" style={{ padding: '12px' }} title="Create Playlist">
            <Plus size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
