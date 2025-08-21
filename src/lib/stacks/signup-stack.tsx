import { createStateStack } from '../state-stack';

export type Country = { country_id: string; country_identity: string };
export type Language = { language_id: string; language_identity: string };

type SignupState = {
currentStep: number;
fullName: string;
email: string;
language: Language | null;
country: Country | null;
phoneNumber: string;
username: string;
birthday: string;
gender: string;
role: string;
referral: string;
sixDigitPin: number | null;
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
      language: null,
      country: null,
      phoneNumber: '',
      username: '',
      birthday: '',
      gender: '',
      role: '',
      referral: '',
      sixDigitPin: null,
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
    language: null,
    country: null,
    phoneNumber: '',
    username: '',
    birthday: '',
    gender: '',
    role: '',
    referral: '',
    sixDigitPin: null,
    password: '',
  },
  persist: true,
  ttl: 300,
  historyDepth: 10,
  totalSteps: 7,
  clearOnZeroSubscribers: false,
};