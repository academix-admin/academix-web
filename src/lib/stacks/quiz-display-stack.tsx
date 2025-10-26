import { useAtom } from '../state-stack';

export interface QuizDisplayEvent {
  isOpen: boolean;
  status: string | null;
  jobEndAt: string | null;
  timestamp: number;
}

export function useQuizDisplay() {
  const [lastEvent, setLastEvent] = useAtom<QuizDisplayEvent | null>('quiz-last-event', null);

  const controlDisplayMessage = (status: string | null, jobEndAt: string | null) => {

    const isWaitingStatus = status && [
      'PoolJob.extended_waiting',
      'PoolJob.waiting',
    ].includes(status);

    if (!status || !jobEndAt || isWaitingStatus) {
      return;
    }

    setLastEvent({ isOpen: true, status, jobEndAt, timestamp: Date.now() });
  };

  const closeDisplay = () => {
    setLastEvent({ isOpen: false, timestamp: Date.now(), status: null, jobEndAt: null });
  };

  return {
    isOpen: lastEvent?.isOpen || false,
    lastEvent,
    controlDisplayMessage,
    closeDisplay,
    clearState: () => {
      setLastEvent(null);
    },
  };
}