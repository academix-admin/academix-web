'use client';

import React, { useState } from 'react';
import { GroupNavigationStack, useNav } from "@/lib/CompleteStackManagement";
import NavigationStack from "@/lib/CompleteStackManagement";

// Pages
const LoginPage = () => {
  const nav = useNav();
  return (
    <div style={{ padding: '20px' }}>
      <h2>Login Page</h2>
      <button onClick={() => nav.push('dashboard', { token: 'abc123' })}>
        Login
      </button>
    </div>
  );
};

const SignupPage = () => {
  const nav = useNav();
  return (
    <div style={{ padding: '20px' }}>
      <h2>Signup Page</h2>
      <button onClick={() => nav.push('welcome', { userId: '1234' })}>
        Sign Up
      </button>
      {
          <NavigationStack
              id="test"
              navLink={loginNavLink}
              entry="login"
              syncHistory
              transition = "slide"
              persist
            />
            }
    </div>
  );
};

const DashboardPage = () => {
  const nav = useNav();
  const entry = nav.peek();
  return (
    <div style={{ padding: '20px' }}>
      <button onClick={() => nav.pop()}>Dashboard Page</button>
      <p>Token: {entry?.params?.token}</p>
    </div>
  );
};

const WelcomePage = () => {
  const nav = useNav();
  const entry = nav.peek();
  return (
    <div style={{ padding: '20px' }}>
      <button onClick={() => nav.pop()}>Welcome Page</button>
      <p>Thanks for signing up! Your ID: {entry?.params?.userId}</p>
    </div>
  );
};

// Navigation maps
const loginNavLink = {
  login: LoginPage,
  dashboard: DashboardPage,
};

const signupNavLink = {
  signup: SignupPage,
  welcome: WelcomePage,
};

const Main = () => {
  const [currentGroup, setCurrentGroup] = useState('login');

  const navStackMap = new Map([
    ['login', (
      <NavigationStack
        id="login"
        navLink={loginNavLink}
        entry="login"
        syncHistory
        transition = "slide"
        persist
      />
    )],
    ['signup', (
      <NavigationStack
        id="signup"
        navLink={signupNavLink}
        entry="signup"
        syncHistory
        transition = "slide"
        persist
      />
    )],
  ]);

  return (
    <div>
      <h1>Authentication Demo</h1>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={() => setCurrentGroup('login')}
          style={{ marginRight: '10px', fontWeight: currentGroup === 'login' ? 'bold' : 'normal' }}
        >
          Login
        </button>
        <button
          onClick={() => setCurrentGroup('signup')}
          style={{ fontWeight: currentGroup === 'signup' ? 'bold' : 'normal' }}
        >
          Signup
        </button>
      </div>

      <div style={{  height: '1000px' }}>
      <GroupNavigationStack
        id="auth-group"
        navStack={navStackMap}
        current={currentGroup}
        onCurrentChange={setCurrentGroup}
        persist
      />
    </div>
    </div>
  );
};

export default Main;
