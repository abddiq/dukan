export const compressVideo = async (file: File, maxWidth = 480): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true; // Mute to allow autoplay without user interaction
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    video.onloadedmetadata = () => {
      const canvas = document.createElement('canvas');
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      video.play().then(() => {
        // Capture video stream from canvas
        const stream = canvas.captureStream(30); // 30 FPS

        // Capture audio stream from video using Web Audio API
        let combinedStream = stream;
        let audioCtx: AudioContext | null = null;
        
        try {
          // @ts-ignore
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            audioCtx = new AudioContextClass();
            const source = audioCtx.createMediaElementSource(video);
            const dest = audioCtx.createMediaStreamDestination();
            source.connect(dest);
            
            const audioTracks = dest.stream.getAudioTracks();
            if (audioTracks.length > 0) {
              combinedStream = new MediaStream([
                ...stream.getVideoTracks(),
                ...audioTracks
              ]);
            }
          }
        } catch (e) {
          console.warn("Could not capture audio:", e);
        }

        // Determine supported mime type
        let mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser choose
          }
        }

        const recorder = new MediaRecorder(combinedStream, {
          mimeType: mimeType ? mimeType : undefined,
          videoBitsPerSecond: 500000 // 500 kbps to reduce size
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = e => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
            if (audioCtx) {
              audioCtx.close().catch(console.error);
            }
            URL.revokeObjectURL(video.src);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        };

        recorder.start();

        const drawFrame = () => {
          if (video.paused || video.ended) {
            if (recorder.state === 'recording') {
              recorder.stop();
            }
            return;
          }
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
          }
          requestAnimationFrame(drawFrame);
        };

        drawFrame();
      }).catch(err => {
        console.error("Video play failed:", err);
        // Fallback to normal file reader if compression fails
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    video.onerror = (err) => {
      console.error("Video load failed:", err);
      // Fallback
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };
  });
};
