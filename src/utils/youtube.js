export function extractVideoId(url) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : false;
}

// Simple fallback since we don't have a YouTube Data API key
export async function getVideoDetails(url) {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  try {
    // Try to fetch via oEmbed to get the title
    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await response.json();
    
    return {
      id: crypto.randomUUID(),
      videoId: videoId,
      url: url,
      title: data.title || `YouTube Video (${videoId})`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    };
  } catch (error) {
    console.error("Error fetching video details", error);
    return {
      id: crypto.randomUUID(),
      videoId: videoId,
      url: url,
      title: `YouTube Video (${videoId})`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    };
  }
}
