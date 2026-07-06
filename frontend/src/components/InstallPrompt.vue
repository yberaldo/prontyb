<script setup lang="ts">
import useInstallPrompt from '../composables/useInstallPrompt';

const { showPrompt, isIos, promptInstall, dismissPrompt } = useInstallPrompt();
</script>

<template>
  <div v-if="showPrompt" class="pwa-install-banner" role="dialog" aria-live="polite">
    <div class="pwa-install-banner__inner app-shell">
      <div class="pwa-install-banner__left">
        <div class="pwa-install-banner__title">Instale o Prontyb</div>
        <div class="pwa-install-banner__desc" v-if="!isIos">
          Instale o Prontyb para acessar como um aplicativo.
        </div>
        <div class="pwa-install-banner__desc" v-else>
          No iPhone/iPad, toque em "Compartilhar" e depois em "Adicionar à Tela de Início".
        </div>
      </div>

      <div class="pwa-install-banner__actions">
        <button class="secondary-action" @click="dismissPrompt()">Agora não</button>
        <button class="primary-action" @click="promptInstall()">Instalar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pwa-install-banner {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 12px;
  display: flex;
  justify-content: center;
  z-index: 1200;
  pointer-events: auto;
}

.pwa-install-banner__inner {
  width: min(100%, 960px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255,255,255,0.96);
  border: 1px solid rgba(24,33,31,0.07);
  box-shadow: 0 10px 28px rgba(31,41,55,0.06);
}

.pwa-install-banner__left {
  min-width: 0;
}

.pwa-install-banner__title {
  font-weight: 800;
  font-size: 1rem;
  margin-bottom: 2px;
}

.pwa-install-banner__desc {
  color: #52615f;
  font-size: 0.86rem;
}

.pwa-install-banner__actions {
  display: flex;
  gap: 8px;
}

@media (min-width: 860px) {
  .pwa-install-banner {
    bottom: 22px;
  }
}
</style>
