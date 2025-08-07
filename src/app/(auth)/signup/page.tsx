'use client';

import NavigationStack from "@/lib/NavigationStack";
import SignUpStep1 from './step1/step1';
import SignUpStep2 from './step2/step2';

export default function SignUp() {
  const routes = {
    step1: SignUpStep1,
    step2: SignUpStep2
  };
  return <NavigationStack
          id="signup"
          navLink={routes}
          entry="step1"
          transition = "slide"
          persist={true}
        />;
}
