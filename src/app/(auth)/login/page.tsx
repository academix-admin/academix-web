'use client';

import NavigationStack from "@/lib/NavigationStack";
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
  return <NavigationStack
          id="login"
          navLink={routes}
          entry="login"
          transition = "slide"
          persist={true}
//           syncHistory={true}
        />;
}
