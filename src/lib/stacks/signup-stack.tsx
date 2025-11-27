import { createStateStack } from '../state-stack';

export type UserRegistrationData = {
  users_email: string;
  users_phone: string;
  users_dob: string;
  users_sex: 'Gender.male' | 'Gender.female';
  users_username: string;
  users_names: string;
  country_id: string;
  language_id: string;
  users_referred_id: string | null;
  roles_id: string;
  users_pin: number;
  users_login_type: 'UserLoginType.email' | 'UserLoginType.phone';
  users_password: string;
};

export type Country = {
  country_id: string;
  country_identity: string;
  country_image: string | null;
  country_phone_code: string;
  country_phone_digit: number
};

export type Language = {
  language_id: string;
  language_identity: string
};

export type Role = {
  roles_id: string;
  roles_identity: string;
  roles_level: number;
  roles_type: string;
  roles_created_at: string
};

export type Referral = {
  users_username: string;
  users_names: string;
  users_id: string
};

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
  referral: Referral | null;
  sixDigitPin: number | null;
  password: string;
  verification: string;
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
      referral: null,
      sixDigitPin: null,
      password: '',
      verification: ''
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
    gender: null,
    role: null,
    referral: null,
    sixDigitPin: null,
    password: '',
    verification: '',
  },
  persist: true,
  ttl: 600, // 10 minutes
  historyDepth: 10,
  clearOnZeroSubscribers: false,
};

export const useSignup = () => {
  return useStack('signup', signupConfig, 'signup_flow');
};
