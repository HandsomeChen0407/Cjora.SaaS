<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTenantStore } from '@/stores/tenant';
import { ElMessage } from 'element-plus';

const route = useRoute();
const router = useRouter();
const tenant = useTenantStore();
const tenantInput = ref(tenant.tenantId);

function applyTenant() {
  const id = tenantInput.value.trim();
  if (!id) {
    ElMessage.warning('租户 Id 不能为空');
    return;
  }
  tenant.setTenantId(id);
  ElMessage.success('已切换租户：' + id);
  router.replace({ path: route.path, query: { ...route.query, _t: Date.now() } });
}

</script>

<template>
  <el-container class="layout">
    <el-aside width="220px">
      <div class="brand">Cjora Sys</div>
      <el-menu :default-active="route.path" router>
        <el-menu-item index="/users">用户</el-menu-item>
        <el-menu-item index="/roles">角色</el-menu-item>
        <el-menu-item index="/departments">部门</el-menu-item>
        <el-menu-item index="/user-roles">用户角色</el-menu-item>
        <el-menu-item index="/tenants">租户</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="tenant-bar">
          <span class="label">X-Tenant-Id</span>
          <el-input v-model="tenantInput" style="width: 220px" clearable />
          <el-button type="primary" @click="applyTenant">应用</el-button>
        </div>
      </el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout {
  min-height: 100vh;
}
.brand {
  padding: 16px;
  font-weight: 600;
  border-bottom: 1px solid var(--el-border-color);
}
.header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color);
}
.tenant-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.label {
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
</style>
