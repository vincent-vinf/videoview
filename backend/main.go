package main

import (
	"encoding/json"
	"flag"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
)

type Video struct {
	Name string `json:"name"`
	URL  string `json:"url"`
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
	// However, for individual file serving with custom logic (if needed), we might do it differently.
	// But http.FileServer is the easiest way to handle Range requests.
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

	files, err := os.ReadDir(videoDir)
	if err != nil {
		http.Error(w, "Unable to read video directory", http.StatusInternalServerError)
		return
	}

	var videos []Video
	for _, file := range files {
		if !file.IsDir() && (strings.HasSuffix(file.Name(), ".mp4") || strings.HasSuffix(file.Name(), ".m4s")) {
			videos = append(videos, Video{
				Name: file.Name(),
				URL:  "/api/video/" + file.Name(),
			})
		}
	}

	// Sort by name (which usually implies time for MediaMTX files)
	sort.Slice(videos, func(i, j int) bool {
		return videos[i].Name < videos[j].Name
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(videos)
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
