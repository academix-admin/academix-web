'use client';

import styles from './quiz-stack.module.css';
import {useNav } from "@/lib/NavigationStack";
import NavigationStack from "@/lib/NavigationStack";
import QuizPage from "./quiz-page/quiz-page";

const quizStackNavLink = {
  quiz_page: QuizPage
};

export const QuizStack = () => (
  <NavigationStack
    id="quiz-stack"
    navLink={quizStackNavLink}
    entry="quiz_page"
    syncHistory
    transition="slide"
    persist
  />
);


