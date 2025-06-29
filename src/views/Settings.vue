<template>
  <div class="settings-container">

    <div v-if="serverName">
      <div class="header-section">
        <h3>{{ serverName }} - 服务器设置</h3>
      </div>
      

      <a-tabs v-model:activeKey="activeTab" class="server-tabs">
        <a-tab-pane key="config" tab="服务器配置">

          <a-card title="服务器配置" class="settings-card">
        <div v-if="isLoading" class="loading-placeholder">
          <a-skeleton active :paragraph="{ rows: 8 }" />
        </div>
        <a-form v-else-if="serverConfig" :model="serverConfig" @finish="saveServerConfig">
          <a-form-item label="服务器名称">
            <a-input v-model:value="serverConfig.name" disabled />
          </a-form-item>
          <a-form-item label="服务器备注">
            <a-textarea v-model:value="serverConfig.desc" placeholder="请输入服务器备注" :rows="3" />
          </a-form-item>
          <a-form-item label="服务器地图">
            <a-select v-model:value="serverConfig.current_map" placeholder="请选择地图" :loading="isSaving">
              <a-select-option value="de_dust2">de_dust2</a-select-option>
              <a-select-option value="de_mirage">de_mirage</a-select-option>
              <a-select-option value="de_inferno">de_inferno</a-select-option>
              <a-select-option value="de_overpass">de_overpass</a-select-option>
              <a-select-option value="de_train">de_train</a-select-option>
              <a-select-option value="de_nuke">de_nuke</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="绑定IP">
             <a-input v-model:value="serverConfig.bind_ip" placeholder="请输入绑定IP" :disabled="isSaving" />
          </a-form-item>
          <a-form-item label="是否启用VAC">
            <a-switch v-model:checked="serverConfig.vac" :disabled="isSaving" />
            <span style="margin-left: 8px;">{{ serverConfig.vac ? '已启用' : '已禁用' }}</span>
          </a-form-item>
          <a-form-item label="最大玩家数量">
            <a-input-number v-model:value="serverConfig.maxplayers" :min="1" :max="128" style="width: 100%;" :disabled="isSaving" />
          </a-form-item>
          <a-form-item label="游戏模式">
            <a-select v-model:value="serverConfig.game_alias" placeholder="请选择游戏模式" :loading="isSaving">
              <a-select-option value="competitive">竞技模式 (Competitive)</a-select-option>
              <a-select-option value="wingman">搭档模式 (Wingman)</a-select-option>
              <a-select-option value="casual">休闲模式 (Casual)</a-select-option>
              <a-select-option value="deathmatch">死亡竞赛 (Deathmatch)</a-select-option>
              <a-select-option value="custom">自定义模式 (Custom)</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="端口">
            <a-input-number v-model:value="serverConfig.port" :min="1024" :max="65535" style="width: 100%;" :disabled="isSaving" />
          </a-form-item>
          <a-form-item>
            <a-space>
              <a-button type="primary" html-type="submit" :loading="isSaving" :disabled="isSaving">
                <template v-if="isSaving">
                  <loading-outlined />
                  保存中...
                </template>
                <template v-else>
                  保存更改
                </template>
              </a-button>
              <a-button type="primary" danger @click="showDeleteConfirm" :disabled="isSaving">
                删除服务器
              </a-button>
            </a-space>
          </a-form-item>
        </a-form>
        <div v-else class="error-placeholder">
          <a-result status="error" title="加载失败" sub-title="无法加载服务器配置，请检查服务器是否存在">
            <template #extra>
              <a-button type="primary" @click="loadServerConfig">重新加载</a-button>
            </template>
          </a-result>
        </div>
      </a-card>
        </a-tab-pane>
        

        <a-tab-pane key="plugins" tab="插件管理">

          <a-card title="插件安装" class="settings-card">
            <div class="plugin-install-section">
              <a-card 
                hoverable 
                class="install-plugin-card"
                :body-style="{ padding: '16px' }"
              >
                <div class="plugin-info">
                  <div class="plugin-header">
                    <h4 class="plugin-name">CS2 Essentials</h4>
                    <a-tag color="blue">推荐插件</a-tag>
                  </div>
                  <p class="plugin-description">
                    HVH常用插件，包括重置分数、修复速射等功能
                    由于技术原因，暂时只提供此插件安装
                  </p>
                  <div class="plugin-actions">
                    <a-button 
                      type="primary" 
                      @click="downloadPlugin"
                      :loading="isDownloading"
                    >
                      <template v-if="isDownloading">
                        <LoadingOutlined />
                        下载中...
                      </template>
                      <template v-else>
                        前往下载
                      </template>
                    </a-button>
                    <a-button 
                      @click="openPluginFolder"
                      style="margin-left: 8px;"
                    >
                      打开插件目录[请把插件解压到此处]
                    </a-button>
                  </div>
                </div>
              </a-card>
            </div>
          </a-card>
          
          <a-card title="服务器插件" class="settings-card">
            <div v-if="isLoadingPlugins" class="loading-placeholder">
              <a-skeleton active :paragraph="{ rows: 4 }" />
            </div>
            <div v-else>
              <div class="plugin-actions" style="margin-bottom: 16px;">
                <a-space>
                  <a-button @click="refreshPlugins" :loading="isLoadingPlugins">
                    <template #icon><ReloadOutlined /></template>
                    刷新插件列表
                  </a-button>
                  <a-alert 
                    message="注意：只能在服务器关闭状态下修改插件" 
                    type="info" 
                    show-icon 
                    style="flex: 1;"
                  />
                </a-space>
              </div>
              
              <div v-if="pluginList.length === 0" class="empty-plugins">
                <a-empty description="暂无插件" />
              </div>
              <a-table 
                v-else
                :columns="pluginColumns" 
                :data-source="pluginList" 
                :pagination="false"
                row-key="name"
                size="middle"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'status'">
                    <a-tag :color="record.enabled ? 'green' : 'red'">
                      {{ record.enabled ? '已启用' : '已禁用' }}
                    </a-tag>
                  </template>
                  <template v-else-if="column.key === 'actions'">
                    <a-space>
                      <a-button 
                        v-if="record.enabled" 
                        size="small" 
                        @click="togglePlugin(record, false)"
                        :disabled="serverConfig?.status === 'running'"
                      >
                        禁用
                      </a-button>
                      <a-button 
                        v-else 
                        size="small" 
                        type="primary" 
                        @click="togglePlugin(record, true)"
                        :disabled="serverConfig?.status === 'running'"
                      >
                        启用
                      </a-button>
                      <a-popconfirm
                        title="确定要删除这个插件吗？"
                        @confirm="deletePlugin(record)"
                        ok-text="确定"
                        cancel-text="取消"
                      >
                        <a-button 
                          size="small" 
                          danger 
                          :disabled="serverConfig?.status === 'running'"
                        >
                          删除
                        </a-button>
                      </a-popconfirm>
                    </a-space>
                  </template>
                </template>
              </a-table>
            </div>
          </a-card>
        </a-tab-pane>
      </a-tabs>

    </div>
    

    <div v-else>
      <h3>全局设置</h3>
      
      <a-card title="游戏路径设置" class="settings-card">
        <a-form :model="settingsForm" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
          <a-form-item label="CS2游戏路径" required>
            <a-input-group compact>
              <a-input 
                v-model:value="settingsForm.cs2Path" 
                placeholder="请选择CS2游戏路径 (cs2.exe文件路径)" 
                style="width: calc(100% - 80px)"
                readonly
              />
              <a-button @click="selectCS2Path" style="width: 80px">选择</a-button>
            </a-input-group>
            <div v-if="cs2PathStatus" class="path-status">
              <span :class="cs2PathStatus.exists ? 'text-success' : 'text-error'">
                {{ cs2PathStatus.exists ? '✓ 路径有效' : '✗ 路径无效或文件不存在' }}
              </span>
            </div>
          </a-form-item>
          
          <a-form-item>
            <a-button type="primary" @click="saveSettings" :loading="isSaving">
              保存设置
            </a-button>
            <a-button style="margin-left: 8px" @click="resetSettings">
              重置
            </a-button>
          </a-form-item>
        </a-form>
      </a-card>
      
      <a-card title="全局配置" class="settings-card">
        <a-descriptions :column="1" bordered>
          <a-descriptions-item label="配置文件路径">
            {{ globalConfigPath }}
          </a-descriptions-item>
          <a-descriptions-item label="服务器数据路径">
            {{ serverDataPath }}
          </a-descriptions-item>
        </a-descriptions>
      </a-card>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeftOutlined, LoadingOutlined, ReloadOutlined } from '@ant-design/icons-vue';

