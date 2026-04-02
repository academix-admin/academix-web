'use client';


import styles from './payment-stack.module.css';
import {useNav } from "@/lib/NavigationStack";
import NavigationStack from "@/lib/NavigationStack";
import PaymentPage from "./payment-page/payment-page";
import TopUpPage from "./top-up-page/top-up-page";
import WithdrawPage from "./withdraw-page/withdraw-page";
import StatementsPage from "./statements-page/statements-page";
import ViewTransactionPage from "../shared/view-transaction-page/view-transaction-page";
import NewProfilePage from "../shared/new-profile-page/new-profile-page";
import RatesPage from "../shared/rates-page/rates-page";
import Pin from "../shared/pin/pin";

const paymentStackNavLink = {
  payment_page: PaymentPage,
  top_up_page: TopUpPage,
  view_transaction: ViewTransactionPage,
  new_profile: NewProfilePage,
  withdraw_page: WithdrawPage,
  rates_page: RatesPage,
  pin: Pin,
  statements_page: StatementsPage
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


