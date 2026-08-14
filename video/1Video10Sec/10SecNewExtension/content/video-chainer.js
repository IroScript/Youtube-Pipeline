/**
 * FlowCraft Video Chainer Module - Extracts end frames from generated videos for story chaining
 */

export class VideoChainer {
  static async captureLastVideoFrame(videoElements) {
    if (!videoElements || !videoElements.length) return null;
    const video = videoElements[videoElements.length - 1];

    try {
      return await new Promise((resolve, reject) => {
        video.crossOrigin = 'anonymous';
        video.preload = 'auto';

        const onLoaded = () => {
          video.currentTime = video.duration;
        };

        const onSeeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas 2d context unavailable'));
            ctx.drawImage(video, 0, 0);
            resolve(canvas.toDataURL('image/jpeg', 0.95));
          } catch (e) {
            reject(e);
          }
        };

        const onError = () => reject(new Error('Video element failed to load for frame extraction'));

        video.addEventListener('loadedmetadata', onLoaded, { once: true });
        video.addEventListener('seeked', onSeeked, { once: true });
        video.addEventListener('error', onError, { once: true });

        const src = video.src || video.currentSrc;
        if (src) {
          video.src = '';
          video.src = src;
        }
        video.load();
      });
    } catch {
      return null;
    }
  }
}
