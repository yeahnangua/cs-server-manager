<template>
  <div class="console-container">
    <div class="header-section">
      <a-button @click="goBack" type="text" class="back-button">
        <template #icon><ArrowLeftOutlined /></template>
        返回服务器管理
      </a-button>
      <h3>{{ serverName }} - 服务器管理</h3>
    </div>
    
    <!-- 导航选项卡 -->
    <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
      <a-tab-pane key="console" tab="控制台">

        <div class="tab-content">

          <a-card title="控制台输出" class="console-card">
            <div class="console-controls">
              <a-button @click="refreshLogs" :loading="isRefreshing" size="small">
                <template #icon><ReloadOutlined /></template>
                刷新日志
              </a-button>
              <a-button @click="clearLogs" size="small" style="margin-left: 8px">
                <template #icon><ClearOutlined /></template>
                清空显示
              </a-button>
              <a-switch 
                v-model:checked="autoRefresh" 
                checked-children="自动刷新" 
                un-checked-children="手动刷新"
                style="margin-left: 16px"
                @change="handleAutoRefreshChange"
              />
            </div>
            <div class="console-output" ref="consoleRef">
              <div v-if="consoleLogs.length === 0" class="no-logs">
                暂无日志输出
              </div>
              <div v-else>
                <div 
                  v-for="(log, index) in displayLogs" 
                  :key="index" 
                  class="log-line"
                  :class="getLogClass(log)"
                >
                  <span class="log-timestamp">{{ formatTimestamp(log.timestamp) }}</span>
                  <span class="log-content">{{ log.content }}</span>
                </div>
              </div>
            </div>
          </a-card>
          

          <a-card title="命令输入" style="margin-top: 16px">
            <div style="display: flex; gap: 8px">
              <a-input
                v-model:value="commandInput"
                placeholder="输入服务器命令..."
                @pressEnter="sendCommand"
                :disabled="isSending"
                style="flex: 1"
              />
              <a-button
                type="primary"
                @click="sendCommand"
                :loading="isSending"
                :disabled="!commandInput.trim()"
              >
                发送
              </a-button>
            </div>
          </a-card>
        </div>
      </a-tab-pane>
      
      <a-tab-pane key="players" tab="玩家列表">

        <div class="tab-content">

          <a-card title="服务器状态" class="status-card">
            <a-row :gutter="16">
              <a-col :span="6">
                <a-statistic title="帧时间" :value="serverStatus.frametime_ms" suffix="ms" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="CPU使用率" :value="serverStatus.cpu_usage" suffix="%" :precision="2" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="当前地图" :value="serverStatus.map" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="服务器端口" :value="serverStatus.udp_port" />
              </a-col>
            </a-row>
            <a-row :gutter="16" style="margin-top: 16px">
              <a-col :span="6">
                <a-statistic title="玩家数量" :value="serverStatus.clients_human" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="Bot数量" :value="serverStatus.clients_bot" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="总内存" :value="serverStatus.mem_phys_total_gb" suffix="GB" :precision="2" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="可用内存" :value="serverStatus.mem_phys_avail_gb" suffix="GB" :precision="2" />
              </a-col>
            </a-row>
            <div style="margin-top: 16px">
              <a-button @click="refreshPlayerList" :loading="isLoadingPlayers" type="primary">
                <template #icon><ReloadOutlined /></template>
                刷新玩家列表
              </a-button>
            </div>
          </a-card>
          

          <a-card title="在线玩家" style="margin-top: 16px">
            <a-table 
              :columns="playerColumns" 
              :data-source="players" 
              :pagination="false"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'action'">
                  <a-button 
                    type="link" 
                    danger 
                    size="small"
                    @click="kickPlayer(record.name)"
                  >
                    踢出
                  </a-button>
                </template>
              </template>
            </a-table>
          </a-card>
          

          <a-card title="Bot管理" style="margin-top: 16px">
            <a-table 
              :columns="botColumns" 
              :data-source="bots" 
              :pagination="false"
              size="small"
            >
            </a-table>
            <div style="margin-top: 16px; display: flex; gap: 8px">
              <a-button @click="addCTBot" :loading="isManagingBots">
                添加CT Bot
              </a-button>
              <a-button @click="addTBot" :loading="isManagingBots">
                添加T Bot
              </a-button>
              <a-button 
                v-if="bots.length > 0" 
                @click="kickAllBots" 
                :loading="isManagingBots" 
                danger
              >
                踢出所有Bot
              </a-button>
            </div>
          </a-card>
        </div>
      </a-tab-pane>
      
      <a-tab-pane key="stop" tab="停止服务器">

        <div class="tab-content">
          <a-card title="停止服务器">
            <a-result
              status="warning"
              title="确认停止服务器"
              sub-title="停止服务器将断开所有玩家连接，确定要继续吗？"
            >
              <template #extra>
                <a-button type="primary" danger @click="stopServer" :loading="isStoppingServer">
                  确认停止
                </a-button>
                <a-button style="margin-left: 8px" @click="activeTab = 'console'">
                  取消
                </a-button>
              </template>
            </a-result>
          </a-card>
        </div>
      </a-tab-pane>
    </a-tabs>

  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { message } from 'ant-design-vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeftOutlined, ReloadOutlined, ClearOutlined } from '@ant-design/icons-vue';

