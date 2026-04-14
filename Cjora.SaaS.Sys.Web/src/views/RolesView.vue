<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { createRole, deleteRole, fetchRoles } from '@/api/sys';
import type { SysRole } from '@/api/types';

const loading = ref(false);
const rows = ref<SysRole[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const dialog = ref(false);
const form = ref({ code: '', name: '', isSystem: false });

async function load() {
  loading.value = true;
  try {
    const data = await fetchRoles(page.value, pageSize.value);
    rows.value = data.items;
    total.value = data.totalCount;
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败');
  } finally {
    loading.value = false;
  }
}

async function onCreate() {
  try {
    await createRole({ code: form.value.code, name: form.value.name, isSystem: form.value.isSystem });
    ElMessage.success('已创建');
    dialog.value = false;
    form.value = { code: '', name: '', isSystem: false };
    await load();
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '创建失败');
  }
}

async function onDelete(id: number) {
  try {
    await deleteRole(id);
    ElMessage.success('已删除');
    await load();
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败');
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="toolbar">
      <el-button type="primary" @click="dialog = true">新建角色</el-button>
      <el-button @click="load">刷新</el-button>
    </div>
    <el-table v-loading="loading" :data="rows" stripe>
      <el-table-column prop="id" label="Id" width="90" />
      <el-table-column prop="code" label="编码" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="permissionCodesJson" label="权限 JSON" min-width="200" show-overflow-tooltip />
      <el-table-column prop="isSystem" label="系统" width="80">
        <template #default="s">
          <el-tag :type="s.row.isSystem ? 'warning' : 'info'">{{ s.row.isSystem ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="s">
          <el-button link type="danger" @click="onDelete(s.row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-pagination
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      layout="total, prev, pager, next"
      @current-change="load"
    />

    <el-dialog v-model="dialog" title="新建角色" width="480px">
      <el-form label-width="100px">
        <el-form-item label="编码">
          <el-input v-model="form.code" />
        </el-form-item>
        <el-form-item label="名称">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="系统角色">
          <el-switch v-model="form.isSystem" />
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
