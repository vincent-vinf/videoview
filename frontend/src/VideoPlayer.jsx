import React, { useRef, useEffect } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

export const VideoPlayer = (props) => {
  const videoNode = useRef(null);
  const player = useRef(null);
  const { options, onReady } = props;

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!player.current) {
      // The Video.js player needs to be _inside_ the component el for React 18 Strict Mode.
      const videoElement = document.createElement("video-js");

      videoElement.classList.add('vjs-big-play-centered');
      videoNode.current.appendChild(videoElement);

      player.current = videojs(videoElement, options, () => {
        videojs.log('player is ready');
        onReady && onReady(player.current);
      });

    } else {
      const playerObserver = player.current;

      if (options.autoplay) {
         playerObserver.autoplay(options.autoplay);
      }
      if (options.sources) {
         playerObserver.src(options.sources);
      }
    }
  }, [options, videoNode]);

  // Dispose the player when the component unmounts
  useEffect(() => {
    const playerCurrent = player.current;

    return () => {
      if (playerCurrent && !playerCurrent.isDisposed()) {
        playerCurrent.dispose();
        player.current = null;
      }
    };
  }, [player]);

  return (
    <div data-vjs-player style={{ width: '100%' }}>
      <div ref={videoNode} />
    </div>
  );
}

export default VideoPlayer;
