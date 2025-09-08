'use client';

import styles from './home-stack.module.css';
import {useNav } from "@/lib/NavigationStack";
import NavigationStack from "@/lib/NavigationStack";
import HomePage from "./home-page/home-page";


const homeStackNavLink = {
  home_page: HomePage
};

export const HomeStack = () => (
  <NavigationStack
    id="home-stack"
    navLink={homeStackNavLink}
    entry="home_page"
    syncHistory
    transition="slide"
    persist
  />
);


