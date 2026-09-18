import ytdl from '@distube/ytdl-core';

export default async function handler(req, res) {
  // Add CORS headers so the frontend can fetch the blob
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { videoId } = req.query;
  
  if (!videoId) {
    return res.status(400).json({ error: 'Missing videoId parameter' });
  }

  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    // We get basic info to optionally name the file, but we'll just stream it directly
    const info = await ytdl.getBasicInfo(url);
    const title = info.videoDetails.title.replace(/[^\w\s]/gi, ''); // sanitize filename

    res.setHeader('Content-Type', 'audio/mpeg'); // or audio/mp4 depending on format, but mpeg is safe for clients to process
    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp3"`);

    // Download best audio format
    const stream = ytdl(url, { filter: 'audioonly', quality: 'highestaudio' });

    stream.pipe(res);

    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download audio stream' });
      } else {
        res.end();
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
