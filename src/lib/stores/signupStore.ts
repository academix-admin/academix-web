import { create } from 'zustand';

interface SignupData {
fullName: string;
email: string;
language: string;
country: string;
phoneNumber: string;
username: string;
}

interface SignupStore {
data: SignupData;
setData: (newData: Partial<SignupData>) => void;
  reset: () => void;
}

const useSignupStore = create<SignupStore>((set) => {
  // Try to load from localStorage if exists
  const savedData = typeof window !== 'undefined'
    ? localStorage.getItem('signupData')
    : null;

  return {
    data: savedData ? JSON.parse(savedData) : {
      fullName: '',
      email: '',
      language: '',
      country: '',
      phoneNumber: '',
      username: '',
    },
    setData: (newData) => set((state) => {
      const updated = { ...state.data, ...newData };
      localStorage.setItem('signupData', JSON.stringify(updated));
      return { data: updated };
    }),
    reset: () => {
      localStorage.removeItem('signupData');
      set({
        data: {
          fullName: '',
          email: '',
          language: '',
          country: '',
          phoneNumber: '',
          username: '',
        }
      });
    }
  };
});

export default useSignupStore;