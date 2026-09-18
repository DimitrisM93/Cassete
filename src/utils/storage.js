const PLAYLISTS_KEY = 'yt_custom_playlists';

export function getPlaylists() {
  const data = localStorage.getItem(PLAYLISTS_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse playlists from local storage', e);
      return [];
    }
  }
  return [];
}

export function savePlaylists(playlists) {
  localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
}
