import { createStateStack } from '../state-stack';
import { LoginModel } from '@/models/user-data';
import { UserLoginAccount } from '@/models/user-data';

export type UserPartialData = {
  users_id: string;
  users_dob: string;
  users_sex: 'Gender.male' | 'Gender.female';
}

export type VerificationMethodModel = {
    type: string;
    value: string;
}

type LoginState = {
  login: LoginModel | null;
  password: string;
};

type AccountDetailsState = {
  accountDetails: LoginModel | null;
  methods: VerificationMethodModel[];
};

type ResetState = {
  password: string;
  confirm_password: string;
};


const methods = {
  login: {
    setField: <K extends keyof LoginState>(
      state: LoginState,
      ...updates: { field: K; value: LoginState[K] }[]
    ) => {
      return updates.reduce(
        (s, u) => ({ ...s, [u.field]: u.value }),
        { ...state }
      );
    },
    reset: () => ({
      login: null,
      password: ''
    }),
  },
  accountDetails: {
     setField: <K extends keyof AccountDetailsState>(
       state: AccountDetailsState,
       ...updates: { field: K; value: AccountDetailsState[K] }[]
     ) => {
        return updates.reduce(
          (s, u) => ({ ...s, [u.field]: u.value }),
          { ...state }
        );
     },
     reset: () => ({
       accountDetails: null,
       methods: []
     }),
 },
  resetPassword: {
     setField: <K extends keyof ResetState>(
       state: ResetState,
       ...updates: { field: K; value: ResetState[K] }[]
     ) => {
        return updates.reduce(
          (s, u) => ({ ...s, [u.field]: u.value }),
          { ...state }
        );
     },
     reset: () => ({
         password: '',
         confirm_password: ''
     }),
 },
};

export const { useStack } = createStateStack(methods);

export const loginConfig = {
  initial: {
     login: null,
     password: ''
  },
  persist: true,
  ttl: 300, // 5 minutes
  historyDepth: 1,
  clearOnZeroSubscribers: false,
};

export const accountDetailsConfig = {
  initial: {
     accountDetails: null,
     methods: []
  },
  persist: true,
  ttl: 300, // 5 minutes
  historyDepth: 1,
  clearOnZeroSubscribers: false,
};

export const resetPasswordConfig = {
  initial: {
    password: '',
    confirm_password: ''
  },
  persist: true,
  ttl: 300, // 5 minutes
  historyDepth: 1,
  clearOnZeroSubscribers: false,
};

export const useLogin = () => {
  return useStack('login', loginConfig, 'login_flow');
};


export const useAccountDetails = () => {
  return useStack('accountDetails', accountDetailsConfig, 'login_flow');
};


export const useResetPassword = () => {
  return useStack('resetPassword', resetPasswordConfig, 'login_flow');
};
