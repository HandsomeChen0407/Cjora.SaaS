<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { createUser, deleteUser, fetchUsers } from '@/api/sys';
import type { SysUser } from '@/api/types';

const loading = ref(false);
const rows = ref<SysUser[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

const dialog = ref(false);
const form = ref({ loginName: '', displayName: '', isActive: true, departmentId: null as number | null });

async function load() {
  loading.value = true;
  try {
    const data = await fetchUsers(page.value, pageSize.value);
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
    await createUser({
      loginName: form.value.loginName,
      displayName: form.value.displayName,
      isActive: form.value.isActive,
      departmentId: form.value.departmentId
    });
    ElMessage.success('已创建');
    dialog.value = false;
    form.value = { loginName: '', displayName: '', isActive: true, departmentId: null };
    await load();
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '创建失败');
  }
}

async function onDelete(id: number) {
  try {
    await deleteUser(id);
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
      <el-button type="primary" @click="dialog = true">新建用户</el-button>
      <el-button @click="load">刷新</el-button>
    </div>
    <el-table v-loading="loading" :data="rows" stripe style="width: 100%">
      <el-table-column prop="id" label="Id" width="90" />
      <el-table-column prop="loginName" label="登录名" />
      <el-table-column prop="displayName" label="显示名" />
      <el-table-column prop="isActive" label="启用" width="80">
        <template #default="s">
          <el-tag :type="s.row.isActive ? 'success' : 'info'">{{ s.row.isActive ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="departmentId" label="部门 Id" width="100" />
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

    <el-dialog v-model="dialog" title="新建用户" width="480px">
      <el-form label-width="100px">
        <el-form-item label="登录名">
          <el-input v-model="form.loginName" />
        </el-form-item>
        <el-form-item label="显示名">
          <el-input v-model="form.displayName" />
        </el-form-item>
        <el-form-item label="部门 Id">
          <el-input-number v-model="form.departmentId" :controls="false" style="width: 100%" />
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
