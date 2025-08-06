'use client';

import NavigationStack from "@/lib/NavigationStack";
import SignUpStep1 from './step1/page';
import SignUpStep2 from './step2/page';

export default function SignUp() {
  const routes = {
    step1: SignUpStep1,
    step2: SignUpStep2
  };
  return <NavigationStack
          id="signup"
          navLink={routes}
          entry="step1"
        />;
}
