'use client';

import NavigationStack from "@/lib/NavigationStack";
import SignUpStep1 from './step1/step1';
import SignUpStep2 from './step2/step2';
import SignUpStep3 from './step3/step3';
import SignUpStep4 from './step4/step4';
import SignUpStep5 from './step5/step5';
import SignUpStep6 from './step6/step6';
import SignUpStep7 from './step7/step7';
import Verification from './verification/verification';
import Otp from '../shared/otp/otp';

export default function SignUp() {
  const routes = {
    step1: SignUpStep1,
    step2: SignUpStep2,
    step3: SignUpStep3,
    step4: SignUpStep4,
    step5: SignUpStep5,
    step6: SignUpStep6,
    step7: SignUpStep7,
    verification: Verification,
    otp: Otp
  };
  return <NavigationStack
          id="signup"
          navLink={routes}
          entry="step1"
          transition = "slide"
          persist={true}
          syncHistory={true}
        />;
}
