<template>
  <div>
    <h3 class="server-list-title">服务器列表</h3>


    <a-modal
      v-model:open="downloadModalVisible"
      title="Metamod 下载进度"
      :closable="false"
      :maskClosable="false"
      :footer="null"
      width="500px"
    >
      <div style="text-align: center; padding: 20px;">
        <a-spin size="large" />
        <div style="margin-top: 16px; font-size: 16px; color: #666;">
          {{ downloadStatus }}
        </div>
        <a-progress
          v-if="downloadProgress > 0"
          :percent="downloadProgress"
          :show-info="true"
          style="margin-top: 16px;"
        />
      </div>
    </a-modal>


    <a-skeleton active v-if="loading" />


    <div v-else-if="!ServerEmpty" class="server-list">
      <a-card v-for="server in ServerLists" :key="server.name" hoverable
        :style="{ width: '400px', display: 'inline-block', marginRight: '16px', marginBottom: '16px', height: cardHeight }">
        <a-card-meta :title="server.name" :description="server.desc || '暂无备注'">
          <template #avatar>
            <img :src="server.type === 'cs2' ? '/cs2.png' : '/csgo.png'" :alt="server.type"
              style="width: 40px; height: 40px; border-radius: 4px;" />
          </template>
        </a-card-meta>
        <div style="margin-top: 8px">
          <a-badge :status="server.status === 'running' ? 'processing' : 'default'"
            :text="getStatusText(server.status)" />
        </div>
        <template #actions>
          <a-button 
            :type="server.status === 'running' ? 'danger' : 'primary'"
            :loading="server.loading"
            @click="toggleServerStatus(server)"
            style="margin-right: 8px;"
          >
            {{ server.status === 'running' ? '停止' : '启动' }}
          </a-button>
          <a-button 
            v-if="server.status === 'running'"
            @click="openConsole(server)"
            style="margin-right: 8px;"
          >
            <console-sql-outlined /> 控制台
          </a-button>
          <a-button 
            :disabled="server.status === 'running'"
            @click="editServer(server)"
          >
            <setting-outlined /> 设置
          </a-button>
        </template>
      </a-card>

      <a-card hoverable :style="{ width: '400px', display: 'inline-block', marginRight: '16px', marginBottom: '16px', height: cardHeight }">
        <a-card-meta title="创建服务器" description="快速创建新的CS2或CSGO服务器">
          <template #avatar>
            <div
              style="width: 40px; height: 40px; background: linear-gradient(135deg, #1890ff, #52c41a); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              <plus-outlined style="color: white; font-size: 20px;" />
            </div>
          </template>
        </a-card-meta>
        <div style="margin-top: 8px">
          <a-badge status="success" text="快速完成新服务器搭建" />

        </div>
        <template #actions>
          <router-link to="/server/create">
            <a-button type="primary">立即创建</a-button>
          </router-link>
        </template>
      </a-card>
    </div>


    <a-empty v-else>
      <template #description>
        <span>暂无服务器</span>
      </template>
      <router-link to="/server/create">
        <a-button type="primary">创建服务器</a-button>
      </router-link>
    </a-empty>
  </div>
</template>
<script lang="ts" setup>
import { SettingOutlined, PlusOutlined, ConsoleSqlOutlined } from '@ant-design/icons-vue';
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router';

interface Server {
  name: string;
  path: string;
  desc: string;
  type: 'cs2' | 'csgo';
  status?: string;
  pid?: number;
  loading?: boolean;
}

const ServerLists = ref<Server[]>([]);
const ServerEmpty = ref(true);
const loading = ref(true);
const cardHeight = ref<string>('auto');
const router = useRouter();

// 下载进度相关
const downloadModalVisible = ref(false);
const downloadStatus = ref('');
const downloadProgress = ref(0);


let refreshTimer: NodeJS.Timeout | null = null;


const getStatusText = (status?: string) => {
  switch (status) {
    case 'running':
      return '运行中';
    case 'offline':
      return '离线';
    default:
      return '离线';
  }
};


