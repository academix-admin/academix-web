'use client';


import styles from './rewards-stack.module.css';
import {useNav } from "@/lib/CompleteStackManagement";
import NavigationStack from "@/lib/CompleteStackManagement";

// Pages
const DashboardPage = () => {
  const nav = useNav();
  const entry = nav.peek();
  return (
    <div style={{ padding: '20px' }}>
      <button onClick={() => nav.pop()}>Back Button</button>
      <p>Token: {entry?.params?.token}</p>
    </div>
  );
};

const LoginPage = () => {
  const nav = useNav();
  return (
    <div style={{ padding: '20px' }}>
      <h2>Rewards Page</h2>
      <button onClick={() => nav.push('dashboard', { token: 'abc123' })}>
        Next
      </button>
    </div>
  );
};


const loginNavLink = {
  signup: LoginPage,
  dashboard: DashboardPage,
};

export const RewardsStack = () => (
  <NavigationStack
    id="reward"
    navLink={loginNavLink}
    entry="signup"
    syncHistory
    transition="slide"
    persist
  />
);


