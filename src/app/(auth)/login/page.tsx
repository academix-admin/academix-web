'use client';

import NavigationStack from "@academix-admin/navigation-stack";
import LoginUser from './login/login';
import ForgotPassword from './forgot-password/forgot-password';
import Recovery from './recovery/recovery';
import ResetPassword from './reset-password/reset-password';
import Otp from '../shared/otp/otp';

export default function Login() {
  const routes = {
    login: LoginUser,
    forgot_password: ForgotPassword,
    recovery: Recovery,
    otp: Otp,
    reset_password: ResetPassword
  };
  return (
    <div style={{ height: '100dvh', overflow: 'hidden' }}>
      <NavigationStack
        id="login"
        navLink={routes}
        entry="login"
        transition="slide"
        persist={false}
        // navigation-stack defaults syncHistory to FALSE, so this has to be opt-in per stack.
        // Every other stack in the app sets it (signup, home, payment, profile, quiz, rewards);
        // login was the only one that did not, so browser back/forward did nothing inside
        // login → recovery → otp → reset_password and instead abandoned the whole auth flow.
        syncHistory
      />
    </div>
  );
}
