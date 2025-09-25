import { createStateStack } from '../state-stack';
import { UserData } from '@/models/user-data';

const methods = {
  userData: {
    set: (state: UserData | null, userData: Partial<UserData> | null) => {
      if (!userData) return null;
      return state ? UserData.from(state).copyWith(userData) : new UserData(userData as any);
    },
    changeImage: (state: UserData | null, image: string | null) => {
      if (!state) return null;
      return UserData.from(state).changeImage(image);
    },
    get: (state: UserData | null) => state,
  },
};

export const { useStack } = createStateStack(methods);

export const userDataConfig = {
  initial: null,
  persist: true,
  ttl: 3600,
  historyDepth: 1,
  clearOnZeroSubscribers: false,
};

export const useUserData = () => {
  return useStack('userData', userDataConfig, 'secondary_flow');
};