const route = useRoute();
const router = useRouter();

const serverName = ref(route.query.server || '');
const isRefreshing = ref(false);
const autoRefresh = ref(true);
const consoleRef = ref(null);
const consoleLogs = ref([]);
const displayLogs = ref([]);
let refreshTimer = null;
const commandInput = ref('');
const isSending = ref(false);


const activeTab = ref('console');
const isLoadingPlayers = ref(false);
const isManagingBots = ref(false);
const isStoppingServer = ref(false);
const serverStatus = ref({
  frametime_ms: 0,
  mem_phys_total_gb: 0,
  mem_phys_avail_gb: 0,
  cpu_usage: 0,
  clients_bot: 0,
  clients_human: 0,
  map: '',
  udp_port: 0
});
const players = ref([]);
const bots = ref([]);


const playerColumns = [
  {
    title: 'Steam ID',
    dataIndex: 'steamid64',
    key: 'steamid64',
  },
  {
    title: '玩家名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '操作',
    key: 'action',
  },
];


const botColumns = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
  },
];


const refreshLogs = async () => {
  if (isRefreshing.value || !serverName.value) return
  
  isRefreshing.value = true
  try {
    const logs = await window.electronAPI.getServerConsoleLog(serverName.value)
    consoleLogs.value = logs
    updateDisplayLogs()
    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('获取日志失败:', error)
    message.error('获取日志失败')
  } finally {
    isRefreshing.value = false
  }
}


const clearLogs = () => {
  displayLogs.value = [];
};


const sendCommandWithResponse = async (command, waitTime = 1500) => {
  if (!serverName.value) {
    throw new Error('服务器名称不能为空');
  }
  try {
    const result = await window.electronAPI.sendServerCommand(serverName.value, command);
    if (!result.success) {
      throw new Error(result.error);
    }
    await new Promise(resolve => setTimeout(resolve, waitTime));
    const logs = await window.electronAPI.getServerConsoleLog(serverName.value);
    
    const rconResponses = logs.filter(log => {
      const content = log.content;
      return content.includes('[RCON Response]') || 
             content.includes('[RCON 响应]') ||
             (content.includes('frametime_ms') && content.includes('{'));
    });
    let responseData = null;
    if (rconResponses.length > 0) {

      let latestIdx = logs.findIndex(log => log.id === rconResponses[rconResponses.length - 1].id);
      let jsonLines = [];
      let foundStart = false, braceCount = 0;
      for (let i = latestIdx; i < logs.length; i++) {
        const line = logs[i].content;
        if (!foundStart) {
          const idx = line.indexOf('{');
          if (idx !== -1) {
            foundStart = true;
            braceCount += 1;
            jsonLines.push(line.slice(idx));
    
            for (let j = idx + 1; j < line.length; j++) {
              if (line[j] === '{') braceCount++;
              if (line[j] === '}') braceCount--;
            }
            if (braceCount === 0) break;
          }
        } else {
          for (let j = 0; j < line.length; j++) {
            if (line[j] === '{') braceCount++;
            if (line[j] === '}') braceCount--;
          }
          jsonLines.push(line);
          if (braceCount === 0) break;
        }
      }
      let jsonStr = jsonLines.join('\n');
      try {
        responseData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.warn('JSON解析失败:', parseError, jsonStr);
      }
      return {
        success: true,
        rawResponse: jsonStr,
        data: responseData
      };
    }
    return {
      success: true,
      rawResponse: null,
      data: null
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};


const sendCommand = async () => {
  if (!commandInput.value.trim() || !serverName.value || isSending.value) return;
  
  isSending.value = true;
  try {
    const result = await sendCommandWithResponse(commandInput.value.trim());
    
    if (result.success) {
      message.success('命令发送成功');
      commandInput.value = '';

      setTimeout(() => {
        refreshLogs();
      }, 500);
    } else {
      message.error(`命令发送失败: ${result.error}`);
    }
  } catch (error) {
    console.error('发送命令失败:', error);
    message.error('命令发送失败');
  } finally {
    isSending.value = false;
  }
};


const getLogType = (logContent) => {
  if (logContent.includes('[ERROR]') || logContent.includes('ERROR') || logContent.includes('[STDERR]') || logContent.includes('[RCON Error]')) return 'error';
  if (logContent.includes('[WARN]') || logContent.includes('WARNING')) return 'warning';
  if (logContent.includes('[INFO]') || logContent.includes('INFO') || logContent.includes('[START]') || logContent.includes('[STDOUT]')) return 'info';
  if (logContent.includes('[COMMAND]') || logContent.includes('[RCON]')) return 'command';
  if (logContent.includes('[RCON Response]')) return 'response';
  if (logContent.includes('[EXIT]')) {
    message.warning('服务器已被关闭！')
    router.push('/server')
    return 'exit';
  }
  return 'default';
};


const getLogClass = (log) => {
  return {
    'log-error': log.type === 'error',
    'log-warning': log.type === 'warning',
    'log-info': log.type === 'info',
    'log-command': log.type === 'command',
    'log-response': log.type === 'response',
    'log-exit': log.type === 'exit'
  };
};


const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};


const updateDisplayLogs = () => {

  displayLogs.value = consoleLogs.value.map(log => ({
    ...log,
    type: getLogType(log.content)
  })).slice(-1000);
};

const scrollToBottom = () => {
  if (consoleRef.value) {
    consoleRef.value.scrollTop = consoleRef.value.scrollHeight;
  }
};

const startAutoRefresh = () => {
  if (refreshTimer) clearInterval(refreshTimer);
  if (autoRefresh.value && serverName.value) {
    refreshTimer = setInterval(refreshLogs, 2000);
  }
};

const stopAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};

