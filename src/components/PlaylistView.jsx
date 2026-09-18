import React, { useState, useRef, useEffect } from 'react';
import YouTube from 'react-youtube';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, GripVertical, Trash2, ListVideo, Play, Pause, Music, Volume2, VolumeX } from 'lucide-react';
import { getVideoDetails } from '../utils/youtube';

export default function PlaylistView({ playlist, onUpdatePlaylist }) {
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const playerRef = useRef(null);

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

  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!newVideoUrl.trim()) return;

    setIsLoading(true);
    const videoDetails = await getVideoDetails(newVideoUrl);

    if (videoDetails) {
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
    } else if (event.data === 2) { // Paused
      setIsPlaying(false);
    } else if (event.data === 0) { // Ended
      setIsPlaying(false);
      onPlayerEnd();
    }
  };

  const onPlayerEnd = () => {
    if (currentVideoIndex < playlist.videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  };

  const togglePlayPause = () => {
    if (playerRef.current) {
      const state = playerRef.current.getPlayerState();
      if (state === 1) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
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

  const currentVideo = playlist.videos[currentVideoIndex];

  return (
    <div className="playlist-view">
      <div className="playlist-header">
        <h2>{playlist.name}</h2>
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
      </div>

      {currentVideo && (
        <div className="audio-player-wrapper">
          {/* Hide the actual video player off-screen */}
          <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '200px', height: '200px' }}>
            <YouTube
              videoId={currentVideo.videoId}
              opts={{
                width: '200',
                height: '200',
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
                <div className="volume-container">
                  {volume === 0 ? <VolumeX size={20} className="text-muted" /> : <Volume2 size={20} className="text-muted" />}
                  <input
                    type="range"
                    className="volume-slider"
                    min={0}
                    max={100}
                    value={volume}
                    onChange={handleVolumeChange}
                  />
                </div>

                <button className="play-pause-btn" onClick={togglePlayPause}>
                  {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
                </button>
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

                            <button
                              className="remove-video-btn"
                              onClick={(e) => handleRemoveVideo(index, e)}
                              title="Remove from playlist"
                            >
                              <Trash2 size={18} />
                            </button>
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
