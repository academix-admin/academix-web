'use client';


import styles from './rewards-stack.module.css';
import {useNav } from "@/lib/NavigationStack";
import NavigationStack from "@/lib/NavigationStack";
import RewardsPage from "./rewards-page/rewards-page";
import MissionPage from "./mission-page/mission-page";
import AchievementsPage from "./achievements-page/achievements-page";


const rewardsStackNavLink = {
  reward_page: RewardsPage,
  mission_page: MissionPage,
  achievements_page: AchievementsPage,
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