const handleAutoRefreshChange = () => {
  if (autoRefresh.value) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
};

const goBack = () => {
  router.push('/server');
};

const handleTabChange = (key) => {
  activeTab.value = key;
  if (key === 'players') {
    refreshPlayerList();
  }
};


const refreshPlayerList = async () => {
  if (isLoadingPlayers.value || !serverName.value) return;
  
  isLoadingPlayers.value = true;
  try {
    const result = await sendCommandWithResponse('status_json');
    
    if (result.success && result.data) {

      updateServerStatus(result.data);
      message.success('服务器状态已更新');
    } else if (result.success && !result.data) {
      message.warning('未找到服务器状态数据');

    } else {
      message.error(`获取状态失败: ${result.error}`);
    }
  } catch (error) {
    console.error('发送状态命令失败:', error);
    message.error('发送状态命令失败');
  } finally {
    isLoadingPlayers.value = false;
  }
};


const updateServerStatus = (data) => {
  serverStatus.value = {
    frametime_ms: data.frametime_ms || 0,
    mem_phys_total_gb: data.mem_phys_total_gb || 0,
    mem_phys_avail_gb: data.mem_phys_avail_gb || 0,
    cpu_usage: data.server?.cpu_usage || 0,
    clients_bot: data.server?.clients_bot || 0,
    clients_human: data.server?.clients_human || 0,
    map: data.server?.map || '',
    udp_port: data.server?.udp_port || 0
  };
  

  const allClients = data.server?.clients || [];
  

  players.value = allClients
    .filter(client => client.steamid64 !== '0' && client.name && client.name.trim() !== '' && client.bot === false)
    .map((player, index) => ({
      key: index,
      steamid64: player.steamid64,
      name: player.name
    }));
  
  bots.value = allClients
    .filter(client => client.steamid64 === '0' || !client.name || client.name.trim() === '' || client.bot === true)
    .map((bot, index) => ({
      key: index,
      name: bot.name,
      type: 'Bot'
    }));
};


const kickPlayer = async (playerName) => {
  if (!playerName || !serverName.value) return;
  
  try {
    const result = await sendCommandWithResponse(`kick "${playerName}"`, 1000);
    if (result.success) {
      message.success(`已踢出玩家: ${playerName}`);
  
      setTimeout(() => {
        refreshPlayerList();
      }, 500);
    } else {
      message.error(`踢出玩家失败: ${result.error}`);
    }
  } catch (error) {
    console.error('踢出玩家失败:', error);
    message.error('踢出玩家失败');
  }
};


