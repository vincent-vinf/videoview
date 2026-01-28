import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import VideoPlayer from './VideoPlayer'
import Timeline from './Timeline'
import './App.css'
import videojs from 'video.js'
import { formatDistanceToNow } from 'date-fns'

const API_BASE_URL = `http://${window.location.hostname}:8081`

function App() {
  const [videos, setVideos] = useState([])
  const [currentVideo, setCurrentVideo] = useState(null)
  const [error, setError] = useState(null)
  const playerRef = useRef(null)
  const [seekToTime, setSeekToTime] = useState(null)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/videos`)
        // Sort videos by timestamp descending (newest first)
        const sortedVideos = response.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        setVideos(sortedVideos)
        if (sortedVideos.length > 0) {
          setCurrentVideo(sortedVideos[0])
        }
      } catch (err) {
        console.error("Error fetching videos:", err)
        setError("Failed to load video list. Ensure backend is running.")
      }
    }

    fetchVideos()
  }, [])

  const handleVideoSelect = (video) => {
    setCurrentVideo(video)
    setSeekToTime(null) // Reset seek time on manual select
  }

  const handleTimelineSelect = (video, time) => {
    if (currentVideo && currentVideo.url === video.url) {
      // Same video, just seek
      if (playerRef.current) {
        playerRef.current.currentTime(time);
        playerRef.current.play();
      }
    } else {
      // Change video and set seek time
      setCurrentVideo(video);
      setSeekToTime(time);
    }
  };

  const handlePlayerReady = (player) => {
    playerRef.current = player;

    // You can handle player events here, for example:
    player.on('waiting', () => {
      videojs.log('player is waiting');
    });

    player.on('dispose', () => {
      videojs.log('player will dispose');
    });

    player.on('loadedmetadata', () => {
      if (seekToTime !== null) {
        player.currentTime(seekToTime);
        player.play();
        setSeekToTime(null);
      }
    });
  };

  return (
    <div className="container">
      <header>
        <h1>MP4 Video Player</h1>
      </header>

      <main className="main-content">
        <div className="video-player-section">
          {currentVideo ? (
            <div className="video-wrapper">
              <h2>{currentVideo.cameraName} - {formatDistanceToNow(new Date(currentVideo.timestamp), { addSuffix: true })}</h2>
              <VideoPlayer
                options={{
                  autoplay: false,
                  controls: true,
                  responsive: true,
                  fill: true,
                  playbackRates: [0.5, 1, 1.5, 2, 5, 10],
                  sources: [{
                    src: `${API_BASE_URL}${currentVideo.url}`,
                    type: 'video/mp4'
                  }]
                }}
                onReady={handlePlayerReady}
              />
            </div>
          ) : (
            <div className="placeholder">
              <p>Select a video to play</p>
            </div>
          )}
        </div>

        <div className="timeline-section">
          <Timeline videos={videos} onSelectTime={handleTimelineSelect} />
        </div>

        <div className="video-list-section">
          <h3>Available Videos</h3>
          {error && <p className="error">{error}</p>}
          {videos.length === 0 && !error ? (
            <p>No videos found.</p>
          ) : (
            <ul className="video-list">
              {videos.map((video) => (
                <li
                  key={video.url}
                  className={`video-item ${currentVideo && currentVideo.url === video.url ? 'active' : ''}`}
                  onClick={() => handleVideoSelect(video)}
                >
                  {video.thumbnailUrl && (
                    <img
                      src={`${API_BASE_URL}${video.thumbnailUrl}`}
                      alt={video.name}
                      className="video-thumbnail"
                    />
                  )}
                  <div className="video-info">
                    <span className="video-camera">{video.cameraName}</span>
                    <span className="video-time">
                      {formatDistanceToNow(new Date(video.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
