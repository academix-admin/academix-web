'use client';
import { use, useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';
import Link from 'next/link';
import { useUserData } from '@/lib/stacks/user-stack';
import { useAwaitableRouter } from "@/hooks/useAwaitableRouter";
import { StateStack } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { fetchUserData } from "@/utils/checkers";

type RedirectState = 'initial' | 'loading' | 'invalid' | 'error';

export default function Redirect({ params }: { params: Promise<{ redirectId: string }> }) {
    const { redirectId } = use(params);
    const { userData$ } = useUserData();
    const { replaceAndWait } = useAwaitableRouter();
    const [redirectState, setRedirectState] = useState<RedirectState>('initial');

    const clearClientState = useCallback(async (): Promise<void> => {
        await Promise.all([
            StateStack.core.clearScope('mission_flow'),
            StateStack.core.clearScope('achievements_flow'),
            StateStack.core.clearScope('payment_flow'),
            StateStack.core.clearScope('secondary_flow'),
        ]);
        sessionStorage.clear();
    }, []);

    const processRedirect = useCallback(async (): Promise<void> => {
        // Prevent multiple simultaneous executions
        if (redirectState === 'loading') return;

        try {
            setRedirectState('loading');

            const response = await fetch('/api/consume-redirect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ redirectId }),
            });

            // Check if response is JSON before parsing
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response:', text.substring(0, 200));
                throw new Error('Server returned non-JSON response');
            }

            const result = await response.json();
           console.log(result);
            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }

            if (result.status === 'success') {
                const { data: sessionData, error: sessionError } = await supabaseBrowser.auth.setSession({
                    access_token: result.session.access_token,
                    refresh_token: result.session.refresh_token,
                });

                if (sessionError) {
                    throw sessionError;
                }

                await clearClientState();

                const userObj = await fetchUserData(result.userId);
                await userData$.set(userObj);

                await replaceAndWait(result.redirectTo);
            } else {
                setRedirectState('invalid');
            }
        } catch (error) {
            console.error('Redirect error:', error);
            setRedirectState('error');
        }
    }, [redirectId, userData$, replaceAndWait, clearClientState, redirectState]);

    useEffect(() => {
        let isMounted = true;

        const executeRedirect = async () => {
            if (isMounted && redirectState === 'initial') {
                await processRedirect();
            }
        };

        executeRedirect();

        return () => {
            isMounted = false;
        };
    }, [processRedirect, redirectState]);

    const renderContent = (): JSX.Element => {
        switch (redirectState) {
            case 'loading':
                return <div className={styles.loading}>Processing redirect...</div>;
            case 'invalid':
                return (
                    <div className={styles.error}>
                        <h2>Invalid Redirect</h2>
                        <p>This redirect link is invalid or has expired.</p>
                        <Link href="/">Return to Home</Link>
                    </div>
                );
            case 'error':
                return (
                    <div className={styles.error}>
                        <h2>Error</h2>
                        <p>Something went wrong. Please try again.</p>
                        <Link href="/">Return to Home</Link>
                    </div>
                );
            case 'initial':
            default:
                return <div className={styles.loading}>Starting redirect...</div>;
        }
    };

    return (
        <div className={styles.container}>
            {renderContent()}
        </div>
    );
}