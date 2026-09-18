import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Manage Anonymous User ID
const USER_ID_KEY = 'cassete_user_id';

export function getUserId() {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

// Database Operations

export async function fetchPlaylists() {
  const userId = getUserId();
  
  // Get playlists
  const { data: playlistsData, error: playlistsError } = await supabase
    .from('playlists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (playlistsError) {
    console.error('Error fetching playlists:', playlistsError);
    return [];
  }

  // Get videos for all playlists
  const { data: videosData, error: videosError } = await supabase
    .from('videos')
    .select('*')
    .in('playlist_id', playlistsData.map(p => p.id))
    .order('position', { ascending: true });
    
  if (videosError) {
    console.error('Error fetching videos:', videosError);
  }

  // Assemble the shape: { id, name, videos: [] }
  const playlists = playlistsData.map(p => ({
    id: p.id,
    name: p.name,
    videos: videosData ? videosData.filter(v => v.playlist_id === p.id) : []
  }));

  return playlists;
}

export async function createPlaylist(name) {
  const playlistId = crypto.randomUUID();
  const newPlaylist = {
    id: playlistId,
    user_id: getUserId(),
    name: name
  };

  const { error } = await supabase
    .from('playlists')
    .insert([newPlaylist]);

  if (error) {
    console.error('Error creating playlist:', error);
    return null;
  }
  
  return { ...newPlaylist, videos: [] };
}

export async function deletePlaylist(id) {
  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', id)
    .eq('user_id', getUserId()); // extra safety

  if (error) {
    console.error('Error deleting playlist:', error);
  }
}

// For videos, since we have drag and drop ordering, the easiest way to keep it in sync 
// is to delete all videos for a playlist and re-insert them, OR upsert them.
// We'll use upsert.
export async function updatePlaylistVideos(playlistId, videos) {
  // Add playlist_id and position to each video
  const videosToUpsert = videos.map((v, index) => ({
    ...v,
    playlist_id: playlistId,
    position: index
  }));
  
  // First, delete videos that are no longer in the list
  const currentVideoIds = videos.map(v => v.id);
  
  if (currentVideoIds.length > 0) {
    await supabase
      .from('videos')
      .delete()
      .eq('playlist_id', playlistId)
      .not('id', 'in', `(${currentVideoIds.join(',')})`);
  } else {
    // If the list is empty, delete all videos for this playlist
    await supabase
      .from('videos')
      .delete()
      .eq('playlist_id', playlistId);
  }

  // Then upsert the current videos
  if (videosToUpsert.length > 0) {
    const { error } = await supabase
      .from('videos')
      .upsert(videosToUpsert, { onConflict: 'id' });
      
    if (error) {
      console.error('Error updating videos:', error);
    }
  }
}
