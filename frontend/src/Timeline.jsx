import React, { useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';

const Timeline = ({ videos, onSelectTime, onLiveClick, isLiveAvailable }) => {
  const containerRef = useRef(null);
  const [hoverTime, setHoverTime] = useState(null);

  // Calculate the global start and end time based on all videos
  const { startTime, endTime, totalDuration } = useMemo(() => {
    if (videos.length === 0) return { startTime: 0, endTime: 0, totalDuration: 0 };

    let minTime = Infinity;
    let maxTime = -Infinity;

    videos.forEach(v => {
      const start = new Date(v.timestamp).getTime();
      const end = start + (v.duration * 1000);
      if (start < minTime) minTime = start;
      if (end > maxTime) maxTime = end;
    });

    // Add some padding (e.g., 5% on each side) or just use the raw range
    // For better UX, let's just use the raw range for now, maybe round to nearest hour if needed
    return {
      startTime: minTime,
      endTime: maxTime,
      totalDuration: maxTime - minTime
    };
  }, [videos]);

  const handleClick = (e) => {
    if (!containerRef.current || totalDuration === 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const clickTime = startTime + (percentage * totalDuration);

    // Find if we clicked on a video
    const clickedVideo = videos.find(v => {
      const start = new Date(v.timestamp).getTime();
      const end = start + (v.duration * 1000);
      return clickTime >= start && clickTime <= end;
    });

    if (clickedVideo) {
      const start = new Date(clickedVideo.timestamp).getTime();
      const seekTime = (clickTime - start) / 1000; // Seconds
      onSelectTime(clickedVideo, seekTime);
    }
  };

  const handleMouseMove = (e) => {
    if (!containerRef.current || totalDuration === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = startTime + (percentage * totalDuration);
    setHoverTime(time);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  if (videos.length === 0) return null;

  return (
    <div className="timeline-container">
      <div className="timeline-info">
        <span>{format(new Date(startTime), 'yyyy-MM-dd HH:mm:ss')}</span>
        <span className="timeline-hover-time">
          {hoverTime && format(new Date(hoverTime), 'HH:mm:ss')}
        </span>
        <span>{format(new Date(endTime), 'HH:mm:ss')}</span>
      </div>

      <div
        className="timeline-track"
        ref={containerRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {videos.map((video) => {
          const start = new Date(video.timestamp).getTime();
          const left = ((start - startTime) / totalDuration) * 100;
          const width = ((video.duration * 1000) / totalDuration) * 100;

          return (
            <div
              key={video.url}
              className="timeline-segment"
              style={{
                left: `${left}%`,
                width: `${width}%`,
              }}
              title={`${video.name} (${format(new Date(video.timestamp), 'HH:mm:ss')})`}
            />
          );
        })}

        {/* Hover Indicator */}
        {hoverTime && (
          <div
            className="timeline-cursor"
            style={{
              left: `${((hoverTime - startTime) / totalDuration) * 100}%`
            }}
          />
        )}

        {isLiveAvailable && (
          <div
            className="timeline-live-segment"
            onClick={(e) => {
              e.stopPropagation();
              onLiveClick();
            }}
            title="Watch Live"
          />
        )}
      </div>
    </div>
  );
};

export default Timeline;
