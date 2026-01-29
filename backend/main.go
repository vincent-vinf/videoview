package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"
)

type Video struct {
	Name         string  `json:"name"`
	URL          string  `json:"url"`
	ThumbnailURL string  `json:"thumbnailUrl"`
	CameraName   string  `json:"cameraName"`
	Timestamp    string  `json:"timestamp"` // ISO 8601 string
	Duration     float64 `json:"duration"`  // Seconds
}

var videoDir string

func main() {
	flag.StringVar(&videoDir, "dir", "./videos", "Directory containing video files")
	port := flag.String("port", "8081", "Port to run the server on")
	flag.Parse()

	// Verify video directory exists
	if _, err := os.Stat(videoDir); os.IsNotExist(err) {
		log.Printf("Video directory %s does not exist, creating it...", videoDir)
		os.MkdirAll(videoDir, 0755)
	}

	mux := http.NewServeMux()

	// API to list videos
	mux.HandleFunc("/api/videos", handleListVideos)

	// Serve video files
	// http.StripPrefix is needed because the file server expects the path relative to the root
	// but the URL has /api/video/ prefix.
	fileServer := http.FileServer(http.Dir(videoDir))
	mux.Handle("/api/video/", http.StripPrefix("/api/video/", fileServer))

	// CORS middleware
	handler := corsMiddleware(mux)

	log.Printf("Server starting on port %s, serving videos from %s", *port, videoDir)
	log.Fatal(http.ListenAndServe(":"+*port, handler))
}

func handleListVideos(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var videos []Video

	err := filepath.WalkDir(videoDir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}

		if strings.HasSuffix(d.Name(), ".mp4") || strings.HasSuffix(d.Name(), ".m4s") {
			relPath, err := filepath.Rel(videoDir, path)
			if err != nil {
				return nil
			}

			// Parse Camera Name
			cameraName := "Unknown"
			dir := filepath.Dir(relPath)
			if dir != "." {
				cameraName = dir
			}

			// Parse Timestamp
			// Expected format: %Y-%m-%d_%H-%M-%S.%f
			// Go layout: 2006-01-02_15-04-05.000000
			fileNameWithoutExt := strings.TrimSuffix(d.Name(), filepath.Ext(d.Name()))
			// Try parsing with microseconds
			t, err := time.Parse("2006-01-02_15-04-05.000000", fileNameWithoutExt)
			if err != nil {
				// Try parsing without microseconds if that fails, or just fallback
				info, err := d.Info()
				if err == nil {
					t = info.ModTime()
				} else {
					t = time.Now() // Fallback
				}
			}

			// Thumbnail
			// Store thumbnail in the same directory as the video
			thumbName := fileNameWithoutExt + ".png"
			thumbPath := filepath.Join(filepath.Dir(path), thumbName)

			// URL for thumbnail needs to be relative to /api/video/
			// relPath includes the directory, e.g. "camera1/video.mp4"
			// thumbRelPath should be "camera1/video.png"
			thumbRelPath := filepath.Join(filepath.Dir(relPath), thumbName)

			thumbURL := ""
			if err := ensureThumbnail(path, thumbPath); err == nil {
				// On Windows filepath.Join uses backslash, but URLs need forward slash
				thumbURL = "/api/video/" + filepath.ToSlash(thumbRelPath)
			} else {
				log.Printf("Error generating thumbnail for %s: %v", d.Name(), err)
			}

			// Get Duration
			duration, err := getVideoDuration(path)
			if err != nil {
				log.Printf("Error getting duration for %s: %v", d.Name(), err)
			}

			videos = append(videos, Video{
				Name:         d.Name(),
				URL:          "/api/video/" + filepath.ToSlash(relPath),
				ThumbnailURL: thumbURL,
				CameraName:   cameraName,
				Timestamp:    t.Format(time.RFC3339),
				Duration:     duration,
			})
		}
		return nil
	})

	if err != nil {
		log.Printf("Error walking video directory: %v", err)
		http.Error(w, "Unable to read video directory", http.StatusInternalServerError)
		return
	}

	// Sort by timestamp descending (newest first)
	sort.Slice(videos, func(i, j int) bool {
		return videos[i].Timestamp > videos[j].Timestamp
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(videos)
}

func ensureThumbnail(videoPath, thumbPath string) error {
	if _, err := os.Stat(thumbPath); err == nil {
		return nil // Thumbnail exists
	}
	// Generate thumbnail
	cmd := exec.Command("ffmpeg", "-y", "-i", videoPath, "-ss", "00:00:01", "-vframes", "1", "-vf", "scale=iw/2:ih/2", thumbPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("ffmpeg failed: %v, output: %s", err, string(output))
	}
	return nil
}

func getVideoDuration(videoPath string) (float64, error) {
	cmd := exec.Command("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", videoPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return 0, fmt.Errorf("ffprobe failed: %v, output: %s", err, string(output))
	}
	durationStr := strings.TrimSpace(string(output))
	return strconv.ParseFloat(durationStr, 64)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*") // For development, allow all
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Range")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Length")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