const route = useRoute();
const router = useRouter();

const isSaving = ref(false);
const isLoading = ref(false);
const cs2PathStatus = ref(null);


const activeTab = ref('config');


const isLoadingPlugins = ref(false);
const pluginList = ref([]);
const isDownloading = ref(false);


const pluginColumns = [
  {
    title: '插件名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
  },
];


const serverName = ref(route.query.server || '');
const serverConfig = ref(null);



const settingsForm = ref({
  cs2Path: ''
});


const globalConfigPath = ref('');
const serverDataPath = ref('');


const initPaths = async () => {
  try {

    const userHome = await window.electronAPI.getUserDataPath();
    globalConfigPath.value = `${userHome}\\.cssm`;
    serverDataPath.value = `${userHome}\\.cssm\\server.json`;
  } catch (error) {
    console.error('获取用户目录失败:', error);

    const defaultPath = 'C:\\Users\\User';
    globalConfigPath.value = `${defaultPath}\\.cssm`;
    serverDataPath.value = `${defaultPath}\\.cssm\\server.json`;
  }
};


const selectCS2Path = async () => {
  try {
    const result = await window.electronAPI.selectFile({
      filters: [{ name: 'CS2 Executable', extensions: ['exe'] }],
      properties: ['openFile']
    });
    
    if (result && result.path) {
      settingsForm.value.cs2Path = result.path;
      await checkCS2Path();
    }
  } catch (error) {
    message.error('选择文件失败');
  }
};


