/**
 * InstallPrompt — PWA Install Banner
 *
 * Shows a beautiful floating prompt encouraging users to install MicroDoc
 * as a PWA. Handles both Android (native beforeinstallprompt API) and
 * iOS (instructional "Add to Home Screen" guide).
 *
 * Behavior:
 * - Shows once per browser session (sessionStorage flag).
 * - Does NOT show if the app is already running in standalone/PWA mode.
 * - On Android: triggers the native browser install dialog.
 * - On iOS: shows step-by-step instructions (Share → Add to Home Screen).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IonButton, IonIcon, isPlatform } from '@ionic/react';
import { shareOutline, addOutline } from 'ionicons/icons';
import './InstallPrompt.css';

const SESSION_KEY = 'pwa_prompt_dismissed';

/**
 * Checks if the app is already running as an installed PWA.
 */
function isRunningStandalone(): boolean {
  // Check display-mode media query (works on most browsers)
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // Check iOS standalone property
  if ((navigator as any).standalone === true) return true;
  return false;
}

/**
 * Detects if the current browser is iOS Safari (the only browser that
 * supports "Add to Home Screen" on iOS).
 */
function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // Chrome, Firefox, etc. on iOS all contain "CriOS", "FxiOS", etc.
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
}

const InstallPrompt: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const deferredPromptRef = useRef<any>(null);
  const isIOS = useRef(false);

  useEffect(() => {
    // Don't show if already installed as PWA
    if (isRunningStandalone()) return;
    // Don't show if already dismissed this session
    if (sessionStorage.getItem(SESSION_KEY)) return;

    isIOS.current = isIOSSafari() || isPlatform('ios');

    if (isIOS.current) {
      // On iOS we can't listen for beforeinstallprompt — just show immediately
      // but only in Safari (other browsers can't add to home screen)
      setVisible(true);
    } else {
      // On Android/desktop Chrome, wait for the native event
      const handler = (e: Event) => {
        e.preventDefault();
        deferredPromptRef.current = e;
        setVisible(true);
      };

      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }
  }, []);

  const dismiss = useCallback(() => {
    setDismissing(true);
    sessionStorage.setItem(SESSION_KEY, '1');
    setTimeout(() => setVisible(false), 350); // match animation duration
  }, []);

  const handleInstall = useCallback(async () => {
    if (isIOS.current) {
      // Show the instructional steps for iOS
      setShowIOSSteps(true);
      return;
    }

    // Android / Chrome — trigger the native install prompt
    const prompt = deferredPromptRef.current;
    if (!prompt) return;

    prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === 'accepted') {
      sessionStorage.setItem(SESSION_KEY, '1');
      setDismissing(true);
      setTimeout(() => setVisible(false), 350);
    }
    // Clear the saved prompt (can only be used once)
    deferredPromptRef.current = null;
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`install-prompt-backdrop${dismissing ? ' dismissing' : ''}`}
        onClick={dismiss}
      />

      {/* Floating card */}
      <div className={`install-prompt-card${dismissing ? ' dismissing' : ''}`}>
        <div className="install-prompt-title">Get the MicroDoc App</div>

        <ul className="install-prompt-benefits">
          <li>
            <span className="benefit-dot" />
            Full offline access — no internet needed
          </li>
          <li>
            <span className="benefit-dot" />
            1-tap launch from your home screen
          </li>
          <li>
            <span className="benefit-dot" />
            Faster, smoother experience
          </li>
        </ul>

        {/* iOS-specific instructional steps */}
        {showIOSSteps && (
          <div className="install-ios-instructions">
            <div className="install-ios-step">
              <span className="step-number">1</span>
              Tap the <IonIcon icon={shareOutline} /> Share button below
            </div>
            <div className="install-ios-step">
              <span className="step-number">2</span>
              Scroll down and tap <IonIcon icon={addOutline} /> <strong>Add to Home Screen</strong>
            </div>
          </div>
        )}

        <div className="install-prompt-actions">
          <IonButton
            fill="clear"
            className="install-prompt-dismiss"
            onClick={dismiss}
          >
            Not Now
          </IonButton>
          <IonButton
            expand="block"
            className="install-prompt-cta"
            onClick={handleInstall}
          >
            {isIOS.current ? (showIOSSteps ? 'Got It' : 'Install') : 'Install'}
          </IonButton>
        </div>
      </div>
    </>
  );
};

export default InstallPrompt;
