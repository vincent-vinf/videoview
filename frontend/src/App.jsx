import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_BASE_URL = `http://${window.location.hostname}:8081`

function App() {
  const [videos, setVideos] = useState([])
  const [currentVideo, setCurrentVideo] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/videos`)
        setVideos(response.data)
        if (response.data.length > 0) {
          // Optionally auto-select the first video
          // setCurrentVideo(response.data[0])
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
  }

  return (
    <div className="container">
      <header>
        <h1>fMP4 Video Player</h1>
      </header>

      <main className="main-content">
        <div className="video-player-section">
          {currentVideo ? (
            <div className="video-wrapper">
              <h2>{currentVideo.name}</h2>
              <video
                key={currentVideo.url} // Force re-render when video changes
                controls
                autoPlay
                width="100%"
                height="auto"
                src={`${API_BASE_URL}${currentVideo.url}`}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <div className="placeholder">
              <p>Select a video to play</p>
            </div>
          )}
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
                  key={video.name}
                  className={currentVideo && currentVideo.name === video.name ? 'active' : ''}
                  onClick={() => handleVideoSelect(video)}
                >
                  {video.name}
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
