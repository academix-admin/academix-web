'use client';


import styles from './payment-stack.module.css';
import {useNav } from "@/lib/CompleteStackManagement";
import NavigationStack from "@/lib/CompleteStackManagement";
import PaymentPage from "./payment-page/payment-page";

const paymentStackNavLink = {
  payment_page: PaymentPage
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


