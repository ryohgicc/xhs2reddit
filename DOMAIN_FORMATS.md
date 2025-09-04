# 小红书域名格式对比与触发规则

## 域名格式详细对比

### 1. 首页推荐页格式
```
https://www.xiaohongshu.com/explore?channel_id=homefeed_recommend
```

**特征分析**:
- **路径**: `/explore` (无具体笔记ID)
- **查询参数**: `channel_id=homefeed_recommend`
- **用途**: 首页推荐流页面
- **内容**: 显示多个笔记的缩略图，无具体笔记内容
- **触发状态**: ❌ **不触发插件**

### 2. 笔记详情页格式
```
https://www.xiaohongshu.com/explore/68af18bc000000001d039900?xsec_token=ABawKBkNei0dF1kbo4WrBgaFhJ7JD2Z-bJle8jRC-DZaM=&xsec_source=pc_feed
```

**特征分析**:
- **路径**: `/explore/[笔记ID]` (包含具体笔记ID)
- **笔记ID格式**: 19位数字组合 (如: 68af18bc000000001d039900)
- **查询参数**: 
  - `xsec_token`: 安全令牌参数
  - `xsec_source`: 来源标识参数
- **用途**: 单个笔记的详情页面
- **内容**: 显示完整的笔记内容，包括标题、正文、图片等
- **触发状态**: ✅ **触发插件**

## 触发规则详解

### 核心识别逻辑

插件通过以下规则识别笔记详情页：

1. **路径匹配** (满足任一即可):
   ```javascript
   // 标准格式
   /explore/[笔记ID]
   
   // 备用格式
   /discovery/item/[笔记ID]
   ```

2. **笔记ID特征**:
   - 长度: 19位字符
   - 组成: 数字和小写字母混合
   - 位置: 紧跟在 `/explore/` 或 `/discovery/item/` 后面

3. **参数无关性**:
   - 查询参数不影响触发判断
   - 支持任意组合的查询参数
   - 包括但不限于: `xsec_token`, `xsec_source`, `channel_id` 等

### SPA导航支持

插件支持单页应用(SPA)的导航变化：

1. **从首页到详情页**:
   - 用户从 `explore?channel_id=homefeed_recommend` 点击笔记
   - URL变化为 `explore/[笔记ID]?...`
   - 插件自动检测并激活

2. **浏览器导航**:
   - 前进/后退按钮操作
   - 无需页面刷新
   - 实时检测URL变化

## 实际应用示例

### 不触发的URL示例
```
# 首页推荐页
https://www.xiaohongshu.com/explore?channel_id=homefeed_recommend
https://www.xiaohongshu.com/explore?channel_id=homefeed_following

# 用户主页
https://www.xiaohongshu.com/user/profile/5f8b9c2b0000000001007f8a

# 搜索结果页
https://www.xiaohongshu.com/search_result?keyword=test
```

### 触发的URL示例
```
# 标准格式
https://www.xiaohongshu.com/explore/68af18bc000000001d039900
https://www.xiaohongshu.com/explore/68af18bc000000001d039900?xsec_token=xxx

# 备用格式
https://www.xiaohongshu.com/discovery/item/68af18bc000000001d039900
https://www.xiaohongshu.com/discovery/item/68af18bc000000001d039900?xsec_source=pc_feed

# 带任意参数
https://www.xiaohongshu.com/explore/68af18bc000000001d039900?any_param=value
```

## 技术实现

### URL检测代码
```javascript
isNoteDetailPage() {
  const url = window.location.href;
  return url.includes('/explore/') || 
         url.includes('/discovery/item/') ||
         /^https:\/\/www\.xiaohongshu\.com\/explore\/[a-zA-Z0-9]+/.test(url) ||
         /^https:\/\/www\.xiaohongshu\.com\/discovery\/item\/[a-zA-Z0-9]+/.test(url);
}
```

### 动态检测机制
```javascript
// 监听URL变化
setupEventListeners() {
  // MutationObserver 检测DOM变化
  // popstate 事件检测浏览器导航
  // 初始加载检测
}
```