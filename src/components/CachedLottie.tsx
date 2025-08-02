import { useEffect, useState, useRef } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import { preloadLottie, getCachedLottie } from '@/lib/lottieCache';

interface CachedLottieProps {
  id: string;
  src: string;
  loop?: boolean;
  autoplay?: boolean;
  className?: string;
  preserveAspectRatio?: string;
  restoreProgress?: boolean;
}

const CachedLottie: React.FC<CachedLottieProps> = ({
  id,
  src,
  loop = true,
  autoplay = true,
  className,
  preserveAspectRatio = 'xMidYMid slice',
  restoreProgress = false,
}) => {
  const [animationData, setAnimationData] = useState<any>(getCachedLottie(id));
  const [animationInstance, setAnimationInstance] = useState<any>(null); // ✅ store raw lottie instance
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    if (!animationData) {
      preloadLottie(id, src)
        .then((data) => setAnimationData(data))
        .catch((err) => console.error('Lottie load error:', err));
    }
  }, [id, src, animationData]);

  // ✅ Capture Lottie-Web instance once loaded
  const handleAnimationLoaded = (instance: any) => {
    setAnimationInstance(instance);

    if (restoreProgress) {
      const savedProgress = sessionStorage.getItem(`lottie-progress-${id}`);
      if (savedProgress) {
        instance.goToAndStop(Number(savedProgress), true);
      }
    }
  };

  // ✅ Save progress every second
  useEffect(() => {
    if (!restoreProgress || !animationInstance) return;

    const interval = setInterval(() => {
      const frame = animationInstance.currentFrame; // ✅ Raw Lottie instance property
      if (frame !== undefined) {
        sessionStorage.setItem(`lottie-progress-${id}`, String(frame));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [restoreProgress, animationInstance]);

  if (!animationData) return <p>Loading animation...</p>;

  return (
    <Lottie
      lottieRef={lottieRef}
      className={className}
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      rendererSettings={{ preserveAspectRatio }}
      onDOMLoaded={handleAnimationLoaded}
    />
  );
};

export default CachedLottie;