const addCTBot = async () => {
  if (!serverName.value || isManagingBots.value) return;
  
  isManagingBots.value = true;
  try {
    const result = await sendCommandWithResponse('bot_add_ct', 1000);
    if (result.success) {
      message.success('已添加CT Bot');
      setTimeout(() => {
        refreshPlayerList();
      }, 500);
    } else {
      message.error(`添加CT Bot失败: ${result.error}`);
    }
  } catch (error) {
    console.error('添加CT Bot失败:', error);
    message.error('添加CT Bot失败');
  } finally {
    isManagingBots.value = false;
  }
};


const addTBot = async () => {
  if (!serverName.value || isManagingBots.value) return;
  
  isManagingBots.value = true;
  try {
    const result = await sendCommandWithResponse('bot_add_t', 1000);
    if (result.success) {
      message.success('已添加T Bot');
      setTimeout(() => {
        refreshPlayerList();
      }, 500);
    } else {
      message.error(`添加T Bot失败: ${result.error}`);
    }
  } catch (error) {
    console.error('添加T Bot失败:', error);
    message.error('添加T Bot失败');
  } finally {
    isManagingBots.value = false;
  }
};


const kickAllBots = async () => {
  if (!serverName.value || isManagingBots.value) return;
  
  isManagingBots.value = true;
  try {
    const result = await sendCommandWithResponse('bot_kick', 1000);
    if (result.success) {
      message.success('已踢出所有Bot');
      setTimeout(() => {
        refreshPlayerList();
      }, 500);
    } else {
      message.error(`踢出Bot失败: ${result.error}`);
    }
  } catch (error) {
    console.error('踢出Bot失败:', error);
    message.error('踢出Bot失败');
  } finally {
    isManagingBots.value = false;
  }
};


const stopServer = async () => {
  if (!serverName.value || isStoppingServer.value) return;
  
  isStoppingServer.value = true;
  try {
    const result = await window.electronAPI.stopServer(serverName.value);
    if (result.success) {
      message.success('服务器已停止');
  
      router.push('/server');
    } else {
      message.error(`停止服务器失败: ${result.error}`);
    }
  } catch (error) {
    console.error('停止服务器失败:', error);
    message.error('停止服务器失败');
  } finally {
    isStoppingServer.value = false;
  }
};


onMounted(async () => {
  if (!serverName.value) {
    message.error('服务器名称不能为空');
    goBack();
    return;
  }
  
  await refreshLogs();
  startAutoRefresh();
});

// 组件卸载时清理定时器
onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<style scoped>
.console-container {
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

.console-card {
  margin-bottom: 24px;
}

.console-controls {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.console-output {
  height: 500px;
  overflow-y: auto;
  background: #1e1e1e;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
}

.no-logs {
  color: #999;
  text-align: center;
  padding: 40px;
}

.log-line {
  margin-bottom: 2px;
  word-wrap: break-word;
  color: #d4d4d4;
}

.log-line.log-error {
  color: #f56565;
}

.log-line.log-warning {
  color: #ed8936;
}

.log-line.log-info {
  color: #4299e1;
}

.log-line.log-command {
  color: #52c41a;
  font-weight: bold;
}

.log-line.log-response {
  color: #1890ff;
  background-color: #f0f8ff;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
}

.log-line.log-exit {
  color: #722ed1;
  font-weight: bold;
}

.log-timestamp {
  color: #888;
  margin-right: 8px;
  font-size: 11px;
}

.log-content {
  white-space: pre-wrap;
}

[data-theme='dark'] .console-output {
  background: #0d1117;
  border-color: #30363d;
}

[data-theme='dark'] .console-controls {
  border-bottom-color: #30363d;
}

/* 滚动条样式 */
.console-output::-webkit-scrollbar {
  width: 8px;
}

.console-output::-webkit-scrollbar-track {
  background: #2d2d2d;
  border-radius: 4px;
}

.console-output::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}

.console-output::-webkit-scrollbar-thumb:hover {
  background: #777;
}

/* 新增样式 */
.tab-content {
  padding: 16px 0;
}

.status-card {
  margin-bottom: 16px;
}

.status-card .ant-statistic-title {
  font-size: 12px;
  color: #666;
}

.status-card .ant-statistic-content {
  font-size: 16px;
  font-weight: 600;
}

.ant-table-small .ant-table-tbody > tr > td {
  padding: 8px;
}

.ant-tabs-content-holder {
  padding: 0;
}

.ant-result {
  padding: 48px 32px;
}

[data-theme='dark'] .status-card .ant-statistic-title {
  color: #999;
}

[data-theme='dark'] .ant-table-small .ant-table-tbody > tr > td {
  border-bottom-color: #30363d;
}
</style>