'use client';

import styles from './profile-stack.module.css';
import {useNav } from "@/lib/CompleteStackManagement";
import NavigationStack from "@/lib/CompleteStackManagement";
import ProfilePage from "./profile-page/profile-page";

const profileStackNavLink = {
  profile_page: ProfilePage
};

export const ProfileStack = () => (
  <NavigationStack
    id="profile-stack"
    navLink={profileStackNavLink}
    entry="profile_page"
    syncHistory
    transition="slide"
    persist
  />
);


