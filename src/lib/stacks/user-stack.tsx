import { createStateStack, StackConfig } from '@academix-admin/state-stack';
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

export const userDataConfig: StackConfig<UserData | null> = {
  initial: null as UserData | null,
  persist: true,
  // Profile changes rarely and is refreshed explicitly (login, role/profile edits). A longer TTL means a
  // full reload after a background (mobile evicts the tab) RESTORES the cached identity instead of finding
  // it expired → null → the AuthProvider profile-resolve loader + a full userData refetch on every resume.
  ttl: 43200, // 12h
  historyDepth: 1,
  clearOnZeroSubscribers: false,
};

export const useUserData = () => {
  return useStack('userData', userDataConfig, 'secondary_flow');
};