const checkCS2Path = async () => {
  if (!settingsForm.value.cs2Path) {
    cs2PathStatus.value = null;
    return;
  }
  
  try {
    const result = await window.electronAPI.checkFileExists(settingsForm.value.cs2Path);
    cs2PathStatus.value = {
      exists: true//result.exists && settingsForm.value.cs2Path.toLowerCase().endsWith('cs2.exe')
    };
  } catch (error) {
    cs2PathStatus.value = { exists: false };
  }
};


const saveSettings = async () => {
  if (!settingsForm.value.cs2Path) {
    message.warning('请选择CS2游戏路径');
    return;
  }
  
  if (!cs2PathStatus.value?.exists) {
    message.error('CS2路径无效，请选择正确的cs2.exe文件');
    return;
  }
  
  isSaving.value = true;
  
  try {
    const config = {
      game: {
        cs2: {
          path: settingsForm.value.cs2Path
        }
      }
    };
    
    await window.electronAPI.saveConfig(config);
    message.success('设置保存成功');
  } catch (error) {
    message.error('保存设置失败');
  } finally {
    isSaving.value = false;
  }
};


const resetSettings = () => {
  settingsForm.value.cs2Path = '';
  cs2PathStatus.value = null;
};


const saveServerConfig = async () => {
  if (!serverConfig.value) return;
  isSaving.value = true;
  try {

    const plainServerData = JSON.parse(JSON.stringify(serverConfig.value));
    const result = await window.electronAPI.saveServer(plainServerData);
    
    if (result.success) {
      message.success(result.message || '服务器配置已更新');
    } else {
      throw new Error(result.message || '保存服务器配置失败');
    }
  } catch (error) {
    console.error('保存服务器配置失败:', error);
    message.error(error.message || '保存服务器配置失败');
  } finally {
    isSaving.value = false;
  }
};

const loadServerConfig = async () => {
  if (!serverName.value) return;
  
  try {
    isLoading.value = true;
    

    await new Promise(resolve => setTimeout(resolve, 500));
    
    const servers = await window.electronAPI.getServerList();
    const server = servers.find(s => s.name === serverName.value);
    if (server) {
      serverConfig.value = server;
    } else {
      message.error('服务器不存在');
      serverConfig.value = null;
      goBack();
    }
  } catch (error) {
    console.error('加载服务器配置失败:', error);
    message.error('加载服务器配置失败');
    serverConfig.value = null;
  } finally {
    isLoading.value = false;
  }
};


const loadPlugins = async () => {
  if (!serverName.value) return;
  
  try {
    isLoadingPlugins.value = true;
    const plugins = await window.electronAPI.getServerPlugins(serverName.value);
    pluginList.value = plugins;
  } catch (error) {
    console.error('加载插件列表失败:', error);
    message.error('加载插件列表失败');
    pluginList.value = [];
  } finally {
    isLoadingPlugins.value = false;
  }
};

const refreshPlugins = async () => {
  await loadPlugins();
  message.success('插件列表已刷新');
};

const togglePlugin = async (plugin, enable) => {
  if (serverConfig.value?.status === 'running') {
    message.warning('请先停止服务器后再修改插件状态');
    return;
  }
  
  try {
    const result = await window.electronAPI.toggleServerPlugin(serverName.value, plugin.name, enable);
    if (result.success) {
      message.success(`插件 ${plugin.name} 已${enable ? '启用' : '禁用'}`);
      await loadPlugins();
    } else {
      throw new Error(result.message || '操作失败');
    }
  } catch (error) {
    console.error('切换插件状态失败:', error);
    message.error(error.message || '切换插件状态失败');
  }
};

