<script setup lang="ts">
defineProps<{
  label: string;
  value?: string | number | null;
}>();
</script>

<template>
  <div class="info-row">
    <dt>{{ label }}</dt>
    <dd>{{ value || 'Nao informado' }}</dd>
  </div>
</template>
