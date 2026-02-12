import { useAtom } from '../state-stack';

export interface QuizDisplayEvent {
  isOpen: boolean;
  status?: string | undefined ;
  jobEndAt?: string | undefined;
  timestamp: number;
}

export function useQuizDisplay() {
  const [lastEvent, setLastEvent] = useAtom<QuizDisplayEvent | null>('quiz-last-event', null);

  const controlDisplayMessage = (status: string | null, jobEndAt: string | null) => {

    const isWaitingStatus = status && [
      'PoolJob.extended_waiting',
      'PoolJob.waiting',
      'PoolJob.pool_ended',
    ].includes(status);


    if (!status || !jobEndAt || isWaitingStatus) {
      if(lastEvent?.isOpen) closeDisplay();
      return;
    }

    const now = new Date();
    const endAt = new Date(jobEndAt);

    if(now >= endAt){
        closeDisplay();
        return;
    }
    setLastEvent({ isOpen: true, status, jobEndAt, timestamp: Date.now() });
  };

  const closeDisplay = () => {
    setLastEvent({ isOpen: false, timestamp: Date.now()});
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