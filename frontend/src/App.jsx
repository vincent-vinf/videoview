import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import VideoPlayer from './VideoPlayer'
import Timeline from './Timeline'
import './App.css'
import videojs from 'video.js'
import { formatDistanceToNow } from 'date-fns'

const API_BASE_URL = `/api`

function App() {
  const [videos, setVideos] = useState([])
  const [currentVideo, setCurrentVideo] = useState(null)
  const [isLiveMode, setIsLiveMode] = useState(false)
  const [error, setError] = useState(null)
  const playerRef = useRef(null)
  const [seekToTime, setSeekToTime] = useState(null)
  const [selectedCamera, setSelectedCamera] = useState('')

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/videos`)
        // Sort videos by timestamp descending (newest first)
        const sortedVideos = response.data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        setVideos(sortedVideos)

        if (sortedVideos.length > 0) {
          // Extract unique cameras
          const cameras = [...new Set(sortedVideos.map(v => v.cameraName))].sort()
          if (cameras.length > 0) {
            setSelectedCamera(cameras[0])
            // Set current video to the first video of the first camera
            const firstCameraVideos = sortedVideos.filter(v => v.cameraName === cameras[0])
            if (firstCameraVideos.length > 0) {
              setCurrentVideo(firstCameraVideos[0])
            }
          }
        }
      } catch (err) {
        console.error("Error fetching videos:", err)
        setError("Failed to load video list. Ensure backend is running.")
      }
    }

    fetchVideos()
  }, [])

  // Filter videos based on selected camera
  const filteredVideos = videos.filter(v => v.cameraName === selectedCamera)

  // Get unique cameras for dropdown
  const cameras = [...new Set(videos.map(v => v.cameraName))].sort()

  const handleCameraChange = (e) => {
    const newCamera = e.target.value
    setSelectedCamera(newCamera)
    setIsLiveMode(false)

    // Switch to the latest video of the selected camera
    const cameraVideos = videos.filter(v => v.cameraName === newCamera)
    if (cameraVideos.length > 0) {
      setCurrentVideo(cameraVideos[0])
    }
  }

  const handleVideoSelect = (video) => {
    setCurrentVideo(video)
    setIsLiveMode(false)
    setSeekToTime(null) // Reset seek time on manual select
  }

  const handleTimelineSelect = (video, time) => {
    if (currentVideo && currentVideo.url === video.url && !isLiveMode) {
      // Same video, just seek
      if (playerRef.current) {
        playerRef.current.currentTime(time);
        playerRef.current.play();
      }
    } else {
      // Change video and set seek time
      setCurrentVideo(video);
      setIsLiveMode(false);
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

  // Construct live URL
  const liveUrl = currentVideo ? `http://${window.location.hostname}:8888/${currentVideo.cameraName}/` : ''

  return (
    <div className="container">
      <header>
        <h1>MP4 Video Player</h1>
        <div className="camera-selector">
          <select
            value={selectedCamera}
            onChange={handleCameraChange}
            disabled={cameras.length === 0}
          >
            {cameras.map(camera => (
              <option key={camera} value={camera}>{camera}</option>
            ))}
          </select>
        </div>
      </header>

      <main className="main-content">
        <div className="video-player-section">
          {currentVideo ? (
            <div className="video-wrapper">
              <h2>{currentVideo.cameraName} - {isLiveMode ? 'LIVE' : formatDistanceToNow(new Date(currentVideo.timestamp), { addSuffix: true })}</h2>
              <VideoPlayer
                key={isLiveMode ? 'live' : 'recorded'}
                options={{
                  autoplay: isLiveMode,
                  controls: true,
                  responsive: true,
                  fill: true,
                  playbackRates: [0.5, 1, 1.5, 2, 5, 10],
                  sources: [{
                    src: isLiveMode ? liveUrl : `${currentVideo.url}`,
                    type: isLiveMode ? 'application/x-mpegURL' : 'video/mp4'
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
          <Timeline
            videos={filteredVideos}
            onSelectTime={handleTimelineSelect}
            onLiveClick={() => setIsLiveMode(true)}
            isLiveAvailable={!!currentVideo}
          />
        </div>

        <div className="video-list-section">
          <h3>Available Videos</h3>
          {error && <p className="error">{error}</p>}
          {filteredVideos.length === 0 && !error ? (
            <p>No videos found.</p>
          ) : (
            <ul className="video-list">
              {filteredVideos.map((video) => (
                <li
                  key={video.url}
                  className={`video-item ${currentVideo && currentVideo.url === video.url ? 'active' : ''}`}
                  onClick={() => handleVideoSelect(video)}
                >
                  {video.thumbnailUrl && (
                    <img
                      src={`${video.thumbnailUrl}`}
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
