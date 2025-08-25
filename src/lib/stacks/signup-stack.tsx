import { createStateStack } from '../state-stack';

export type Country = { country_id: string; country_identity: string, country_image: string | null, country_phone_code : string, country_phone_digit : number };
export type Language = { language_id: string; language_identity: string };
export type Role = { roles_id: string; roles_identity: string, roles_level: number, roles_type : string, roles_created_at: string };

type SignupState = {
currentStep: number;
fullName: string;
email: string;
language: Language | null;
country: Country | null;
phoneNumber: string;
username: string;
birthday: Date | null;
gender: string | null;
role: Role | null;
referral: string;
sixDigitPin: number | null;
password: string;
};

const signupMethods = {
signup: {
    setStep: (state: SignupState, step: number) => ({ ...state, currentStep: step }),
    setField: <K extends keyof SignupState>(
      state: SignupState,
      ...updates: { field: K; value: SignupState[K] }[]
    ) => {
      return updates.reduce(
        (s, u) => ({ ...s, [u.field]: u.value }),
        { ...state }
      );
    },
    reset: () => ({
      currentStep: 1,
      fullName: '',
      email: '',
      language: null,
      country: null,
      phoneNumber: '',
      username: '',
      birthday: null,
      gender: null,
      role: null,
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
    birthday: null,
    gender: '',
    role: null,
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