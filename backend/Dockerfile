# Stage 1: Build the backend
FROM docker.1ms.run/golang:1.24 AS builder
WORKDIR /app
COPY . .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o backend main.go

# Stage 2: Runtime environment
FROM docker.1ms.run/ubuntu:22.04
# Install ffmpeg and ffprobe as they are required by the application
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/backend .

# Expose the port the app runs on
EXPOSE 8081

# Run the application
# Assuming /videos is mounted as a volume
CMD ["./backend", "-dir", "/videos", "-port", "8081"]
