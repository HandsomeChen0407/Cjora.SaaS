<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { assignUserRole, fetchUserRoles, removeUserRole } from '@/api/sys';
import type { SysUserRole } from '@/api/types';

const loading = ref(false);
const rows = ref<SysUserRole[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(50);
const dialog = ref(false);
const form = ref({ userId: 0, roleId: 0 });

async function load() {
  loading.value = true;
  try {
    const data = await fetchUserRoles(page.value, pageSize.value);
    rows.value = data.items;
    total.value = data.totalCount;
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败');
  } finally {
    loading.value = false;
  }
}

async function onAssign() {
  try {
    await assignUserRole(form.value.userId, form.value.roleId);
    ElMessage.success('已分配');
    dialog.value = false;
    form.value = { userId: 0, roleId: 0 };
    await load();
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '分配失败');
  }
}

async function onRemove(id: number) {
  try {
    await removeUserRole(id);
    ElMessage.success('已移除');
    await load();
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '移除失败');
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="toolbar">
      <el-button type="primary" @click="dialog = true">分配角色</el-button>
      <el-button @click="load">刷新</el-button>
    </div>
    <el-table v-loading="loading" :data="rows" stripe>
      <el-table-column prop="id" label="Id" width="90" />
      <el-table-column prop="userId" label="用户 Id" />
      <el-table-column prop="roleId" label="角色 Id" />
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="s">
          <el-button link type="danger" @click="onRemove(s.row.id)">移除</el-button>
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

    <el-dialog v-model="dialog" title="分配用户角色" width="480px">
      <el-form label-width="100px">
        <el-form-item label="用户 Id">
          <el-input-number v-model="form.userId" style="width: 100%" />
        </el-form-item>
        <el-form-item label="角色 Id">
          <el-input-number v-model="form.roleId" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="onAssign">保存</el-button>
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
