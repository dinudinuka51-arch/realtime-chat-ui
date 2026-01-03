import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HighlightStory {
  id: string;
  media_url: string;
  media_type: string;
  caption?: string | null;
}

interface HighlightViewerProps {
  stories: HighlightStory[];
  highlightTitle: string;
  initialIndex?: number;
  onClose: () => void;
}

// Optimized video component with preloading
const OptimizedVideo = memo(({ 
  src, 
  isActive,
  onLoadedData 
}: { 
  src: string; 
  isActive: boolean;
  onLoadedData?: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }
  }, [isActive]);

  return (
    <video
      ref={videoRef}
      src={src}
      className="max-w-full max-h-full object-contain"
      muted
      playsInline
      preload="auto"
      onLoadedData={onLoadedData}
    />
  );
});

OptimizedVideo.displayName = 'OptimizedVideo';

export const HighlightViewer = ({
  stories,
  highlightTitle,
  initialIndex = 0,
  onClose,
}: HighlightViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  const currentStory = stories[currentIndex];
  const storyDuration = currentStory?.media_type === 'video' ? 15000 : 5000;

  const goToNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      setMediaLoaded(false);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      setMediaLoaded(false);
    }
  }, [currentIndex]);

  // Preload next media
  useEffect(() => {
    if (currentIndex < stories.length - 1) {
      const nextStory = stories[currentIndex + 1];
      if (nextStory.media_type === 'image') {
        const img = new Image();
        img.src = nextStory.media_url;
      }
    }
  }, [currentIndex, stories]);

  useEffect(() => {
    if (isPaused || !mediaLoaded) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          goToNext();
          return 0;
        }
        return prev + (100 / (storyDuration / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, storyDuration, goToNext, mediaLoaded]);

  const handleTouchStart = () => setIsPaused(true);
  const handleTouchEnd = () => setIsPaused(false);

  if (!currentStory) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
      >
        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
          {stories.map((_, index) => (
            <div
              key={index}
              className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-white rounded-full transition-all duration-100"
                style={{
                  width:
                    index < currentIndex
                      ? '100%'
                      : index === currentIndex
                      ? `${progress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-2 right-2 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <p className="text-white text-sm font-medium">{highlightTitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation areas */}
        <button
          className="absolute left-0 top-0 bottom-0 w-1/3 z-[5]"
          onClick={goToPrevious}
        />
        <button
          className="absolute right-0 top-0 bottom-0 w-1/3 z-[5]"
          onClick={goToNext}
        />

        {/* Story content */}
        <div className="w-full h-full flex items-center justify-center">
          {currentStory.media_type === 'video' ? (
            <OptimizedVideo 
              src={currentStory.media_url} 
              isActive={true}
              onLoadedData={() => setMediaLoaded(true)}
            />
          ) : (
            <img
              src={currentStory.media_url}
              alt="Highlight"
              className="max-w-full max-h-full object-contain"
              onLoad={() => setMediaLoaded(true)}
            />
          )}
        </div>

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-8 left-4 right-4 text-center">
            <p className="text-white text-sm bg-black/50 rounded-lg px-4 py-2">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* Navigation arrows for desktop */}
        <div className="hidden md:flex absolute inset-y-0 left-0 right-0 items-center justify-between px-4 pointer-events-none">
          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 pointer-events-auto"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}
          <div />
          {currentIndex < stories.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 pointer-events-auto"
              onClick={goToNext}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
