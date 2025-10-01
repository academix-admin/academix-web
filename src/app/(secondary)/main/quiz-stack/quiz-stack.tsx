'use client';

import styles from './quiz-stack.module.css';
import {useNav } from "@/lib/NavigationStack";
import NavigationStack from "@/lib/NavigationStack";
import QuizPage from "./quiz-page/quiz-page";
import QuizChallenge from "./quiz-challenge/quiz-challenge";

const quizStackNavLink = {
  quiz_page: QuizPage,
  quiz_challenge: QuizChallenge
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


