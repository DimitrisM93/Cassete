import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Only create the client if we have the variables, otherwise we'll handle the error in the UI
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Manage Anonymous User ID for Migration
const USER_ID_KEY = 'cassete_user_id';

export function getAnonymousId() {
  return localStorage.getItem(USER_ID_KEY);
}

// Global variable for current authenticated user
let currentUser = null;

export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;
  return currentUser;
}

export async function signUp(email, password) {
  if (!supabase) return { error: 'Supabase not configured' };
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  
  if (data.user) {
    currentUser = data.user;
    await migrateAnonymousData(data.user.id);
  }
  return { user: data.user };
}

export async function signIn(email, password) {
  if (!supabase) return { error: 'Supabase not configured' };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  
  if (data.user) {
    currentUser = data.user;
    await migrateAnonymousData(data.user.id);
  }
  return { user: data.user };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
  currentUser = null;
}

async function migrateAnonymousData(newUserId) {
  const anonId = getAnonymousId();
  if (anonId) {
    const { error } = await supabase
      .from('playlists')
      .update({ user_id: newUserId })
      .eq('user_id', anonId);
      
    if (error) {
      console.error('Error migrating playlists:', error);
    } else {
      console.log('Successfully migrated playlists to new account.');
      localStorage.removeItem(USER_ID_KEY);
    }
  }
}

// Database Operations

export async function fetchPlaylists() {
  if (!supabase) throw new Error('Supabase not configured');
  if (!currentUser) return [];
  
  const userId = currentUser.id;
  
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
    videos: videosData ? videosData
      .filter(v => v.playlist_id === p.id)
      .map(v => {
        const { video_id, ...rest } = v;
        return {
          ...rest,
          videoId: video_id
        };
      }) : []
  }));

  return playlists;
}

export async function createPlaylist(name) {
  if (!currentUser) return null;
  const playlistId = crypto.randomUUID();
  const newPlaylist = {
    id: playlistId,
    user_id: currentUser.id,
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
  if (!currentUser) return;
  const { error } = await supabase
    .from('playlists')
    .delete()
    .eq('id', id)
    .eq('user_id', currentUser.id); // extra safety

  if (error) {
    console.error('Error deleting playlist:', error);
  }
}

export async function renamePlaylist(id, newName) {
  if (!currentUser) return false;
  const { error } = await supabase
    .from('playlists')
    .update({ name: newName })
    .eq('id', id)
    .eq('user_id', currentUser.id);

  if (error) {
    console.error('Error renaming playlist:', error);
    return false;
  }
  return true;
}

// For videos, since we have drag and drop ordering, the easiest way to keep it in sync 
// is to delete all videos for a playlist and re-insert them, OR upsert them.
// We'll use upsert.
export async function updatePlaylistVideos(playlistId, videos) {
  // Add playlist_id and position to each video
  const videosToUpsert = videos.map((v, index) => {
    const { videoId, ...rest } = v;
    return {
      ...rest,
      video_id: videoId,
      playlist_id: playlistId,
      position: index
    };
  });
  
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
