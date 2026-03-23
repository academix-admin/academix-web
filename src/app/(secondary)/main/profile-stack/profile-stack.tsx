'use client';

import styles from './profile-stack.module.css';
import { useNav } from "@/lib/NavigationStack";
import NavigationStack from "@/lib/NavigationStack";
import ProfilePage from "./profile-page/profile-page";
import EditProfile from "./edit-profile/edit-profile";
import SecurityPage from "./security-page/security-page";
import SecurityVerification from "./security-verification/security-verification";
import SecurityOtp from "./security-otp/security-otp";
import PinManagement from "./pin-management/pin-management";
import PasswordManagement from "./password-management/password-management";
import RedeemCodes from "./redeem-codes/redeem-codes";
import AboutPage from "../shared/about-page/about-page";
import HelpPage from "../shared/help-page/help-page";
import RewardsInfo from "../shared/rewards-info/rewards-info";
import RatesPage from "../shared/rates-page/rates-page";
import RulesPage from "../shared/rules-page/rules-page";
import PayoutPage from "../shared/payout-page/payout-page";
import InstructionsPage from "../shared/instructions-page/instructions-page";
import TermsPage from "../shared/terms-page/terms-page";
import PrivacyPage from "../shared/privacy-page/privacy-page";
import RolesPage from "./roles-page/roles-page";
import Pin from "../shared/pin/pin";


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
  security_page: SecurityPage,
  security_verification: SecurityVerification,
  security_otp: SecurityOtp,
  pin_mangement: PinManagement,
  password_management: PasswordManagement,
  privacy_page: PrivacyPage,
  terms_page: TermsPage,
  roles_page: RolesPage,
  pin: Pin
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


