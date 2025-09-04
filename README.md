# 小红书笔记搬运助手

一个功能强大的浏览器扩展，用于自动提取小红书笔记内容，包括标题、正文和图片。

## ✨ 功能特点

- 🎯 **自动识别** - 智能识别小红书笔记详情页
- 📋 **内容提取** - 自动提取笔记标题和正文内容
- 🖼️ **图片下载** - 批量下载笔记中的所有图片（支持表情包过滤，兼容最新图片格式 sns-webpic-qc.xhscdn.com）
- 💾 **数据导出** - 将提取内容保存为结构化JSON格式
- 🎨 **悬浮窗口** - 优雅的悬浮窗口设计，不影响正常浏览
- 🔄 **跨平台** - 支持Chrome和Firefox主流浏览器

## 🚀 安装方法

### Chrome浏览器

1. 下载或克隆本扩展代码
2. 打开Chrome浏览器，输入地址栏：`chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择扩展文件夹
6. 扩展安装完成，会在工具栏显示图标

### Firefox浏览器

1. 下载或克隆本扩展代码
2. 打开Firefox浏览器，输入地址栏：`about:debugging`
3. 点击"此Firefox"
4. 点击"临时载入附加组件"
5. 选择扩展文件夹中的`manifest.json`文件
6. 扩展安装完成

## 📖 使用说明

### 基本使用

1. **访问小红书** - 打开小红书网站 `https://www.xiaohongshu.com`
2. **进入笔记详情页** - 点击任意笔记进入详情页面
3. **自动激活** - 扩展会自动在页面右侧显示悬浮窗口
4. **提取内容** - 点击"提取笔记"按钮
5. **下载数据** - 内容提取完成后，点击"下载数据"按钮

### 触发条件详解

扩展会在以下两种小红书页面格式下自动触发：

#### 域名格式对比

| 页面类型 | 域名格式 | 触发状态 | 特点 |
|---------|----------|----------|------|
| **首页/推荐页** | `https://www.xiaohongshu.com/explore?channel_id=homefeed_recommend` | ❌ 不触发 | 首页推荐流，无具体笔记内容 |
| **笔记详情页** | `https://www.xiaohongshu.com/explore/68af18bc000000001d039900?xsec_token=ABawKBkNei0dF1kbo4WrBgaFhJ7JD2Z-bJle8jRC-DZaM=&xsec_source=pc_feed` | ✅ 触发 | 具体笔记内容页面，包含完整信息 |

#### 触发条件详解

扩展现在在小红书explore域名下**常驻展示**，无需特定URL格式限制。

**触发规则**：
- **域名匹配**: `https://www.xiaohongshu.com/explore*`
- **展示方式**: 进入explore相关页面即自动显示
- **无需刷新**: 支持单页应用(SPA)导航

**常驻展示说明**：
扩展将在所有以 `https://www.xiaohongshu.com/explore` 开头的页面中常驻显示，包括：
- 首页推荐页
- 笔记详情页
- 搜索结果页
- 频道页面

无论URL格式如何变化，只要域名匹配，扩展面板将始终可见。

### 功能详解

#### 内容提取
- **标题提取** - 自动识别笔记标题
- **正文提取** - 完整提取笔记正文内容
- **图片下载**：智能提取笔记中的内容图片，支持批量下载
  - 严格过滤规则：只提取包含 `notes_pre_post/` 路径且以 `!nd_dft_wlteh_webp_3` 结尾的图片
  - 自动排除缩略图、头像、广告等非内容图片
  - 保留原图质量，支持webp格式优化
- **数据保存** - 生成包含所有信息的JSON文件

#### 图片提取
- 自动识别笔记中的所有图片，支持小红书最新图片格式
- 支持批量下载，保持原始画质（包括 `sns-webpic-qc.xhscdn.com` 等格式）
- 智能过滤表情包、头像等非内容图片
- 清理图片URL获取高清原图，支持 `notes_pre_post` 路径格式

#### 悬浮窗口
- **拖拽移动** - 支持拖拽窗口到任意位置
- **最小化** - 点击关闭按钮可隐藏窗口
- **响应式** - 适配不同屏幕尺寸

