<template>
  <div>
    <h3>创建服务器</h3>
    <a-steps :current="current" :items="items"></a-steps>
    <div class="steps-content">

      <div v-if="current === 0" class="step-form">
        <a-form :model="serverForm" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
          <a-form-item label="服务器名称" required>
            <a-input v-model:value="serverForm.name" placeholder="请输入服务器名称" :disabled="isProcessing" />
            <div class="name-warning">
              <a-alert
                message="建议使用英文名称"
                description="尽量不要使用中文，如果出现错误建议修改服务器名称为英文并且没有特殊字符"
                type="warning"
                show-icon
                :closable="false"
              />
            </div>
          </a-form-item>
          
          <a-form-item label="服务器备注">
            <a-textarea v-model:value="serverForm.desc" placeholder="请输入服务器备注" :rows="3" :disabled="isProcessing" />
          </a-form-item>
          
          <a-form-item label="游戏类型" required>
            <a-select v-model:value="serverForm.type" placeholder="请选择游戏类型" :loading="isProcessing">
              <a-select-option value="cs2">CS2</a-select-option>
              <a-select-option value="csgo" disabled>CSGO (暂不支持)</a-select-option>
            </a-select>
          </a-form-item>
          
          <a-form-item label="服务器地图">
            <a-select v-model:value="serverForm.current_map" placeholder="请选择地图" :loading="isProcessing">
              <a-select-option value="de_dust2">de_dust2</a-select-option>
              <a-select-option value="de_mirage">de_mirage</a-select-option>
              <a-select-option value="de_inferno">de_inferno</a-select-option>
              <a-select-option value="de_overpass">de_overpass</a-select-option>
              <a-select-option value="de_train">de_train</a-select-option>
              <a-select-option value="de_nuke">de_nuke</a-select-option>
            </a-select>

          </a-form-item>
          
          <a-form-item label="绑定IP">
             <a-input v-model:value="serverForm.bind_ip" placeholder="请输入绑定IP" :disabled="isProcessing" />

           </a-form-item>
          
          <a-form-item label="是否启用VAC">
            <a-switch v-model:checked="serverForm.vac" :disabled="isProcessing" />
            <span style="margin-left: 8px;">{{ serverForm.vac ? '已启用' : '已禁用' }}</span>
          </a-form-item>
          
          <a-form-item label="最大玩家数量">
            <a-input-number v-model:value="serverForm.maxplayers" :min="1" :max="128" style="width: 100%;" :disabled="isProcessing" />
          </a-form-item>
          
          <a-form-item label="游戏模式">
            <a-select v-model:value="serverForm.game_alias" placeholder="请选择游戏模式" :loading="isProcessing">
              <a-select-option value="competitive">竞技模式 (Competitive)</a-select-option>
              <a-select-option value="wingman">搭档模式 (Wingman)</a-select-option>
              <a-select-option value="casual">休闲模式 (Casual)</a-select-option>
              <a-select-option value="deathmatch">死亡竞赛 (Deathmatch)</a-select-option>
              <a-select-option value="custom">自定义模式 (Custom)</a-select-option>
            </a-select>
          </a-form-item>
          
          <a-form-item label="端口">
            <a-input-number v-model:value="serverForm.port" :min="1024" :max="65535" style="width: 100%;" :disabled="isProcessing" />
          </a-form-item>
          
           
        </a-form>
      </div>
      

      <div v-else-if="current === 1" class="step-content">
        <div class="confirm-info">
          <h4>请确认服务器配置信息</h4>
          <a-descriptions :column="1" bordered>
            <a-descriptions-item label="服务器名称">{{ serverForm.name }}</a-descriptions-item>
            <a-descriptions-item label="服务器备注">{{ serverForm.desc || '无' }}</a-descriptions-item>
            <a-descriptions-item label="游戏类型">{{ serverForm.type.toUpperCase() }}</a-descriptions-item>
            <a-descriptions-item label="服务器地图">{{ serverForm.current_map }}</a-descriptions-item>
            <a-descriptions-item label="绑定IP">{{ serverForm.bind_ip }}</a-descriptions-item>
            <a-descriptions-item label="VAC状态">{{ serverForm.vac ? '已启用' : '已禁用' }}</a-descriptions-item>
            <a-descriptions-item label="最大玩家数量">{{ serverForm.maxplayers }}人</a-descriptions-item>
            <a-descriptions-item label="游戏模式">{{ getGameModeText(serverForm.game_alias) }}</a-descriptions-item>
            <a-descriptions-item label="端口">{{ serverForm.port }}</a-descriptions-item>

          </a-descriptions>
          <div class="confirm-note">
            <a-alert
              message="确认信息"
              description="请仔细检查以上配置信息，点击完成后将创建服务器配置。如需修改，请点击上一步返回编辑。"
              type="info"
              show-icon
            />
          </div>
        </div>
      </div>
    </div>
    
    <div class="steps-action">
      <a-button 
        v-if="current < steps.length - 1" 
        type="primary" 
        @click="next" 
        :loading="isProcessing"
        :disabled="!canProceed"
      >
        {{ isProcessing ? '处理中...' : '下一步' }}
      </a-button>
      <a-button 
        v-if="current == steps.length - 1" 
        type="primary" 
        @click="finishCreation"
        :loading="isProcessing"
      >
        {{ isProcessing ? '创建中...' : '完成' }}
      </a-button>
      <a-button v-if="current > 0" style="margin-left: 8px" @click="prev" :disabled="isProcessing">
        上一步
      </a-button>

    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import { message } from 'ant-design-vue';
