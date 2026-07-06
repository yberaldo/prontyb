import { ref, onMounted, onUnmounted } from 'vue';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
}

const DISMISS_KEY = 'prontyb_pwa_install_dismissed_until';

export default function useInstallPrompt() {
  const showPrompt = ref(false);
  const isIos = ref(false);
  const isStandalone = ref(false);
  let deferredPrompt: BeforeInstallPromptEvent | null = null;

  function isDismissed() {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      const ts = parseInt(raw, 10);
      if (isNaN(ts)) return false;
      return Date.now() < ts;
    } catch {
      return false;
    }
  }

  function setDismissed(days = 7) {
    try {
      const ts = Date.now() + days * 24 * 60 * 60 * 1000;
      localStorage.setItem(DISMISS_KEY, String(ts));
    } catch {}
  }

  async function promptInstall() {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === 'dismissed') {
        setDismissed(1);
      } else {
        setDismissed(365);
      }
    } catch {}
    deferredPrompt = null;
    showPrompt.value = false;
  }

  function dismissPrompt(days = 7) {
    setDismissed(days);
    showPrompt.value = false;
  }

  function handleBeforeInstallPrompt(e: any) {
    try {
      e.preventDefault();
    } catch {}
    deferredPrompt = e as BeforeInstallPromptEvent;
    if (!isStandalone.value && !isDismissed()) {
      showPrompt.value = true;
    }
  }

  function handleAppInstalled() {
    deferredPrompt = null;
    showPrompt.value = false;
    setDismissed(3650);
  }

  onMounted(() => {
    const ua = navigator.userAgent || '';
    isIos.value = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    isStandalone.value = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (navigator as any).standalone === true;

    if (isIos.value && !isStandalone.value && !isDismissed()) {
      showPrompt.value = true;
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled as EventListener);
  });

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.removeEventListener('appinstalled', handleAppInstalled as EventListener);
  });

  return {
    showPrompt,
    isIos,
    isStandalone,
    promptInstall,
    dismissPrompt,
  } as const;
}