## 🛠️ 技术实现

### 文件结构
```
小红书笔记搬运助手/
├── manifest.json           # Chrome扩展配置文件
├── manifest-firefox.json   # Firefox扩展配置文件
├── content.js              # 内容脚本（核心功能）
├── content.css             # 样式文件
├── popup.html              # 弹出窗口
├── popup.css               # 弹出窗口样式
├── popup.js                # 弹出窗口脚本
├── test.html               # 兼容性测试页面
├── README.md               # 说明文档
└── images/                 # 扩展图标
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### 核心技术
- **Manifest V3** - 使用最新的Chrome扩展标准
- **内容脚本** - 动态注入页面，实现内容提取
- **跨域处理** - 处理小红书图片的跨域下载
- **DOM选择器** - 智能识别小红书页面结构

## 🔍 选择器说明

扩展使用以下选择器来识别小红书内容：

- **标题选择器**:
  - `h1[data-testid="note-title"]`
  - `.note-title`
  - `[class*="note-title"]`

- **内容选择器**:
  - `[data-testid="note-content"]`
  - `.note-content`
  - `[class*="note-content"]`

- **图片选择器**:
  - `img[data-testid="note-image"]`
  - `.note-image img`
  - `[class*="note-image"] img`
  - `img[src*="ci.xiaohongshu.com"]`

### URL匹配规则
扩展将在以下URL格式下激活：
- `https://www.xiaohongshu.com/explore/[笔记ID]`
- `https://www.xiaohongshu.com/discovery/item/[笔记ID]`

**URL格式共同点总结：**
- 域名：`www.xiaohongshu.com`
- 路径格式：`/explore/` 或 `/discovery/item/` 开头
- 笔记ID：由字母和数字组成的唯一标识符
- 参数：支持任意查询参数（如`xsec_token`、`xsec_source`等）
- 所有以 `https://www.xiaohongshu.com/explore/` 和 `https://www.xiaohongshu.com/discovery/item/` 开头的URL都会被匹配

**触发机制优化：**
- 支持直接访问和SPA导航两种场景：
  1. **直接访问**：直接打开笔记详情页URL
  2. **SPA导航**：从小红书首页或其他页面通过点击导航进入笔记详情页
- 支持浏览器前进/后退按钮切换页面时自动触发
- 无需刷新页面即可自动识别内容变化

## 🐛 常见问题

### Q: 扩展不显示悬浮窗口？
A: 请确保：
1. 您在小红书笔记详情页（URL包含`/explore/`）
2. 页面已完全加载
3. 扩展已启用

### Q: 图片下载失败？
A: 可能原因：
1. 网络连接问题
2. 小红书图片链接失效
3. 浏览器权限限制

### Q: 内容提取不完整？
A: 小红书页面结构可能更新，请联系开发者更新选择器。

### Q: 为什么有些图片没有识别到？
A: 扩展会自动过滤表情包、头像等非笔记内容图片。如果确实需要这些图片，可以在代码中修改表情包过滤规则。

### Q: 如何识别表情包？
A: 扩展通过以下方式识别表情包：
- 图片URL包含表情关键词（emoji、sticker、gif等）
- 图片尺寸小于100x100像素
- 文件类型为.gif
- 图片alt文本包含表情相关词汇

## 📝 更新日志

### v1.0.0 (2024-01-01)
- ✅ 初始版本发布
- ✅ 基本内容提取功能
- ✅ 图片下载功能
- ✅ 数据导出功能
- ✅ Chrome/Firefox兼容性

## 🤝 贡献指南

欢迎提交Issue和Pull Request来帮助改进扩展！

### 开发环境
```bash
# 克隆项目
git clone [项目地址]

# 开发模式
# 直接加载扩展文件夹到浏览器

# 代码规范
- 使用ES6+语法
- 遵循Airbnb代码规范
- 添加必要的注释
```

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 📞 联系方式

如有问题或建议，请通过以下方式联系：
- 提交Issue
- 发送邮件

---

**注意**: 本扩展仅供学习和个人使用，请遵守小红书的使用条款和相关法律法规。