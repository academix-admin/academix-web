'use client';

import styles from './home-stack.module.css';
import {useNav } from "@/lib/NavigationStack";
import NavigationStack from "@/lib/NavigationStack";
import HomePage from "./home-page/home-page";
import NotificationPage from "./notification-page/notification-page";
import QuizResultPage from "../shared/quiz-result-page/quiz-result-page";


const homeStackNavLink = {
  home_page: HomePage,
  notification_page: NotificationPage,
  quiz_result_page: QuizResultPage
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


