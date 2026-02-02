'use client';

import styles from './profile-stack.module.css';
import {useNav } from "@/lib/NavigationStack";
import NavigationStack from "@/lib/NavigationStack";
import ProfilePage from "./profile-page/profile-page";
import EditProfile from "./edit-profile/edit-profile";
import SecurityPage from "./security-page/security-page";
import RedeemCodes from "./redeem-codes/redeem-codes";
import AboutPage from "../shared/about-page/about-page";
import HelpPage from "../shared/help-page/help-page";
import RewardsInfo from "../shared/rewards-info/rewards-info";
import RatesPage from "../shared/rates-page/rates-page";
import RulesPage from "../shared/rules-page/rules-page";
import PayoutPage from "../shared/payout-page/payout-page";
import InstructionsPage from "../shared/instructions-page/instructions-page";


const profileStackNavLink = {
  profile_page: ProfilePage,
  edit_profile: EditProfile,
  redeem_codes: RedeemCodes,
  about_page: AboutPage,
  rewards_info: RewardsInfo,
  rates_page: RatesPage,
  rules_page: RulesPage,
  payout_page: PayoutPage,
  help_page: HelpPage,
  instructions_page: InstructionsPage,
  security: SecurityPage
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


