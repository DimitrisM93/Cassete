import React, { useState, useRef, useEffect } from 'react';
import YouTube from 'react-youtube';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Plus, GripVertical, Trash2, ListVideo, Play, Pause, Music, Volume2, VolumeX, SkipBack, SkipForward, Shuffle, Repeat1, Download, Loader2 } from 'lucide-react';
import { getVideoDetails, extractVideoId } from '../utils/youtube';

export default function PlaylistView({ playlist, onUpdatePlaylist }) {
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [duplicateError, setDuplicateError] = useState('');
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeatSong, setIsRepeatSong] = useState(false);
  const [endedSignal, setEndedSignal] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const playerRef = useRef(null);
  const bgAudioRef = useRef(null);
  const currentVideo = playlist.videos[currentVideoIndex];

  const stateRef = useRef({ currentTime, currentVideoIndex, playlist, isShuffle, isRepeatSong });

  useEffect(() => {
    stateRef.current = { currentTime, currentVideoIndex, playlist, isShuffle, isRepeatSong };
  });

  // Set Media Session metadata
  useEffect(() => {
    if ('mediaSession' in navigator && currentVideo) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentVideo.title,
        artist: playlist.name || 'Cassete',
        artwork: [
          { src: currentVideo.thumbnail, sizes: '512x512', type: 'image/jpeg' }
        ]
      });
    }
  }, [currentVideo, playlist.name]);

  // Set Media Session action handlers
  useEffect(() => {
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => {
          if (playerRef.current) playerRef.current.playVideo();
          if (bgAudioRef.current) bgAudioRef.current.play().catch(() => {});
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          if (playerRef.current) playerRef.current.pauseVideo();
          if (bgAudioRef.current) bgAudioRef.current.pause();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          const { currentTime, currentVideoIndex } = stateRef.current;
          if (currentTime > 3) {
            if (playerRef.current) playerRef.current.seekTo(0, true);
          } else if (currentVideoIndex > 0) {
            setCurrentVideoIndex(currentVideoIndex - 1);
          }
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          const { currentVideoIndex, playlist, isShuffle, isRepeatSong } = stateRef.current;
          if (isShuffle) {
            const nextIndex = Math.floor(Math.random() * playlist.videos.length);
            setCurrentVideoIndex(nextIndex);
          } else if (currentVideoIndex < playlist.videos.length - 1) {
            setCurrentVideoIndex(currentVideoIndex + 1);
          } else if (isRepeatSong) {
            if (playerRef.current) {
              playerRef.current.seekTo(0, true);
              playerRef.current.playVideo();
            }
          }
        });
      } catch (error) {
        console.error("MediaSession action handlers not supported", error);
      }
    }
  }, []);

  // Progress tracker
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(async () => {
        if (playerRef.current) {
          const time = await playerRef.current.getCurrentTime();
          const dur = await playerRef.current.getDuration();
          if (time !== undefined) setCurrentTime(time);
          if (dur !== undefined) setDuration(dur);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Reset index when playlist changes
  useEffect(() => {
    setCurrentVideoIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [playlist.id]);

  // Clear duplicate error when typing
  useEffect(() => {
    if (duplicateError) setDuplicateError('');
  }, [newVideoUrl]);

  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!newVideoUrl.trim()) return;

    const videoId = extractVideoId(newVideoUrl);
    if (videoId) {
      const isDuplicate = playlist.videos.some(v => v.videoId === videoId);
      if (isDuplicate) {
        setDuplicateError("This song is already in the playlist!");
        return;
      }
    }

    setIsLoading(true);
    const videoDetails = await getVideoDetails(newVideoUrl);

    if (videoDetails) {
      const isDuplicate = playlist.videos.some(v => v.videoId === videoDetails.videoId);
      if (isDuplicate) {
        setDuplicateError("This song is already in the playlist!");
        setIsLoading(false);
        return;
      }
      
      const updatedVideos = [...playlist.videos, videoDetails];
      onUpdatePlaylist({ ...playlist, videos: updatedVideos });
      setNewVideoUrl('');
    } else {
      alert("Invalid YouTube URL");
    }
    setIsLoading(false);
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(playlist.videos);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // If we moved the currently playing video, update the index so it keeps playing smoothly
    // or if we moved a video above/below the currently playing one.
    let newIndex = currentVideoIndex;
    if (result.source.index === currentVideoIndex) {
      newIndex = result.destination.index;
    } else if (result.source.index < currentVideoIndex && result.destination.index >= currentVideoIndex) {
      newIndex--;
    } else if (result.source.index > currentVideoIndex && result.destination.index <= currentVideoIndex) {
      newIndex++;
    }

    setCurrentVideoIndex(newIndex);
    onUpdatePlaylist({ ...playlist, videos: items });
  };

  const handleRemoveVideo = (index, e) => {
    e.stopPropagation();
    const updatedVideos = [...playlist.videos];
    updatedVideos.splice(index, 1);

    let newIndex = currentVideoIndex;
    if (index < currentVideoIndex) {
      newIndex--;
    } else if (index === currentVideoIndex) {
      // If we deleted the current video, play the next one (which is now at currentVideoIndex)
      // or the previous one if we deleted the last video
      if (currentVideoIndex >= updatedVideos.length) {
        newIndex = Math.max(0, updatedVideos.length - 1);
      }
    }

    setCurrentVideoIndex(newIndex);
    onUpdatePlaylist({ ...playlist, videos: updatedVideos });
  };

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    event.target.setVolume(volume);
  };

  const onPlayerStateChange = (event) => {
    if (event.data === 1) { // Playing
      setIsPlaying(true);
      event.target.setPlaybackQuality('small'); // Attempt to force low data
      if (bgAudioRef.current) {
        bgAudioRef.current.play().catch(e => console.log('Audio play failed', e));
      }
    } else if (event.data === 2) { // Paused
      setIsPlaying(false);
      if (bgAudioRef.current) bgAudioRef.current.pause();
    } else if (event.data === 0) { // Ended
      setIsPlaying(false);
      if (bgAudioRef.current) bgAudioRef.current.pause();
      onPlayerEnd();
    }
  };

  const onPlayerEnd = () => {
    setEndedSignal(prev => prev + 1);
  };

  useEffect(() => {
    if (endedSignal > 0) {
      if (isRepeatSong) {
        if (playerRef.current) {
          playerRef.current.seekTo(0, true);
          playerRef.current.playVideo();
        }
      } else {
        handleNext();
      }
    }
  }, [endedSignal]);

  const handlePrevious = () => {
    if (currentTime > 3) {
      if (playerRef.current) playerRef.current.seekTo(0, true);
    } else if (currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    }
  };

  const handleNext = () => {
    if (isShuffle) {
      const nextIndex = Math.floor(Math.random() * playlist.videos.length);
      setCurrentVideoIndex(nextIndex);
    } else if (currentVideoIndex < playlist.videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    } else if (isRepeatSong) {
      if (playerRef.current) {
        playerRef.current.seekTo(0, true);
        playerRef.current.playVideo();
      }
    }
  };

  const togglePlayPause = () => {
    if (playerRef.current) {
      const state = playerRef.current.getPlayerState();
      if (state === 1) {
        playerRef.current.pauseVideo();
        if (bgAudioRef.current) bgAudioRef.current.pause();
      } else {
        playerRef.current.playVideo();
        if (bgAudioRef.current) {
          bgAudioRef.current.play().catch(e => console.log('Audio play failed', e));
        }
      }
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (playerRef.current) {
      playerRef.current.seekTo(newTime, true);
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    if (playerRef.current) {
      playerRef.current.setVolume(newVol);
    }
  };

  const handleDownloadSong = async (video, e) => {
    if (e) e.stopPropagation();
    try {
      setIsDownloading(true);
      setDownloadProgress(`Downloading: ${video.title}`);
      
      const response = await fetch(`/api/download?videoId=${video.videoId}`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      saveAs(blob, `${video.title}.mp3`);
      
    } catch (err) {
      console.error(err);
      alert('Failed to download song');
    } finally {
      setIsDownloading(false);
      setDownloadProgress('');
    }
  };

  const handleDownloadPlaylist = async () => {
    if (playlist.videos.length === 0) return;
    
    try {
      setIsDownloading(true);
      const zip = new JSZip();
      
      for (let i = 0; i < playlist.videos.length; i++) {
        const video = playlist.videos[i];
        setDownloadProgress(`Zipping ${i + 1}/${playlist.videos.length}: ${video.title}`);
        
        const response = await fetch(`/api/download?videoId=${video.videoId}`);
        if (!response.ok) throw new Error(`Failed to download ${video.title}`);
        
        const blob = await response.blob();
        zip.file(`${i + 1}. ${video.title}.mp3`, blob);
      }
      
      setDownloadProgress(`Finalizing zip...`);
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${playlist.name}.zip`);
      
    } catch (err) {
      console.error(err);
      alert('Failed to download playlist. Please try again.');
    } finally {
      setIsDownloading(false);
      setDownloadProgress('');
    }
  };

  return (
    <div className="playlist-view">
      <div className="playlist-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0 }}>{playlist.name}</h2>
          {playlist.videos.length > 0 && (
            <button 
              className="btn btn-secondary" 
              onClick={handleDownloadPlaylist} 
              disabled={isDownloading}
            >
              <Download size={18} /> Download All
            </button>
          )}
        </div>
        <div style={{ width: '100%' }}>
          <form onSubmit={handleAddVideo} className="input-group">
            <input
              type="text"
              className="input-field"
              placeholder="Paste YouTube URL here..."
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" className="btn" disabled={isLoading}>
              {isLoading ? 'Adding...' : <><Plus size={20} /> Add Song</>}
            </button>
          </form>
          {duplicateError && (
            <div className="duplicate-banner" style={{ marginTop: '12px', padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.9rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.2s ease-out' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {duplicateError}
            </div>
          )}
          {downloadProgress && (
            <div className="download-banner" style={{ marginTop: '12px', padding: '12px 16px', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-primary)', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)', fontSize: '0.9rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeIn 0.2s ease-out' }}>
              <Loader2 size={16} className="spin-icon" style={{ animation: 'spin 2s linear infinite' }} />
              {downloadProgress}
            </div>
          )}
        </div>
      </div>

      {currentVideo && (
        <div className="audio-player-wrapper">
          {/* Keep the actual video player in the viewport but visually hidden to allow background/off-screen playback */}
          <div style={{ position: 'fixed', top: '0', left: '0', width: '10px', height: '10px', opacity: 0, pointerEvents: 'none', zIndex: -10 }}>
            <YouTube
              videoId={currentVideo.videoId}
              opts={{
                width: '10',
                height: '10',
                playerVars: {
                  autoplay: 1, // Try to autoplay
                  modestbranding: 1,
                  rel: 0,
                  vq: 'tiny' // Suggest lowest quality
                },
              }}
              onReady={onPlayerReady}
              onStateChange={onPlayerStateChange}
            />
          </div>
          
          {/* Silent audio element to keep background process alive on mobile */}
          <audio 
            ref={bgAudioRef} 
            loop 
            src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" 
            style={{ display: 'none' }} 
            playsInline
          />

          {/* Custom Audio Bar UI */}
          <div className="audio-bar">
            <div className="audio-bar-content">
              <div className="audio-bar-thumb-wrapper">
                <img src={currentVideo.thumbnail} alt="" className="audio-bar-thumb" />
                {isPlaying && (
                  <div className="audio-wave">
                    <Music size={24} className="music-icon floating" />
                  </div>
                )}
              </div>

              <div className="audio-bar-info">
                <span className="now-playing-label">DATA SAVER AUDIO MODE</span>
                <h3>{currentVideo.title}</h3>

                <div className="progress-container">
                  <span className="time-text">{formatTime(currentTime)}</span>
                  <input
                    type="range"
                    className="progress-slider"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                  />
                  <span className="time-text">{formatTime(duration)}</span>
                </div>
              </div>

              <div className="audio-controls">
                <button className={`control-btn ${isShuffle ? 'active' : ''}`} onClick={() => setIsShuffle(!isShuffle)} title="Shuffle">
                  <Shuffle size={18} />
                </button>
                <button className="control-btn" onClick={handlePrevious} title="Previous">
                  <SkipBack size={20} fill="currentColor" />
                </button>
                <button className="play-pause-btn" onClick={togglePlayPause}>
                  {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
                </button>
                <button className="control-btn" onClick={handleNext} title="Next">
                  <SkipForward size={20} fill="currentColor" />
                </button>
                <button className={`control-btn ${isRepeatSong ? 'active' : ''}`} onClick={() => setIsRepeatSong(!isRepeatSong)} title="Repeat Song">
                  <Repeat1 size={18} />
                </button>

                <div className="volume-container" style={{ marginLeft: '16px' }}>
                  {volume === 0 ? <VolumeX size={18} className="text-muted" /> : <Volume2 size={18} className="text-muted" />}
                  <input
                    type="range"
                    className="volume-slider"
                    min={0}
                    max={100}
                    value={volume}
                    onChange={handleVolumeChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="video-list-container">
        {playlist.videos.length === 0 ? (
          <div className="empty-state">
            <ListVideo size={48} />
            <p>No videos in this playlist yet.</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="videos">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {playlist.videos.map((video, index) => {
                    const isPlaying = index === currentVideoIndex;
                    return (
                      <Draggable key={video.id} draggableId={video.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`video-item ${isPlaying ? 'playing' : ''}`}
                            onClick={() => setCurrentVideoIndex(index)}
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.8 : 1,
                            }}
                          >
                            <div {...provided.dragHandleProps} className="drag-handle" onClick={e => e.stopPropagation()}>
                              <GripVertical size={20} />
                            </div>

                            <div className="video-thumbnail">
                              <img src={video.thumbnail} alt={video.title} />
                              {isPlaying && (
                                <div className="playing-indicator">
                                  <Play size={24} fill="currentColor" />
                                </div>
                              )}
                            </div>

                            <div className="video-info">
                              <div className={`video-title ${isPlaying ? 'playing-text' : ''}`} title={video.title}>
                                {video.title}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                className="remove-video-btn"
                                onClick={(e) => handleDownloadSong(video, e)}
                                title="Download MP3"
                                disabled={isDownloading}
                                style={{ color: 'var(--accent-primary)' }}
                              >
                                <Download size={18} />
                              </button>
                              <button
                                className="remove-video-btn"
                                onClick={(e) => handleRemoveVideo(index, e)}
                                title="Remove from playlist"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </div>
  );
}