import { useRouter } from 'vue-router';
import { LoadingOutlined } from '@ant-design/icons-vue';

const router = useRouter();
const current = ref<number>(0);
const isProcessing = ref(false);



const serverForm = ref({
  name: '',
  desc: '',
  type: 'cs2',
  current_map: 'de_dust2',
  bind_ip: '0.0.0.0',
  vac: false,
  maxplayers: 64,
  game_alias: 'competitive',
  port: 27015,
  rcon_password: '123456'
});


const canProceed = computed(() => {
  if (current.value === 0) {
    return serverForm.value.name && 
           serverForm.value.type;
  }
  return true;
});




const checkCS2Path = async () => {
  try {
    const result = await window.electronAPI.checkCS2Path();
    if (!result.exists) {
      message.error('CS2游戏路径未设置或不存在，请先在设置中配置CS2路径');
      return false;
    }
    return true;
  } catch (error) {
    message.error('检查CS2路径失败');
    return false;
  }
};


const saveServerToJson = async () => {
  try {
    const serverData = {
      name: serverForm.value.name,
      desc: serverForm.value.desc,
      type: serverForm.value.type,
      current_map: serverForm.value.current_map,
      bind_ip: serverForm.value.bind_ip,
      vac: serverForm.value.vac,
      maxplayers: serverForm.value.maxplayers,
      game_alias: serverForm.value.game_alias,
      port: serverForm.value.port,
      rcon_password: serverForm.value.rcon_password,
      pid: -1,
      status: 'offline'
    };
    
    await window.electronAPI.saveServer(serverData);
    return true;
  } catch (error) {
    message.error('保存服务器配置失败');
    return false;
  }
};




const getGameModeText = (alias) => {
  const modes = {
    'competitive': '竞技模式 (Competitive)',
    'wingman': '搭档模式 (Wingman)',
    'casual': '休闲模式 (Casual)',
    'deathmatch': '死亡竞赛 (Deathmatch)',
    'custom': '自定义模式 (Custom)'
  };
  return modes[alias] || alias;
};

const next = async () => {
  if (!canProceed.value) {
    message.warning('请完善必填信息');
    return;
  }
  
  isProcessing.value = true;
  
  try {
    if (current.value === 0) {

      if (!canProceed.value) {
        message.warning('请完善必填信息');
        return;
      }
    }
    
    current.value++;
  } finally {
    isProcessing.value = false;
  }
};

const prev = () => {
  if (current.value > 0) {
    current.value--;
  }
};

const finishCreation = async () => {
  isProcessing.value = true;
  
  try {

    const saved = await saveServerToJson();
    if (saved) {
      message.success('服务器创建完成!');
      router.push('/server');
    }
  } finally {
    isProcessing.value = false;
  }
};

const steps = [
  {
    title: '填写基本信息',
    content: '请填写服务器的基本配置信息，包括服务器名称、类型(CS2/CSGO)、端口等参数。',
  },
  {
    title: '确认信息',
    content: '请确认服务器配置信息，确认无误后点击完成创建服务器。',
  },
];

const items = steps.map(item => ({ key: item.title, title: item.title }));
</script>

<style scoped>
.steps-content {
  margin-top: 16px;
  border: 1px dashed #e9e9e9;
  border-radius: 6px;
  background-color: #fafafa;
  min-height: 400px;
  padding: 24px;
}

.step-form {
  max-width: 600px;
  margin: 0 auto;
}

.step-content {
  text-align: center;
  padding: 60px 20px;
}

.confirm-info {
  max-width: 600px;
  margin: 0 auto;
}

.confirm-info h4 {
  text-align: center;
  margin-bottom: 24px;
  color: #1890ff;
}

.confirm-note {
  margin-top: 24px;
}



.steps-action {
  margin-top: 24px;
}

[data-theme='dark'] .steps-content {
  background-color: #2f2f2f;
  border: 1px dashed #404040;
}

[data-theme='dark'] .confirm-info h4 {
  color: #40a9ff;
}

.name-warning {
  margin-top: 8px;
}

.field-note {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
</style>