'use client';

import styles from './quiz-stack.module.css';
import {useNav } from "@/lib/CompleteStackManagement";
import NavigationStack from "@/lib/CompleteStackManagement";

// Pages
const SignupPage = () => {
  const nav = useNav();
  return (
    <div style={{ padding: '20px' }}>
      <h2>Quiz Page</h2>
      <button onClick={() => nav.push('welcome', { userId: '1234' })}>
        Next
      </button>
    </div>
  );
};

const WelcomePage = () => {
  const nav = useNav();
  const entry = nav.peek();
  return (
    <div style={{ padding: '20px' }}>
      <button onClick={() => nav.pop()}>Back Button</button>
      <p>Thanks for signing up! Your ID: {entry?.params?.userId}</p>
    </div>
  );
};

const loginNavLink = {
  signup: SignupPage,
  welcome: WelcomePage,
};

export const QuizStack = () => (
  <NavigationStack
    id="home"
    navLink={loginNavLink}
    entry="signup"
    syncHistory
    transition="slide"
    persist
  />
);


