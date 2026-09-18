import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, LogOut, User } from 'lucide-react';

export default function Sidebar({ playlists, activePlaylistId, onSelectPlaylist, onCreatePlaylist, onDeletePlaylist, onRenamePlaylist, onSignOut, userEmail }) {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
    }
  };

  const startEditing = (playlist, e) => {
    e.stopPropagation();
    setEditingId(playlist.id);
    setEditingName(playlist.name);
  };

  const handleRename = (e) => {
    e.stopPropagation();
    if (editingName.trim() && editingName.trim() !== playlists.find(p => p.id === editingId)?.name) {
      onRenamePlaylist(editingId, editingName.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src="/favicon.png" alt="Logo" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
        <h1>Cassete</h1>
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
              {editingId === playlist.id ? (
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }} onClick={e => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRename(e);
                      if (e.key === 'Escape') cancelEditing(e);
                    }}
                    autoFocus
                    style={{ flex: 1, minWidth: 0, background: 'transparent', color: 'inherit', border: 'none', borderBottom: '1px solid var(--accent-primary)', outline: 'none', padding: '2px 0' }}
                  />
                  <button className="delete-btn" onClick={handleRename} style={{ opacity: 1, padding: '2px' }}><Check size={16} /></button>
                  <button className="delete-btn" onClick={cancelEditing} style={{ opacity: 1, padding: '2px' }}><X size={16} /></button>
                </div>
              ) : (
                <>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {playlist.name}
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      className="delete-btn"
                      onClick={(e) => startEditing(playlist, e)}
                      title="Rename playlist"
                    >
                      <Edit2 size={16} />
                    </button>
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
                </>
              )}
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

      <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <User size={16} />
          <span style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</span>
        </div>
        <button onClick={onSignOut} className="delete-btn" title="Sign Out" style={{ opacity: 1, padding: '4px' }}>
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
