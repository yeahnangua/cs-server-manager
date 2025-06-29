<template>
  <a-layout id="app">

    <a-layout-header class="header">
      <div class="header-content">
        <h1 class="title">
          <a-icon type="server" style="margin-right: 8px" />
          CS ServerMange
        </h1>
        <a-menu mode="horizontal" :selected-keys="[currentRoute]" class="nav-menu" @click="handleMenuClick">
          <a-menu-item key="/server">
            <template #icon>
              <CloudServerOutlined />
            </template>
            服务器管理
          </a-menu-item>
          <a-menu-item key="/settings">
            <template #icon><setting-outlined /></template>
            设置
          </a-menu-item>
          <a-menu-item key="/stats">
            <template #icon><bar-chart-outlined /></template>
            数据统计
          </a-menu-item>
        </a-menu>
        

        <div class="window-controls">
          <a-button type="text" class="window-control-btn" @click="minimizeWindow">
            <template #icon><minus-outlined /></template>
          </a-button>
          <a-button type="text" class="window-control-btn" @click="toggleMaximize">
            <template #icon>
              <fullscreen-outlined v-if="!isMaximized" />
              <fullscreen-exit-outlined v-else />
            </template>
          </a-button>
          <a-button type="text" class="window-control-btn close-btn" @click="closeWindow">
            <template #icon><close-outlined /></template>
          </a-button>
        </div>
      </div>
    </a-layout-header>


    <a-layout-content class="main-content">

      <div class="breadcrumb-container" v-if="showBreadcrumb">
        <a-breadcrumb class="breadcrumb">
          <a-breadcrumb-item>
            <router-link to="/server" class="home-link">
              <home-outlined />
              <span>首页</span>
            </router-link>
          </a-breadcrumb-item>
          <a-breadcrumb-item v-for="item in breadcrumbItems" :key="item.path">
            <router-link v-if="item.path" :to="item.path">{{ item.name }}</router-link>
            <span v-else>{{ item.name }}</span>
          </a-breadcrumb-item>
        </a-breadcrumb>
        <a-button v-if="canGoBack" @click="goBack" type="text" class="back-button">
          <template #icon><arrow-left-outlined /></template>
          返回
        </a-button>
      </div>

      <router-view v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </a-layout-content>
  </a-layout>
</template>

<script>
import { SettingOutlined, BarChartOutlined, CloudServerOutlined, HomeOutlined, ArrowLeftOutlined, MinusOutlined, FullscreenOutlined, FullscreenExitOutlined, CloseOutlined } from '@ant-design/icons-vue'
import { notification, Button } from 'ant-design-vue';
import { h } from 'vue';
export default {
  name: 'App',
  components: {
    SettingOutlined,
    BarChartOutlined,
    CloudServerOutlined,
    HomeOutlined,
    ArrowLeftOutlined,
    MinusOutlined,
    FullscreenOutlined,
    FullscreenExitOutlined,
    CloseOutlined,
    notification
  },
  data() {
    return {
      isMaximized: false
    }
  },
  computed: {
    currentRoute() {
      return this.$route.path
    },
    showBreadcrumb() {
      
      return true
    },
    canGoBack() {

      return this.$route.path.includes('/settings/') || this.$route.path === '/create'
    },
    
    breadcrumbItems() {
      const path = this.$route.path
      const items = []

      if (path === '/server') {

        return items
      } else if (path === '/settings') {
        items.push({ name: '全局设置', path: null })
      } else if (path.startsWith('/settings/')) {
        const serverName = this.$route.params.serverName
        items.push({ name: '服务器管理', path: '/server' })
        items.push({ name: `${serverName} - 设置`, path: null })
      } else if (path === '/create') {
        items.push({ name: '服务器管理', path: '/server' })
        items.push({ name: '创建服务器', path: null })
      } else if (path === '/stats') {
        notification.open({
          message: '消息',
          description:
            '目前还是一个不完善的版本，只能开启纯净的服务器，插件什么的我后面再研究研究。B站更新(CTCAKE)',
          duration: 0,
          type: 'info',
          btn: () =>
            h(
              Button,
              {
                type: 'primary',
                size: 'small',
                onClick: () => window.open('https://space.bilibili.com/1959347430'),
              },
              { default: () => '作者主页' },
            )
        });
        items.push({ name: '数据统计', path: null })
      } else if (path.startsWith('/console/')) {
        const serverName = this.$route.params.serverName
        items.push({ name: '服务器管理', path: '/server' })
        items.push({ name: `${serverName} - 控制台`, path: null })
      }

      return items
    }
  },
  methods: {
    handleMenuClick({ key }) {
      this.$router.push(key)
    },
    goBack() {
      this.$router.go(-1)
    },
    async minimizeWindow() {
      if (window.electronAPI) {
        await window.electronAPI.windowMinimize()
      }
    },
    async toggleMaximize() {
      if (window.electronAPI) {
        this.isMaximized = await window.electronAPI.windowMaximize()
      }
    },
    async closeWindow() {
      if (window.electronAPI) {
        await window.electronAPI.windowClose()
      }
    }
  },
  async mounted() {
    // 检查初始最大化状态
    if (window.electronAPI) {
      this.isMaximized = await window.electronAPI.windowIsMaximized()
    }
  }
}
</script>

<style>
#app {
  min-height: 100vh;
}

.header {
  background: linear-gradient(135deg, #1890ff 0%, #722ed1 100%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  -webkit-app-region: drag;
}

.nav-menu, .window-controls {
  -webkit-app-region: no-drag;
}

.title {
  color: white;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
}

.nav-menu {
  background: transparent;
  border-bottom: none;
  line-height: 64px;
}

.nav-menu .ant-menu-item {
  color: rgba(255, 255, 255, 0.85);
  border-bottom: 2px solid transparent;
}

.nav-menu .ant-menu-item:hover {
  color: white;
  border-bottom-color: rgba(255, 255, 255, 0.5);
}

.nav-menu .ant-menu-item-selected {
  color: white;
  background: rgba(255, 255, 255, 0.1);
  border-bottom-color: white;
}

.main-content {
  padding: 24px;
  background: #f0f2f5;
  min-height: calc(100vh - 64px);
}


.window-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.window-control-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.85);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.window-control-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
}

.window-control-btn.close-btn:hover {
  background-color: #ff4d4f;
  color: white;
}

.window-control-btn .anticon {
  font-size: 14px;
}



.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateX(0);
}


@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    padding: 16px;
  }

  .title {
    margin-bottom: 16px;
  }

  .nav-menu {
    width: 100%;
    justify-content: center;
  }

  .main-content {
    padding: 16px;
  }
}
</style>
