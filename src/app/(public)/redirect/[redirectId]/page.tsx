"use client";

import { use, useState, useEffect, useCallback } from "react";
import styles from "./page.module.css";
import Link from "next/link";

import { useUserData } from "@/lib/stacks/user-stack";
import { useAwaitableRouter } from "@/hooks/useAwaitableRouter";
import { StateStack } from "@/lib/state-stack";
import { supabaseBrowser } from "@/lib/supabase/client";
import { fetchUserData } from "@/utils/checkers";

import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

type RedirectState =
  | "initial"
  | "loading"
  | "popup_blocked"
  | "invalid"
  | "error";

export default function Redirect({
  params,
}: {
  params: Promise<{ redirectId: string }>;
}) {
  const { redirectId } = use(params);
  const { userData$ } = useUserData();
  const { newWindowCloseCurrentWait } = useAwaitableRouter();

  const { theme } = useTheme();
  const { t } = useLanguage();

  const [redirectState, setRedirectState] = useState<RedirectState>("initial");
  const [fallbackUrl, setFallbackUrl] = useState<string>("");

  /** Clears all local state */
  const clearClientState = useCallback(async (): Promise<void> => {
    await Promise.all([
      StateStack.core.clearScope("mission_flow"),
      StateStack.core.clearScope("achievements_flow"),
      StateStack.core.clearScope("payment_flow"),
      StateStack.core.clearScope("secondary_flow"),
    ]);
    sessionStorage.clear();
  }, []);

  /** Main redirect processor */
  const processRedirect = useCallback(async () => {
    if (redirectState === "loading") return;

    try {
      setRedirectState("loading");

      const response = await fetch("/api/consume-redirect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ redirectId }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      if (result.status !== "success") {
        setRedirectState("invalid");
        return;
      }

      /** Set Supabase session */
      const { error: sessionError } = await supabaseBrowser.auth.setSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token,
      });

      if (sessionError) throw sessionError;

      /** Clear stale state */
      await clearClientState();

      const userObj = await fetchUserData(result.userId);
      await userData$.set(userObj);

      /**
       * Try opening the new window immediately.
       * This WILL be popup-blocked on most auto flows.
       */
      const target = 'http://192.168.1.196:3000/main?group=payment-stack&nav=payment-stack%3A1.a1.b1'; //result.redirectTo;
      const navigation = await newWindowCloseCurrentWait(
        target,
        "_blank"
      );

      if (!navigation.success) {
        // Store fallback URL and show manual button
        setFallbackUrl(target);
        setRedirectState("popup_blocked");
        return;
      }

      // All good
      setRedirectState("initial");
    } catch (err) {
      console.error("Redirect error:", err);
      setRedirectState("error");
    }
  }, [redirectId, redirectState, clearClientState, userData$, newWindowCloseCurrentWait]);

  /** Trigger redirect on mount */
  useEffect(() => {
    if (redirectState === "initial") {
      processRedirect();
    }
  }, [processRedirect, redirectState]);

  /** Try again only via user gesture */
  const handleManualOpen = async () => {
    const nav = await newWindowCloseCurrentWait(fallbackUrl, "_blank");
    if (nav.success) {
      setRedirectState("initial");
    }
  };

  /** Render UI depending on state */
  const renderContent = () => {
    switch (redirectState) {
      case "loading":
        return <div className={styles.loading}>{t("processing_redirect")}</div>;

      case "popup_blocked":
        return (
          <div className={styles.error}>
            <h2>{t("popup_blocked_title")}</h2>
            <p>{t("popup_blocked_message")}</p>

            <button className={styles.retryBtn} onClick={handleManualOpen}>
              {t("open_window_manually")}
            </button>
          </div>
        );

      case "invalid":
        return (
          <div className={styles.error}>
            <h2>{t("invalid_redirect_title")}</h2>
            <p>{t("invalid_redirect_message")}</p>
            <Link href="/">{t("return_home")}</Link>
          </div>
        );

      case "error":
        return (
          <div className={styles.error}>
            <h2>{t("generic_error_title")}</h2>
            <p>{t("generic_error_message")}</p>
            <Link href="/">{t("return_home")}</Link>
          </div>
        );

      default:
        return <div className={styles.loading}>{t("starting_redirect")}</div>;
    }
  };

  return (
    <div className={`${styles.container} ${styles[`container_${theme}`]}`}>
      {renderContent()}
    </div>
  );
}
