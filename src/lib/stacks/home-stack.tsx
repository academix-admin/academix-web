// import { createStateStack } from '../state-stack';
//
//
// type LoginState = {
//   login: LoginModel | null;
//   password: string;
// };
//
//
// const methods = {
//   login: {
//     setField: <K extends keyof LoginState>(
//       state: LoginState,
//       ...updates: { field: K; value: LoginState[K] }[]
//     ) => {
//       return updates.reduce(
//         (s, u) => ({ ...s, [u.field]: u.value }),
//         { ...state }
//       );
//     },
//     reset: () => ({
//       login: null,
//       password: ''
//     }),
//   },
// };
//
// export const { useStack } = createStateStack(methods);
//
// export const loginConfig = {
//   initial: {
//      login: null,
//      password: ''
//   },
//   persist: true,
//   ttl: 3600, // 1 hour
//   historyDepth: 1,
//   clearOnZeroSubscribers: false,
// };
//
//
// export const useLogin = () => {
//   return useStack('login', loginConfig, 'login_flow');
// };
//
