'use client';

import styles from './quiz-stack.module.css';
import {useNav } from "@/lib/NavigationStack";
import NavigationStack from "@/lib/NavigationStack";
import QuizPage from "./quiz-page/quiz-page";
import QuizChallenge from "./quiz-challenge/quiz-challenge";
import QuizCommitment from "./quiz-commitment/quiz-commitment";
import PoolMembers from "./pool-members/pool-members";

const quizStackNavLink = {
  quiz_page: QuizPage,
  quiz_challenge: QuizChallenge,
  quiz_commitment: QuizCommitment,
  pool_members: PoolMembers
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


