<script setup lang="ts">
defineProps<{
  title: string;
  count?: number;
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyText: string;
}>();
</script>

<template>
  <section class="section-block">
    <div class="section-heading">
      <h2>{{ title }}</h2>
      <span v-if="typeof count === 'number'" class="count-pill">{{ count }}</span>
    </div>

    <p v-if="loading" class="state-text">Carregando...</p>
    <p v-else-if="error" class="state-text state-error">{{ error }}</p>
    <p v-else-if="empty" class="state-text">{{ emptyText }}</p>
    <div v-else class="section-content">
      <slot />
    </div>
  </section>
</template>
