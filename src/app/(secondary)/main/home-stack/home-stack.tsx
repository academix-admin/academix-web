'use client';

import styles from './home-stack.module.css';
import {useNav } from "@/lib/NavigationStack";
import NavigationStack from "@/lib/NavigationStack";
import HomePage from "./home-page/home-page";
import NotificationPage from "./notification-page/notification-page";


const homeStackNavLink = {
  home_page: HomePage,
  notification_page: NotificationPage
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


