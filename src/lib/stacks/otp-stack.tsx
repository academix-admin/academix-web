import { createStateStack } from '../state-stack';

// Create OTP
  const { useStack } = createStateStack({
    otpTimer: {
      // Start the timer with specified duration
      start: (state, duration: number) => ({
        ...state,
        expiresAt: Date.now() + duration * 1000,
        duration,
        isRunning: true
      }),
      // Stop the timer
      stop: (state) => ({ ...state, isRunning: false }),
      // Reset the timer
      reset: (state) => ({
        ...state,
        expiresAt: null,
        isRunning: false,
        duration: 0
      }),
    }
  });

  export const useOtp = () => {
    return useStack("otpTimer", {
                   initial: {
                     expiresAt: null,
                     duration: 0,
                     isRunning: false
                   },
                   persist: true,
                   ttl: 600,
                   historyDepth: 1,
                   clearOnZeroSubscribers: false,
                 });

  };