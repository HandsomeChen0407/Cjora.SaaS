import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useTenantStore = defineStore('tenant', () => {
  const tenantId = ref<string>(localStorage.getItem('cjora.tenantId') ?? 'default');

  function setTenantId(id: string) {
    tenantId.value = id;
    localStorage.setItem('cjora.tenantId', id);
  }

  return { tenantId, setTenantId };
});
