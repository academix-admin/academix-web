import { createStateStack } from '../state-stack';

type SignupState = {
currentStep: number;
fullName: string;
email: string;
language: string;
country: string;
phoneNumber: string;
username: string;
birthday: string;
gender: string;
role: string;
referral: string;
sixdigitpin: number | null;
password: string;
};

const signupMethods = {
signup: {
setStep: (state: SignupState, step: number) => ({ ...state, currentStep: step }),
    setField: <K extends keyof SignupState>(state: SignupState, { field, value }: { field: K; value: SignupState[K] }) => ({
      ...state,
      [field]: value,
    }),
    reset: () => ({
      currentStep: 1,
      fullName: '',
      email: '',
      language: '',
      country: '',
      phoneNumber: '',
      username: '',
      birthday: '',
      gender: '',
      role: '',
      referral: '',
      sixdigitpin: null,
      password: '',
    }),
  },
};

export const { useStack } = createStateStack(signupMethods);

export const signupConfig = {
  initial: {
    currentStep: 1,
    fullName: '',
    email: '',
    language: '',
    country: '',
    phoneNumber: '',
    username: '',
    birthday: '',
    gender: '',
    role: '',
    referral: '',
    sixdigitpin: null,
    password: '',
  },
  persist: true,
  ttl: 300,
  historyDepth: 10,
  totalSteps: 7,
  clearOnZeroSubscribers: false,
};