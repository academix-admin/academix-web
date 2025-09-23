'use client';


import styles from './payment-stack.module.css';
import {useNav } from "@/lib/NavigationStack";
import NavigationStack from "@/lib/NavigationStack";
import PaymentPage from "./payment-page/payment-page";
import TopUpPage from "./top-up-page/top-up-page";
import ViewTransactionPage from "./view-transaction-page/view-transaction-page";
import NewProfilePage from "./new-profile-page/new-profile-page";

const paymentStackNavLink = {
  payment_page: PaymentPage,
  top_up_page: TopUpPage,
  view_transaction: ViewTransactionPage,
  new_profile: NewProfilePage
//   withdraw_page: WithdrawPage
};

export const PaymentStack = () => (
  <NavigationStack
    id="payment-stack"
    navLink={paymentStackNavLink}
    entry="payment_page"
    syncHistory
    transition="slide"
    persist
  />
);


