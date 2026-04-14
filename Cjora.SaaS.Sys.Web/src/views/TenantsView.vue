<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { createTenant, fetchTenants } from '@/api/sys';
import type { SysTenant } from '@/api/types';

const loading = ref(false);
const rows = ref<SysTenant[]>([]);
const dialog = ref(false);
const form = ref({ id: '', name: '', isActive: true });

async function load() {
  loading.value = true;
  try {
    rows.value = await fetchTenants();
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败');
  } finally {
    loading.value = false;
  }
}

async function onCreate() {
  try {
    await createTenant({ id: form.value.id.trim(), name: form.value.name.trim(), isActive: form.value.isActive });
    ElMessage.success('已创建');
    dialog.value = false;
    form.value = { id: '', name: '', isActive: true };
    await load();
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '创建失败');
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="toolbar">
      <el-button type="primary" @click="dialog = true">新建租户</el-button>
      <el-button @click="load">刷新</el-button>
    </div>
    <el-alert
      title="租户表为平台级数据；开发环境下与当前 SqlSugar 连接在同一库。切换「X-Tenant-Id」可访问不同租户下的 IAM 数据。"
      type="info"
      show-icon
      :closable="false"
      style="margin-bottom: 12px"
    />
    <el-table v-loading="loading" :data="rows" stripe>
      <el-table-column prop="id" label="Id" width="160" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="isActive" label="启用" width="100">
        <template #default="s">
          <el-tag :type="s.row.isActive ? 'success' : 'info'">{{ s.row.isActive ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAtUtc" label="创建时间" min-width="180" />
    </el-table>

    <el-dialog v-model="dialog" title="新建租户" width="480px">
      <el-form label-width="100px">
        <el-form-item label="租户 Id">
          <el-input v-model="form.id" placeholder="如 acme" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.isActive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="onCreate">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar {
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
}
</style>
