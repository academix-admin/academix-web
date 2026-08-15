'use client';

import { useCallback, useEffect } from 'react';
import { StateStack } from '@academix-admin/state-stack';
import NavigationStack from "@academix-admin/navigation-stack";
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
  /**
   * Clear the signup scope whenever the flow is LEFT, however that happens.
   *
   * It used to be cleared only in step1's cancelSignUp() and on the two success paths, so
   * abandoning signup with browser Back, swipe-back, or by navigating away left `signup_flow`
   * populated — and the next signup attempt started with the previous one's answers.
   *
   * Bound at the STACK level, not to a page: step1's onExit fires when advancing to step2, which
   * would wipe the scope mid-flow. `onExitStack` fires when the stack empties (popped past its
   * root), and the unmount cleanup covers leaving the /signup route outright. Both are idempotent,
   * and the success paths already clear it, so double-clearing is harmless.
   *
   * See ACADEMIX_PLAN §3b: flow-scoped state belongs on the navigation lifecycle, never in a
   * single click handler that other exit paths skip.
   */
  const clearSignupScope = useCallback(() => {
    StateStack.core.clearScope('signup_flow');
  }, []);

  useEffect(() => clearSignupScope, [clearSignupScope]);

  return (
    <div style={{ height: '100dvh', overflow: 'hidden' }}>
      <NavigationStack
        id="signup"
        navLink={routes}
        entry="step1"
        transition="slide"
        persist={true}
        syncHistory={true}
        onExitStack={clearSignupScope}
      />
    </div>
  );
}
