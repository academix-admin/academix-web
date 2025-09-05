'use client';


import styles from './rewards-stack.module.css';
import {useNav } from "@/lib/CompleteStackManagement";
import NavigationStack from "@/lib/CompleteStackManagement";
import RewardsPage from "./rewards-page/rewards-page";


const rewardsStackNavLink = {
  reward_page: RewardsPage
};

export const RewardsStack = () => (
  <NavigationStack
    id="rewards-stacks"
    navLink={rewardsStackNavLink}
    entry="reward_page"
    syncHistory
    transition="slide"
    persist
  />
);


