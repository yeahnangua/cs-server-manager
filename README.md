#对不起！！！
我把仓库名和项目里面各种地方的名字都打错了，应该是cs-server-manager！有时间我会修改

# CS Server Manager

一个基于 Electron + Vue 3 的 Counter-Strike 2/GO 服务器管理工具，提供图形化界面来管理和监控 CS2/GO 专用服务器

- 这篇README是AI写的，然后我又稍微编辑，看起来可能有些奇怪，但是至少能看。

## 🚀 功能特性

### 插件功能实现
由于此项目初衷是一机多服，所以做了一些资源调度，但是实现方法很笨，不要骂我！！o(╥﹏╥)o(~~至少能用~~)

### 核心功能
- 🖥️ **服务器管理** - 创建、启动、停止和删除 CS2 服务器
- 📊 **实时监控** - 服务器状态监控和性能统计
- 🎮 **控制台管理** - 实时查看服务器日志和执行控制台命令
- ⚙️ **配置管理** - 服务器参数配置和全局设置
- 🔌 **插件管理** - 服务器插件的安装、启用和禁用
- ~~📈 **数据统计** - 服务器运行数据和统计信息~~ 即将完成~

## 🛠️ 技术栈

### 前端
- **Vue 3**
- **Vue Router 4**
- **Ant Design Vue 4** - UI 组件库
- ~~**ECharts 5** - 数据可视化图表库~~ 后期用于数据统计页面，暂未完工
- **Vite 7**

### 桌面端
- **Electron 37**
- **Electron Builder**

### 后端功能
- **Node.js**
- **RCON** - 连接游戏控制台
- **操作系统文件** - 配置文件、日志、插件等管理
- **进程管理** - 游戏服务器进程控制

### 其他库
- **ADM-ZIP** - 压缩文件处理
~~- **Axios** - HTTP 客户端~~这个用不到，但是在package.json里面，我懒得删

## 📦 安装和使用

### 环境要求
- Node.js 16+ 
- npm 或 yarn
- Counter-Strike 2 完整游戏
- Windows 10+

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/ctcakes/cs-server-manger.git
cd cs-server-manger
```

2. **安装依赖**
```bash
npm install
# 或者
yarn install
```

3. **开发模式运行**
```bash
npm run electron:dev
# 或者
yarn electron:dev
```

4. **构建应用**
```bash
npm run electron:build
# 或者
yarn electron:build
```

### 首次配置

1. 启动应用后，进入 **设置** 页面
2. 配置 CS2 游戏路径

## 🎮 使用指南

### 创建服务器
1. 在 **服务器管理** 页面点击 "创建服务器"
2. 填写服务器基本信息：
   - 服务器名称
   - 地图选择
   - 游戏模式
   - 最大玩家数
   - 端口
   - 绑定IP
3. 点击 "创建" 完成服务器创建

### 管理服务器
- **启动/停止** - 一键启动或停止服务器
- **查看状态** - 实时显示服务器运行状态
- **打开控制台** - 查看服务器日志和执行命令
- **编辑设置** - 修改服务器配置参数
- **删除服务器** - 移除不需要的服务器

### 控制台功能
- 实时查看服务器输出日志
- 执行 CS2 控制台命令
- 快速添加 Bot（CT/T）
- 踢出所有 Bot
- 停止服务器

### 插件管理
- 查看已安装插件列表
- 启用/禁用插件
- 删除插件
- 下载新插件(暂时只支持CS2 Ess哦 后续更新)
- 打开插件目录

## 📁 项目结构

```
cs-server-manger/
├── electron/                 # Electron 主进程
│   ├── main.js              # 主进程入口
│   ├── preload/             # 预加载脚本
│   └── utils.js             # 工具函数
├── src/                     # Vue 前端源码
│   ├── views/               # 页面组件
│   │   ├── ServerManagement.vue  # 服务器管理
│   │   ├── CreateServer.vue      # 创建服务器
│   │   ├── Console.vue           # 控制台
│   │   ├── Settings.vue          # 设置页面
│   │   └── Statistics.vue        # 数据统计 未完善
│   ├── router/              # 路由配置
│   ├── App.vue              # 根组件
│   └── main.js              # 前端入口
├── public/                  # 静态资源
├── package.json             # 项目配置
└── vite.config.js           # Vite 配置
```

## ⚙️ 配置文件

### 全局配置 (`~/.cssm/config.json`)
```json
{
  "game": {
    "cs2": {
      "path": "C:/Steam/steamapps/common/Counter-Strike Global Offensive/game/bin/win64/cs2.exe"
    }
  }
}
```

### 服务器配置 (`~/.cssm/server.json`)
服务器列表和配置信息存储在此文件中，包含每个服务器的详细参数设置。不建议手动修改。

## 🔧 开发说明

### 可用脚本
- `npm run dev` - 启动dev服务器(不需要加electron:前缀)
- `npm run build` - 打包前端代码
- `npm run electron:build` - 打包前端&Electron 应用

### 开发环境
- 使用 Vite 进行快速热重载开发
- Electron 开发工具集成

## 🐛 常见问题

### Q: 服务器无法启动？
A: 请检查：
1. CS2 游戏路径是否正确
2. 端口是否被占用
3. 防火墙设置
4. 管理员权限

### Q: 控制台没有输出？
A：由于~~傻逼~~控制台捕捉方法的问题，通过此项目开启的服务器黑窗里不会有输出，想看输出请在对应服务器控制台查看~

### Q: 插件无法加载？
A: 检查：
1. 插件文件完整性
2. 插件兼容性
3. 服务器配置
4. IQ

## 🤝 贡献

~~不~~欢迎提交 Issue 和 Pull Request！
1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👨‍💻 作者

- **CTCAKE** - [B站主页](https://space.bilibili.com/1959347430)

## 🙏 致谢

- Counter-Strike 2 社区
- [来自 hvh.gg 的 CS2 Ess插件](https://hvh.gg/plugins/cs2)
- Vue.js 团队
- Electron 团队
- Ant Design Vue 团队

---

⭐ 如果这个项目对你有帮助，请给它一个star！
