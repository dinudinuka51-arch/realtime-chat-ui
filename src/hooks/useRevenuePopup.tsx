import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';

const POPUP_URL = 'https://www.revenuecpmgate.com/ukdr7qzm6?key=ab654dadbe923c2e16b36a03da90b524';

// Popup intervals in minutes: 1, 2, 5, 10, 11, 12, 10
const POPUP_INTERVALS_MS = [
  1 * 60 * 1000,   // 1 minute
  2 * 60 * 1000,   // 2 minutes
  5 * 60 * 1000,   // 5 minutes
  10 * 60 * 1000,  // 10 minutes
  11 * 60 * 1000,  // 11 minutes
  12 * 60 * 1000,  // 12 minutes
  10 * 60 * 1000,  // 10 minutes (repeat)
];

const INITIAL_DELAY_MS = 5 * 1000; // 5 seconds after app open

export const useRevenuePopup = () => {
  const { user } = useAuth();
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const hasInitialPopupRef = useRef(false);

  const openPopup = () => {
    window.open(POPUP_URL, '_blank', 'noopener,noreferrer');
  };

  useEffect(() => {
    if (!user) {
      // Clear all timeouts if user logs out
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      hasInitialPopupRef.current = false;
      return;
    }

    // Initial popup after 5 seconds
    if (!hasInitialPopupRef.current) {
      hasInitialPopupRef.current = true;
      const initialTimeout = setTimeout(() => {
        openPopup();
      }, INITIAL_DELAY_MS);
      timeoutsRef.current.push(initialTimeout);
    }

    // Set up recurring popups at specified intervals
    let cumulativeTime = INITIAL_DELAY_MS;
    
    POPUP_INTERVALS_MS.forEach((interval) => {
      cumulativeTime += interval;
      const timeout = setTimeout(() => {
        openPopup();
      }, cumulativeTime);
      timeoutsRef.current.push(timeout);
    });

    // After all intervals, restart the cycle
    const totalCycleTime = cumulativeTime;
    const cycleInterval = setInterval(() => {
      let cycleTime = 0;
      POPUP_INTERVALS_MS.forEach((interval) => {
        cycleTime += interval;
        const timeout = setTimeout(() => {
          openPopup();
        }, cycleTime);
        timeoutsRef.current.push(timeout);
      });
    }, totalCycleTime);

    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
      clearInterval(cycleInterval);
    };
  }, [user]);
};
