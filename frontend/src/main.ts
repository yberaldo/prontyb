import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';

createApp(App).mount('#app');

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Falha ao registrar service worker', error);
    });
  });
}

// Bloqueio leve de pull-to-refresh (mobile). Previne reload quando o usuário puxa a página do topo.
(() => {
  let touchStartY = 0;

  function onTouchStart(e: TouchEvent) {
    if (e.touches && e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
    }
  }

  function onTouchMove(e: TouchEvent) {
    if (!(e.touches && e.touches.length === 1)) return;
    const touchY = e.touches[0].clientY;
    const deltaY = touchY - touchStartY;
    const scrollTop = document.scrollingElement ? document.scrollingElement.scrollTop : window.pageYOffset || 0;

    // Se estiver no topo e puxando para baixo, prevenir comportamento padrão (pull-to-refresh)
    if (deltaY > 10 && scrollTop === 0) {
      e.preventDefault();
    }
  }

  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
})();
