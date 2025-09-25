'use client';

import styles from './profile-stack.module.css';
import {useNav } from "@/lib/NavigationStack";
import NavigationStack from "@/lib/NavigationStack";
import ProfilePage from "./profile-page/profile-page";
import EditProfile from "./edit-profile/edit-profile";

const profileStackNavLink = {
  profile_page: ProfilePage,
  edit_profile: EditProfile,
//   redeem_codes: RedeemCodes
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