const setUniformCardHeight = async () => {
  await nextTick();
  const firstCard = document.querySelector('.server-list .ant-card');
  if (firstCard) {
    const height = firstCard.getBoundingClientRect().height;
    cardHeight.value = `${height}px`;
  }
};


const getServerList = async () => {
  try {
    loading.value = true;
    const servers = await (window as any).electronAPI.getServerList();
    ServerLists.value = servers;
    ServerEmpty.value = servers.length === 0;
    

    if (!ServerEmpty.value) {
      await setUniformCardHeight();
      console.log('服务器列表获取成功', servers)
    } else {
      console.log('服务器列表获取失败', servers)
    }
  } catch (error) {
    console.error('获取服务器列表失败:', error);
    ServerEmpty.value = true;
  } finally {
    loading.value = false;
  }
};


const toggleServerStatus = async (server: Server) => {
  try {
    server.loading = true;
    
    if (server.status === 'running') {

      const result = await (window as any).electronAPI.stopServer(server.name);
      if (result.success) {
        message.success(`服务器 ${server.name} 已停止`);
      } else {
        throw new Error(result.message || '停止失败');
      }
    } else {

      const result = await (window as any).electronAPI.startServer(server.name);
      if (result.success) {
        message.success(`服务器 ${server.name} 已启动`);
      } else {
        throw new Error(result.message || '启动失败');
      }
    }
    

    await getServerList();
  } catch (error) {
    console.error('切换服务器状态失败:', error);
    message.error(`操作失败: ${error.message || '未知错误'}`);
  } finally {
    server.loading = false;
  }
};


const editServer = (server: Server) => {

  router.push({
    path: '/settings',
    query: { server: server.name }
  });
};


const openConsole = (server: Server) => {

  router.push({
    path: '/console',
    query: { server: server.name }
  });
};


const startAutoRefresh = () => {

  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  

  refreshTimer = setInterval(() => {
    getServerList();
  }, 5000);
};


const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};


const handleDownloadProgress = (event: any, data: any) => {

  
  switch (data.type) {
    case 'download-start':
      downloadModalVisible.value = true;
      downloadStatus.value = '开始下载 Metamod...';
      downloadProgress.value = 0;
      break;
    case 'download-progress':
      downloadStatus.value = `正在下载 Metamod... (${data.percent}%)`;
      downloadProgress.value = data.percent;
      break;
    case 'download-complete':
      downloadStatus.value = '下载完成，正在解压...';
      downloadProgress.value = 100;
      break;
    case 'extract-start':
      downloadStatus.value = '正在解压 Metamod...';
      break;
    case 'extract-complete':
      downloadStatus.value = '解压完成！';
      setTimeout(() => {
        downloadModalVisible.value = false;
        downloadStatus.value = '';
        downloadProgress.value = 0;
      }, 1500);
      break;
    case 'download-error':
    case 'extract-error':
      downloadStatus.value = `错误: ${data.message}`;
      setTimeout(() => {
        downloadModalVisible.value = false;
        downloadStatus.value = '';
        downloadProgress.value = 0;
      }, 3000);
      break;
  }
};


onMounted(() => {
  getServerList();
  startAutoRefresh();
  

  if ((window as any).electronAPI && (window as any).electronAPI.onDownloadProgress) {
    (window as any).electronAPI.onDownloadProgress(handleDownloadProgress);
  }
});


onUnmounted(() => {
  stopAutoRefresh();
  

  if ((window as any).electronAPI && (window as any).electronAPI.removeDownloadProgressListener) {
    (window as any).electronAPI.removeDownloadProgressListener(handleDownloadProgress);
  }
});
</script>

<style scoped>
.server-list-title {
  margin-top: 10px;
  padding: 0 4px;
  font-size: 20px;
  font-weight: 600;
  color: #262626;
}

.server-list .ant-card {
  overflow: hidden;
}

.server-list .ant-card .ant-card-body {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.server-list .ant-card .ant-card-meta {
  flex: 1;
}

.create-server-card:hover {
  border-color: #1890ff !important;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15) !important;
  transform: translateY(-2px);
}

.create-server-card .ant-card-body {
  padding: 20px;
}

.create-server-card:hover .ant-btn {
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
}
</style>
