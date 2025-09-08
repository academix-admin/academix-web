'use client';


import styles from './rewards-stack.module.css';
import {useNav } from "@/lib/NavigationStack";
import NavigationStack from "@/lib/NavigationStack";
import RewardsPage from "./rewards-page/rewards-page";


const rewardsStackNavLink = {
  reward_page: RewardsPage,
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


