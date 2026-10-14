import { notificationService } from './notificationService';

export class PwaService {
  private static deferredPrompt: any = null;

  static init() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      this.deferredPrompt = e;
      console.log('PWA: beforeinstallprompt event captured');
    });

    window.addEventListener('appinstalled', () => {
      // Log install to analytics
      console.log('PWA: App installed');
      this.deferredPrompt = null;
    });
  }

  static async installApp() {
    if (!this.deferredPrompt) {
      console.log('PWA: No install prompt available');
      return false;
    }

    // Show the install prompt
    this.deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`PWA: User response to install prompt: ${outcome}`);

    // We've used the prompt, and can't use it again, throw it away
    this.deferredPrompt = null;
    return outcome === 'accepted';
  }

  static async requestNotificationPermission() {
    if (!('Notification' in window)) {
      console.log('PWA: This browser does not support desktop notification');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  static async showLocalNotification(title: string, options?: NotificationOptions) {
    if (Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/logo192.png',
        badge: '/favicon.ico',
        ...options,
      });
      return true;
    }
    return false;
  }

  static isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
  }
}
