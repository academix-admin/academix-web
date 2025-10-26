import { useAtom } from '../state-stack';

export interface QuizDisplayEvent {
  isOpen: boolean;
  timestamp: number;
}

export function useQuizDisplay() {
  const [lastEvent, setLastEvent] = useAtom<QuizDisplayEvent | null>('quiz-last-event', null);
  const [oldState, setOldState] = useAtom<{
    messageStatus: string | null;
    jobEndAt: string | null;
  }>('quiz-old-state', { messageStatus: null, jobEndAt: null });

  const controlDisplayMessage = (status: string | null, jobEndAt: string | null) => {

    const isWaitingStatus = status && [
      'PoolJob.extended_waiting',
      'PoolJob.waiting',
    ].includes(status);

    if (!status || !jobEndAt || isWaitingStatus) {
      return;
    }

    setOldState({ messageStatus: status, jobEndAt });
    setLastEvent({ isOpen: true, timestamp: Date.now() });
  };

  const closeDisplay = () => {
    setLastEvent({ isOpen: false, timestamp: Date.now() });
    setOldState({ messageStatus: null, jobEndAt: null });
  };

  return {
    isOpen: lastEvent?.isOpen || false,
    lastEvent,
    controlDisplayMessage,
    closeDisplay,
    clearState: () => {
      setLastEvent(null);
      setOldState({ messageStatus: null, jobEndAt: null });
    },
  };
}