const deletePlugin = async (plugin) => {
  if (serverConfig.value?.status === 'running') {
    message.warning('请先停止服务器后再删除插件');
    return;
  }
  
  try {
    const result = await window.electronAPI.deleteServerPlugin(serverName.value, plugin.name);
    if (result.success) {
      message.success(`插件 ${plugin.name} 已删除`);
      await loadPlugins();
    } else {
      throw new Error(result.message || '删除失败');
    }
  } catch (error) {
    console.error('删除插件失败:', error);
    message.error(error.message || '删除插件失败');
  }
};


const downloadPlugin = async () => {
  try {
    isDownloading.value = true;
    

    await window.electronAPI.openExternal('https://www.123912.com/s/JwZlVv-QTA4H');
    

    await openPluginFolder();
    
    message.info('已打开下载链接和插件目录，请下载完成后将CS2 Essentials文件夹解压到插件目录中');
  } catch (error) {
    console.error('打开下载链接失败:', error);
    message.error('打开下载链接失败');
  } finally {
    isDownloading.value = false;
  }
};


const openPluginFolder = async () => {
  if (!serverName.value) {
    message.warning('请先选择服务器');
    return;
  }
  
  try {

    const result = await window.electronAPI.openPluginFolder(serverName.value);
    if (result.success) {
      message.success('已打开插件目录');
    } else {
      throw new Error(result.message || '打开目录失败');
    }
  } catch (error) {
    console.error('打开插件目录失败:', error);
    message.error(error.message || '打开插件目录失败');
  }
};

const goBack = () => {
  router.push('/server');
};


const showDeleteConfirm = () => {
  Modal.confirm({
    title: '确认删除服务器',
    content: `确定要删除服务器 "${serverName.value}" 吗？此操作不可撤销。`,
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: deleteServer,
  });
};


const deleteServer = async () => {
  if (!serverName.value) return;
  
  try {
    isSaving.value = true;
    const result = await window.electronAPI.deleteServer(serverName.value);
    
    if (result.success) {
      message.success(result.message || '服务器删除成功');

      router.push('/server');
    } else {
      throw new Error(result.message || '删除服务器失败');
    }
  } catch (error) {
    console.error('删除服务器失败:', error);
    message.error(error.message || '删除服务器失败');
  } finally {
    isSaving.value = false;
  }
};




const loadSettings = async () => {
  try {
    const config = await window.electronAPI.loadConfig();
    if (config?.game?.cs2?.path) {
      settingsForm.value.cs2Path = config.game.cs2.path;
      await checkCS2Path();
    }
  } catch (error) {
    console.log('配置文件不存在或加载失败');
  }
};



onMounted(async () => {
  await initPaths();
  
  if (serverName.value) {
    // 服务器设置页面
    await loadServerConfig();
    await loadPlugins();
  } else {
    // 全局设置页面
    loadSettings();
  }
});
</script>

<style scoped>
.settings-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.header-section {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.back-button {
  margin-right: 16px;
  display: flex;
  align-items: center;
}

.settings-card {
  margin-bottom: 24px;
}

.loading-placeholder {
  text-align: center;
  padding: 40px;
}

.loading-placeholder p {
  margin-top: 16px;
  color: #666;
}



.path-status {
  margin-top: 8px;
  font-size: 12px;
}

.text-success {
  color: #52c41a;
}

.text-error {
  color: #ff4d4f;
}

[data-theme='dark'] .path-status {
  color: #999;
}

.server-tabs {
  margin-top: 16px;
}

.server-tabs .ant-tabs-content-holder {
  padding-top: 16px;
}

.plugin-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.empty-plugins {
  text-align: center;
  padding: 40px 0;
}

.plugin-install-section {
  margin-bottom: 16px;
}

.install-plugin-card {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  transition: all 0.3s;
}

.install-plugin-card:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.09);
}

.plugin-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plugin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.plugin-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.plugin-description {
  margin: 0;
  color: #595959;
  font-size: 14px;
  line-height: 1.5;
}

.plugin-actions {
  display: flex;
  align-items: center;
}

[data-theme='dark'] .plugin-name {
  color: #f0f0f0;
}

[data-theme='dark'] .plugin-description {
  color: #bfbfbf;
}

[data-theme='dark'] .install-plugin-card {
  border-color: #434343;
  background-color: #1f1f1f;
}

[data-theme='dark'] .install-plugin-card:hover {
  border-color: #1890ff;
}


</style>