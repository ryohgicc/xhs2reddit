// 小红书笔记搬运助手 - 内容脚本
class XHSNoteExtractor {
  constructor() {
    this.panel = null;
    this.isExtracting = false;
    this.extractedData = null;

    this.init();
  }

  minimizePanel() {
    console.log("🔽 隐藏面板");
    
    // 保存当前面板状态
    this.panelContent = this.panel.innerHTML;
    this.panelPosition = {
      top: this.panel.style.top || '100px',
      right: this.panel.style.right || '20px'
    };
    
    // 创建悬浮球
    this.panel.innerHTML = `
      <div class="xhs-extractor-floating-ball" id="xhs-floating-ball">
        📋
      </div>
    `;
    
    // 添加悬浮球样式类
    this.panel.classList.add('xhs-extractor-minimized');
    
    // 绑定悬浮球点击和拖拽事件
    const floatingBall = this.panel.querySelector('#xhs-floating-ball');
    if (floatingBall) {
      let isDragging = false;
      let dragStartTime = 0;
      let startX, startY, initialX, initialY;
      
      floatingBall.addEventListener('mousedown', (e) => {
        isDragging = false;
        dragStartTime = Date.now();
        startX = e.clientX;
        startY = e.clientY;
        
        const rect = this.panel.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        
        e.preventDefault();
        
        const handleMouseMove = (e) => {
          const deltaX = e.clientX - startX;
          const deltaY = e.clientY - startY;
          
          // 如果移动距离超过5px，认为是拖拽
          if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
            isDragging = true;
          }
          
          if (isDragging) {
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            
            // 限制在视窗范围内
            const maxX = window.innerWidth - 50;
            const maxY = window.innerHeight - 50;
            
            this.panel.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
            this.panel.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
            this.panel.style.right = 'auto';
          }
        };
        
        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          
          // 如果没有拖拽且点击时间短，则恢复面板
          if (!isDragging && Date.now() - dragStartTime < 200) {
            this.restorePanel();
          }
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      });
    }
    
    // 设置弹窗事件监听器
    this.setupSettingsModalEvents();
  }

  restorePanel() {
    console.log("🔼 恢复面板");
    
    // 恢复面板内容
    this.panel.innerHTML = this.panelContent;
    
    // 移除悬浮球样式类
    this.panel.classList.remove('xhs-extractor-minimized');
    
    // 恢复位置
    this.panel.style.top = this.panelPosition.top;
    this.panel.style.right = this.panelPosition.right;
    
    // 重新绑定事件
    this.getStoredData().then(data => {
      this.setupRedditPanelEvents(data);
    });
  }

  // 准备图片用于粘贴
  async prepareImagesForPasting(data) {
    if (!data.images || data.images.length === 0) {
      console.log("❌ 没有图片需要处理");
      return;
    }

    try {
      console.log(`🖼️ 开始处理 ${data.images.length} 张图片`);
      console.log("📋 图片数据:", data.images);

      // 一次性处理所有图片
      console.log("🔄 开始批量处理图片...");

      // 下载所有图片并收集blob数据
      const imageBlobs = [];
      for (let i = 0; i < data.images.length; i++) {
        const image = data.images[i];
        console.log(`\n📸 处理第 ${i + 1}/${data.images.length} 张图片:`);
        console.log("🔗 图片URL:", image.url);

        try {
          const blob = await this.downloadImageAsBlob(image.url);
          if (blob) {
            // 如果是WebP格式，转换为PNG
            let finalBlob = blob;
            if (blob.type === "image/webp") {
              console.log("🔄 检测到WebP格式，转换为PNG...");
              finalBlob = await this.convertToPng(blob);
            }

            imageBlobs.push(finalBlob);
            console.log(`✅ 第 ${i + 1} 张图片下载成功`);
          } else {
            console.error(`❌ 第 ${i + 1} 张图片下载失败`);
          }
        } catch (error) {
          console.error(`❌ 第 ${i + 1} 张图片处理失败:`, error);
        }
      }

      if (imageBlobs.length === 0) {
        console.log("⚠️ 没有成功下载任何图片");
        this.showNotification("没有成功下载任何图片", "error");
        return;
      }

      console.log(`✅ 成功下载 ${imageBlobs.length} 张图片，开始粘贴...`);

      // 将所有图片逐个复制粘贴到剪贴板
      await this.copyMultipleImagesToClipboard(imageBlobs);

      console.log("🎉 所有图片粘贴完成");
      this.showNotification(
        `成功粘贴 ${imageBlobs.length} 张图片！`,
        "success"
      );
    } catch (error) {
      console.error("❌ 准备图片时出错:", error);
      this.showNotification("图片处理失败，请手动上传", "error");
    }
  }

  // 批量复制多张图片到剪贴板
  async copyMultipleImagesToClipboard(imageBlobs) {
    try {
      console.log(`🔄 开始逐个复制粘贴 ${imageBlobs.length} 张图片...`);

      for (let i = 0; i < imageBlobs.length; i++) {
        const blob = imageBlobs[i];
        console.log(`📋 正在复制第 ${i + 1}/${imageBlobs.length} 张图片`);
        
        // 复制单张图片到剪贴板
        const clipboardItem = new ClipboardItem({
          [blob.type]: blob,
        });
        
        await navigator.clipboard.write([clipboardItem]);
        console.log(`✅ 第 ${i + 1} 张图片已复制到剪贴板`);
        
        // 立即粘贴每张图片
        await this.simulatePaste();
        console.log(`📌 第 ${i + 1} 张图片已粘贴`);
        
        // 添加延迟避免操作过快
        await this.sleep(500);
      }
      
      console.log(`✅ 成功处理并粘贴 ${imageBlobs.length} 张图片`);
      return true;
    } catch (error) {
      console.error("❌ 逐个复制粘贴图片失败:", error);
      return false;
    }
  }

  // 下载图片为Blob
  async downloadImageAsBlob(imageUrl) {
    try {
      console.log("下载图片:", imageUrl);

      // 使用chrome.runtime.sendMessage发送到background script处理CORS
      return new Promise((resolve) => {
        if (
          typeof chrome !== "undefined" &&
          chrome.runtime &&
          chrome.runtime.sendMessage
        ) {
          chrome.runtime.sendMessage(
            { action: "downloadImage", url: imageUrl },
            (response) => {
              if (response && response.success) {
                // 将base64转换为Blob
                const byteCharacters = atob(response.data.split(",")[1]);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], {
                  type: response.contentType || "image/jpeg",
                });
                console.log("图片下载成功，大小:", blob.size, "bytes");
                resolve(blob);
              } else {
                console.error("Background script下载失败:", response?.error);
                resolve(null);
              }
            }
          );
        } else {
          console.error("Chrome扩展API不可用");
          resolve(null);
        }
      });
    } catch (error) {
      console.error("下载图片失败:", error);
      return null;
    }
  }

  // 将图片设置到剪贴板
  async setImageToClipboard(imageBlob) {
    try {
      console.log("开始设置图片到剪贴板，图片大小:", imageBlob.size, "bytes");

      if (navigator.clipboard && navigator.clipboard.write) {
        console.log("剪贴板API可用，开始转换图片格式");

        // 统一转换为PNG格式，这是最广泛支持的格式
        const pngBlob = await this.convertToPng(imageBlob);
        console.log("图片转换完成，PNG大小:", pngBlob.size, "bytes");

        const clipboardItem = new ClipboardItem({
          "image/png": pngBlob,
        });

        console.log("开始写入剪贴板...");
        await navigator.clipboard.write([clipboardItem]);
        console.log("图片已成功设置到剪贴板，格式: PNG");

        // 验证剪贴板内容
        try {
          const clipboardItems = await navigator.clipboard.read();
          console.log("剪贴板验证成功，包含", clipboardItems.length, "个项目");
          for (let i = 0; i < clipboardItems.length; i++) {
            const types = clipboardItems[i].types;
            console.log(`剪贴板项目 ${i}:`, types);
          }
        } catch (verifyError) {
          console.log("剪贴板验证失败，但写入可能成功:", verifyError);
        }

        return true;
      } else {
        console.log("浏览器不支持剪贴板API");
        return false;
      }
    } catch (error) {
      console.error("设置剪贴板失败:", error);
      console.error("错误详情:", error.message);
      return false;
    }
  }

  // 将任意格式图片转换为PNG格式
  async convertToPng(imageBlob) {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((pngBlob) => {
          console.log(
            "图片转换为PNG成功，原格式:",
            imageBlob.type,
            "原大小:",
            imageBlob.size,
            "新大小:",
            pngBlob.size
          );
          resolve(pngBlob);
        }, "image/png");
      };

      img.onerror = () => {
        console.error("图片转换失败，创建空白PNG");
        // 创建一个1x1的透明PNG作为fallback
        canvas.width = 1;
        canvas.height = 1;
        canvas.toBlob((fallbackBlob) => {
          resolve(fallbackBlob);
        }, "image/png");
      };

      img.src = URL.createObjectURL(imageBlob);
    });
  }

  init() {
    this.checkAndCreatePanel();
    this.setupUrlChangeListener();
  }

  checkAndCreatePanel() {
    if (this.isRedditSubmitPage()) {
      this.createRedditPanel();
      // 监听存储变化，实时更新Reddit页面内容
      this.setupStorageListener();
    } else {
      this.createPanel();
    }
  }

  setupUrlChangeListener() {
    // 监听URL变化（用于SPA页面导航）
    let currentUrl = window.location.href;
    
    // 使用MutationObserver监听DOM变化，间接检测URL变化
    const observer = new MutationObserver(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        console.log('🔄 检测到URL变化:', currentUrl);
        
        // 移除现有面板
        const existingPanel = document.querySelector('.xhs-extractor-panel');
        if (existingPanel) {
          existingPanel.remove();
        }
        
        // 延迟重新检查并创建面板，等待页面内容加载
        setTimeout(() => {
          this.checkAndCreatePanel();
        }, 1000);
      }
    });
    
    // 监听整个document的变化
    observer.observe(document, {
      childList: true,
      subtree: true
    });
    
    // 同时监听popstate事件（浏览器前进后退）
    window.addEventListener('popstate', () => {
      console.log('🔄 检测到popstate事件');
      setTimeout(() => {
        const existingPanel = document.querySelector('.xhs-extractor-panel');
        if (existingPanel) {
          existingPanel.remove();
        }
        this.checkAndCreatePanel();
      }, 1000);
    });
  }

  setupStorageListener() {
    // 监听存储变化
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local" && changes.lastExtractedNote) {
        // 当存储的笔记数据发生变化时，重新创建Reddit面板
        this.createRedditPanel();
      }
    });
  }

  isRedditSubmitPage() {
    return (
      window.location.href.includes("reddit.com") &&
      (window.location.href.includes("/submit/") || window.location.href.includes("/submit?"))
    );
  }

  // 检测并提取版主建议
  extractModeratorSuggestion() {
    console.log("🔍 检测版主建议...");
    
    // 查找版主建议的容器
    const moderatorContainer = document.querySelector('.p-md.flex.flex-col.gap-xs');
    if (!moderatorContainer) {
      console.log("❌ 未找到版主建议容器");
      return null;
    }
    
    // 提取社区名称
    const communityHeader = moderatorContainer.querySelector('h2.font-semibold.text-neutral-content-weak.uppercase.text-12.my-2xs');
    let communityName = '';
    if (communityHeader) {
      const headerText = communityHeader.textContent.trim();
      const match = headerText.match(/r\/([\w]+)/);
      if (match) {
        communityName = match[1];
      }
    }
    
    // 提取建议内容
    const suggestionContent = moderatorContainer.querySelector('.flex.m-0.whitespace-pre-wrap');
    const suggestion = suggestionContent ? suggestionContent.textContent.trim() : '';
    
    if (communityName && suggestion) {
      console.log(`✅ 找到版主建议 - 社区: r/${communityName}`);
      return {
        community: communityName,
        suggestion: suggestion
      };
    }
    
    console.log("❌ 未找到完整的版主建议信息");
    return null;
  }

  extractSubredditRules() {
    console.log("📋 检测板块规则...");
    
    // 查找规则容器
    const rulesContainer = document.querySelector('.px-md.text-neutral-content-weak');
    if (!rulesContainer) {
      console.log("❌ 未找到规则容器");
      return null;
    }
    
    // 提取社区名称
    const titleElement = rulesContainer.querySelector('h2.uppercase.text-12.font-semibold .i18n-translatable-text');
    let communityName = '';
    if (titleElement) {
      const titleText = titleElement.textContent.trim();
      const match = titleText.match(/r\/(\w+)\s*规则/);
      if (match) {
        communityName = match[1];
      }
    }
    
    // 提取规则列表
    const rules = [];
    const ruleItems = rulesContainer.querySelectorAll('li[role="presentation"]');
    
    ruleItems.forEach((item, index) => {
      // 提取规则编号
      const numberElement = item.querySelector('.text-neutral-content-weak.text-14.font-normal');
      const ruleNumber = numberElement ? numberElement.textContent.trim() : (index + 1).toString();
      
      // 提取规则标题
      const titleElement = item.querySelector('h2.i18n-translatable-text');
      const ruleTitle = titleElement ? titleElement.textContent.trim() : '';
      
      // 提取规则详细内容
      let ruleContent = '';
      const detailsElement = item.closest('details');
      
      if (detailsElement) {
        // 查找规则内容容器，支持多种可能的结构
        let contentDiv = detailsElement.querySelector('.i18n-translatable-text.ml-xl.mb-2xs');
        
        // 如果没找到，尝试查找其他可能的内容容器
        if (!contentDiv) {
          contentDiv = detailsElement.querySelector('[faceplate-auto-height-animator-content] .i18n-translatable-text.ml-xl.mb-2xs');
        }
        
        // 如果还没找到，尝试查找包含md类的div
        if (!contentDiv) {
          contentDiv = detailsElement.querySelector('.md.px-md');
        }
        
        if (contentDiv) {
          // 提取文本内容，保留基本格式
          let textContent = '';
          
          // 处理列表项
          const listItems = contentDiv.querySelectorAll('li');
          if (listItems.length > 0) {
            const listTexts = Array.from(listItems).map(li => {
              const text = li.textContent.trim();
              return text ? `• ${text}` : '';
            }).filter(text => text);
            textContent = listTexts.join('\n');
          } else {
            // 如果没有列表，直接提取文本内容
            textContent = contentDiv.textContent || contentDiv.innerText || '';
          }
          
          // 查找链接
          const links = contentDiv.querySelectorAll('a[href]');
          if (links.length > 0) {
            const linkTexts = Array.from(links).map(link => {
              const linkText = link.textContent.trim();
              const href = link.getAttribute('href');
              return linkText && href ? `${linkText}: ${href}` : '';
            }).filter(text => text);
            
            if (linkTexts.length > 0) {
              textContent += (textContent ? '\n\n' : '') + linkTexts.join('\n');
            }
          }
          
          ruleContent = textContent.trim();
        }
      }
      
      if (ruleTitle) {
        rules.push({
          number: ruleNumber,
          title: ruleTitle,
          content: ruleContent
        });
      }
    });
    
    if (communityName && rules.length > 0) {
      console.log(`✅ 找到板块规则 - 社区: r/${communityName}, 规则数量: ${rules.length}`);
      return {
        community: communityName,
        rules: rules
      };
    }
    
    console.log("❌ 未找到完整的板块规则信息");
    return null;
  }

  createPanel() {
    if (document.querySelector(".xhs-extractor-panel")) return;

    this.panel = document.createElement("div");
    this.panel.className = "xhs-extractor-panel";
    this.panel.innerHTML = `
      <div class="xhs-extractor-header">
        <h3 class="xhs-extractor-title">小红书笔记搬运助手</h3>
        <button class="xhs-extractor-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="xhs-extractor-content">
        <button class="xhs-extractor-button" id="extract-btn">
          <span class="btn-text">提取笔记内容</span>
        </button>
      </div>
      <div class="xhs-extractor-result" style="display: none;">
        <div class="xhs-extractor-info">
          <div class="xhs-extractor-info-item">
            <span class="xhs-extractor-info-label">标题:</span>
            <span class="xhs-extractor-info-value" id="result-title">-</span>
          </div>
          <div class="xhs-extractor-info-item">
            <span class="xhs-extractor-info-label">作者:</span>
            <span class="xhs-extractor-info-value" id="result-author">-</span>
          </div>
          <div class="xhs-extractor-info-item">
            <span class="xhs-extractor-info-label">图片:</span>
            <span class="xhs-extractor-info-value" id="result-images">-</span>
          </div>
          <div class="xhs-extractor-info-item">
            <span class="xhs-extractor-info-label">字数:</span>
            <span class="xhs-extractor-info-value" id="result-words">-</span>
          </div>
        </div>
        <button class="xhs-extractor-download" id="download-btn">下载数据</button>
      </div>
    `;

    document.body.appendChild(this.panel);
    this.setupPanelEvents();
  }

  setupPanelEvents() {
    const extractBtn = this.panel.querySelector("#extract-btn");
    const downloadBtn = this.panel.querySelector("#download-btn");
    const header = this.panel.querySelector(".xhs-extractor-header");

    extractBtn.addEventListener("click", () => this.extractNoteContent());
    downloadBtn.addEventListener("click", () =>
      this.downloadData(this.extractedData)
    );

    header.addEventListener("mousedown", (e) => this.handleDrag(e));
  }

  async createRedditPanel() {
    console.log("🔧 开始创建Reddit面板...");

    // 移除已存在的面板
    const existingPanel = document.querySelector(".xhs-extractor-panel");
    if (existingPanel) {
      console.log("🗑️ 移除已存在的面板");
      existingPanel.remove();
    }

    // 从存储中获取上次提取的数据
    const lastExtractedData = await this.getStoredData();
    console.log("📊 获取到的数据:", lastExtractedData);

    this.panel = document.createElement("div");
    this.panel.className = "xhs-extractor-panel";

    // 检测版主建议
    const moderatorSuggestion = this.extractModeratorSuggestion();
    
    // 检测板块规则
    const subredditRules = this.extractSubredditRules();
    
    if (lastExtractedData) {
      // 显示上次提取的内容
      this.panel.innerHTML = `
        <div class="xhs-extractor-header">
          <h3 class="xhs-extractor-title">小红书笔记内容</h3>
          <div class="xhs-extractor-header-buttons">
            <button class="xhs-extractor-settings" id="xhs-settings-btn">⚙️</button>
            <button class="xhs-extractor-minimize" id="xhs-minimize-btn">−</button>
            <button class="xhs-extractor-close" id="xhs-close-btn">×</button>
          </div>
        </div>
        ${moderatorSuggestion ? `
        <div class="xhs-extractor-moderator-suggestion">
          <div class="xhs-extractor-moderator-header" data-toggle="moderator">
            <span class="xhs-extractor-moderator-icon">👮‍♂️</span>
            <span class="xhs-extractor-moderator-title">r/${moderatorSuggestion.community} 版主建议</span>
            <span class="xhs-extractor-collapse-btn">▶</span>
          </div>
          <div class="xhs-extractor-moderator-content collapsed">
            ${moderatorSuggestion.suggestion}
          </div>
        </div>` : ''}
        ${subredditRules ? `
        <div class="xhs-extractor-subreddit-rules">
          <div class="xhs-extractor-rules-header" data-toggle="rules">
            <span class="xhs-extractor-rules-icon">📋</span>
            <span class="xhs-extractor-rules-title">r/${subredditRules.community} 板块规则</span>
            <span class="xhs-extractor-collapse-btn">▶</span>
          </div>
          <div class="xhs-extractor-rules-content collapsed">
            ${subredditRules.rules.map(rule => `
              <div class="xhs-extractor-rule-item">
                <div class="xhs-extractor-rule-header">
                  <span class="xhs-extractor-rule-number">${rule.number}</span>
                  <span class="xhs-extractor-rule-title">${rule.title}</span>
                </div>
                ${rule.content ? `<div class="xhs-extractor-rule-content">${rule.content}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>` : ''}
        <div class="xhs-extractor-result">
          <div class="xhs-extractor-info">
            <div class="xhs-extractor-info-item">
              <span class="xhs-extractor-info-label">标题:</span>
              <span class="xhs-extractor-info-value">${
                lastExtractedData.title
              }</span>
            </div>
            <div class="xhs-extractor-info-item">
              <span class="xhs-extractor-info-label">作者:</span>
              <span class="xhs-extractor-info-value">${
                lastExtractedData.author || "-"
              }</span>
            </div>
            <div class="xhs-extractor-info-item">
              <span class="xhs-extractor-info-label">内容:</span>
              <div class="xhs-extractor-content-preview">${this.truncateText(
                lastExtractedData.content,
                200
              )}</div>
            </div>
            <div class="xhs-extractor-info-item">
              <span class="xhs-extractor-info-label">图片:</span>
              <span class="xhs-extractor-info-value">${
                lastExtractedData.stats.imageCount
              } 张</span>
            </div>
          </div>
          <button class="xhs-extractor-download" id="reddit-download-btn" style="text-align: center; display: flex; align-items: center; justify-content: center;">使用此内容</button>
        </div>
      `;
    } else {
      // 显示提示语
      this.panel.innerHTML = `
        <div class="xhs-extractor-header">
          <h3 class="xhs-extractor-title">小红书笔记搬运助手</h3>
          <div class="xhs-extractor-header-buttons">
            <button class="xhs-extractor-settings" id="xhs-settings-btn-2">⚙️</button>
            <button class="xhs-extractor-minimize" id="xhs-minimize-btn">−</button>
            <button class="xhs-extractor-close" id="xhs-close-btn-2">×</button>
          </div>
        </div>
        ${moderatorSuggestion ? `
        <div class="xhs-extractor-moderator-suggestion">
          <div class="xhs-extractor-moderator-header" data-toggle="moderator">
            <span class="xhs-extractor-moderator-icon">👮‍♂️</span>
            <span class="xhs-extractor-moderator-title">r/${moderatorSuggestion.community} 版主建议</span>
            <span class="xhs-extractor-collapse-btn">▶</span>
          </div>
          <div class="xhs-extractor-moderator-content collapsed">
            ${moderatorSuggestion.suggestion}
          </div>
        </div>` : ''}
        <div class="xhs-extractor-content">
          <div class="xhs-extractor-tip">
            <p>请先到小红书复制一份笔记</p>
            <p>然后回到这里使用提取的内容</p>
          </div>
        </div>
      `;
    }

    document.body.appendChild(this.panel);
    this.setupRedditPanelEvents(lastExtractedData);
  }

  setupRedditPanelEvents(data) {
    const header = this.panel.querySelector(".xhs-extractor-header");
    const downloadBtn = this.panel.querySelector("#reddit-download-btn");
    const minimizeBtn = this.panel.querySelector("#xhs-minimize-btn");
    const closeBtn = this.panel.querySelector("#xhs-close-btn") || this.panel.querySelector("#xhs-close-btn-2");
    const settingsBtn = this.panel.querySelector("#xhs-settings-btn") || this.panel.querySelector("#xhs-settings-btn-2");
    const moderatorHeader = this.panel.querySelector('[data-toggle="moderator"]');
    const rulesHeader = this.panel.querySelector('[data-toggle="rules"]');
    
    header.addEventListener("mousedown", (e) => this.handleDrag(e));

    // 隐藏按钮事件
    if (minimizeBtn) {
      minimizeBtn.addEventListener("click", () => {
        this.minimizePanel();
      });
    }
    
    // 关闭按钮事件
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this.panel.remove();
      });
    }
    
    // 设置按钮事件
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        this.showSettingsModal();
      });
    }
    
    // 版主建议折叠事件
    if (moderatorHeader) {
      moderatorHeader.addEventListener("click", () => {
        const content = moderatorHeader.parentElement.querySelector('.xhs-extractor-moderator-content');
        const collapseBtn = moderatorHeader.querySelector('.xhs-extractor-collapse-btn');
        content.classList.toggle('collapsed');
        collapseBtn.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
      });
    }
    
    // 板块规则折叠事件
    if (rulesHeader) {
      rulesHeader.addEventListener("click", () => {
        const content = rulesHeader.parentElement.querySelector('.xhs-extractor-rules-content');
        const collapseBtn = rulesHeader.querySelector('.xhs-extractor-collapse-btn');
        content.classList.toggle('collapsed');
        collapseBtn.textContent = content.classList.contains('collapsed') ? '▶' : '▼';
      });
    }

    if (downloadBtn && data) {
      downloadBtn.addEventListener("click", async () => {
        console.log("📋 用户点击使用此内容按钮");
        
        // 获取最新的存储数据
        const latestData = await this.getStoredData();
        const dataToUse = latestData || data;
        
        console.log("📊 使用的数据:", dataToUse);
        console.log("🔄 数据来源:", latestData ? "最新存储数据" : "面板创建时数据");
        
        // 先粘贴文本内容
        await this.pasteContentToReddit(dataToUse);
        
        // 然后处理图片
        if (dataToUse.images && dataToUse.images.length > 0) {
          console.log(`🖼️ 开始处理 ${dataToUse.images.length} 张图片`);
          await this.prepareImagesForPasting(dataToUse);
        } else {
          console.log("⚠️ 没有图片数据可粘贴");
        }
      });
    }
  }

  fillRedditForm(data) {
    console.log("fillRedditForm", data);
    try {
      let titleFilled = false;
      let contentFilled = false;

      console.log("开始填充Reddit表单，数据:", data);
      console.log("当前页面URL:", window.location.href);

      // 检测页面类型
      const isImageSubmit = window.location.href.includes("type=IMAGE");
      const isTextSubmit =
        window.location.href.includes("type=TEXT") ||
        (window.location.href.includes("/submit") && !isImageSubmit);
      console.log(
        "页面类型 - 图片提交:",
        isImageSubmit,
        "文本提交:",
        isTextSubmit
      );

      // 等待页面元素加载
      setTimeout(() => {
        console.log("查找标题/描述输入框...");

        // 首先尝试直接查找
        let titleTextarea = document.getElementById("innerTextArea");
        console.log(`直接查找 innerTextArea:`, titleTextarea);

        // 如果没找到，尝试在Shadow DOM中查找
        if (!titleTextarea) {
          console.log("直接查找失败，尝试在Shadow DOM中查找...");

          // 查找所有可能包含Shadow DOM的元素
          const shadowHosts = document.querySelectorAll(
            'label, div[class*="label"], div[class*="input"], div[class*="form"], div[class*="field"]'
          );
          console.log("找到可能的Shadow DOM宿主元素:", shadowHosts.length);

          // 也尝试查找所有有shadowRoot的元素
          const allElements = document.querySelectorAll("*");
          const elementsWithShadow = Array.from(allElements).filter(
            (el) => el.shadowRoot
          );
          console.log("找到所有Shadow DOM元素:", elementsWithShadow.length);

          // 首先检查特定的Shadow DOM宿主元素
          for (const host of shadowHosts) {
            if (host.shadowRoot) {
              console.log("找到Shadow DOM:", host, host.shadowRoot);

              // 在Shadow DOM中查找innerTextArea
              titleTextarea = host.shadowRoot.getElementById("innerTextArea");
              if (titleTextarea) {
                console.log("在Shadow DOM中找到innerTextArea:", titleTextarea);
                break;
              }

              // 也尝试querySelector
              titleTextarea = host.shadowRoot.querySelector(
                'textarea[id="innerTextArea"]'
              );
              if (titleTextarea) {
                console.log(
                  "通过querySelector在Shadow DOM中找到innerTextArea:",
                  titleTextarea
                );
                break;
              }
            }
          }

          // 如果还没找到，检查所有Shadow DOM元素
          if (!titleTextarea) {
            console.log("在特定宿主中未找到，检查所有Shadow DOM元素...");
            for (const host of elementsWithShadow) {
              console.log("检查Shadow DOM:", host, host.shadowRoot);

              titleTextarea = host.shadowRoot.getElementById("innerTextArea");
              if (titleTextarea) {
                console.log(
                  "在所有Shadow DOM中找到innerTextArea:",
                  titleTextarea
                );
                break;
              }

              titleTextarea = host.shadowRoot.querySelector(
                'textarea[id="innerTextArea"]'
              );
              if (titleTextarea) {
                console.log(
                  "通过querySelector在所有Shadow DOM中找到innerTextArea:",
                  titleTextarea
                );
                break;
              }
            }
          }
        }

        console.log(`最终找到的 innerTextArea:`, titleTextarea);
        if (titleTextarea) {
          console.log("找到输入框:", "innerTextArea", titleTextarea);

          // 总是先填充标题到标题框
          const titleToFill = data.title;
          if (titleToFill) {
            // 根据元素类型选择填充方法
            if (
              titleTextarea.tagName.toLowerCase() === "div" &&
              titleTextarea.contentEditable === "true"
            ) {
              // contenteditable div
              titleTextarea.focus();
              titleTextarea.textContent = "";
              setTimeout(() => {
                titleTextarea.textContent = titleToFill;

                // 触发contenteditable事件
                titleTextarea.dispatchEvent(
                  new Event("input", { bubbles: true })
                );
                titleTextarea.dispatchEvent(
                  new Event("blur", { bubbles: true })
                );
              }, 100);
            } else {
              // textarea或input
              titleTextarea.focus();
              titleTextarea.value = "";
              setTimeout(() => {
                titleTextarea.value = titleToFill;

                // 触发表单事件
                titleTextarea.dispatchEvent(
                  new Event("input", { bubbles: true })
                );
                titleTextarea.dispatchEvent(
                  new Event("change", { bubbles: true })
                );
                titleTextarea.dispatchEvent(
                  new Event("keyup", { bubbles: true })
                );
                titleTextarea.dispatchEvent(
                  new Event("blur", { bubbles: true })
                );
              }, 100);
            }

            console.log("标题填充完成");
            console.log("填充的内容类型: 标题");
          }

          titleFilled = true;
          // 对于图片页面，标题框就是内容框，所以内容也填充了
          contentFilled = isImageSubmit;
        }

        if (!titleFilled) {
          console.log("未找到标题输入框，尝试查找所有textarea元素:");
          const allTextareas = document.querySelectorAll("textarea");
          allTextareas.forEach((textarea, index) => {
            console.log(`Textarea ${index}:`, textarea, {
              name: textarea.name,
              id: textarea.id,
              className: textarea.className,
              placeholder: textarea.placeholder,
            });
          });
        }

        // 如果不是图片页面，需要单独填充内容到内容输入框
        if (!isImageSubmit && data.content) {
          console.log("开始查找Reddit内容输入框...");

          // 专门针对Reddit富文本编辑器的选择器
          const contentSelectors = [
            // 直接查找Reddit的内容编辑器
            'shreddit-composer[name="optionalBody"] div[slot="rte"]',
            'shreddit-composer div[slot="rte"][contenteditable="true"]',
            'div[slot="rte"][contenteditable="true"]',
            'div[data-lexical-editor="true"][contenteditable="true"]',
            'div[aria-label*="Body text"][contenteditable="true"]',
            'div[role="textbox"][contenteditable="true"]',
            // 通用选择器
            'div[contenteditable="true"]',
          ];

          let contentElement = null;

          // 首先尝试在Shadow DOM中查找
          console.log("尝试在Shadow DOM中查找内容编辑器...");
          const allElements = document.querySelectorAll("*");
          const elementsWithShadow = Array.from(allElements).filter(
            (el) => el.shadowRoot
          );

          for (const host of elementsWithShadow) {
            if (host.shadowRoot) {
              console.log("检查Shadow DOM:", host.tagName, host.shadowRoot);

              // 在Shadow DOM中查找内容编辑器
              for (const selector of contentSelectors) {
                const element = host.shadowRoot.querySelector(selector);
                if (element && element.contentEditable === "true") {
                  console.log(
                    "在Shadow DOM中找到内容编辑器:",
                    selector,
                    element
                  );
                  contentElement = element;
                  break;
                }
              }
              if (contentElement) break;
            }
          }

          // 如果Shadow DOM中没找到，尝试直接查找
          if (!contentElement) {
            console.log("Shadow DOM中未找到，尝试直接查找...");
            for (const selector of contentSelectors) {
              const element = document.querySelector(selector);
              console.log(`选择器 ${selector}:`, element);
              if (element && element.contentEditable === "true") {
                console.log("找到内容输入框:", selector, element);
                contentElement = element;
                break;
              }
            }
          }

          if (contentElement && data.content) {
            console.log("开始填充内容到Reddit编辑器...");

            // 聚焦元素
            contentElement.focus();

            // 等待一下确保焦点设置，然后填充内容
            setTimeout(() => {
              this.fillContentToElement(contentElement, data.content);
              contentFilled = true;
            }, 100);
          }

          if (!contentFilled) {
            console.log("未找到内容输入框，尝试查找所有contenteditable元素:");
            const allContentEditable = document.querySelectorAll(
              '[contenteditable="true"]'
            );
            allContentEditable.forEach((element, index) => {
              console.log(`ContentEditable ${index}:`, element, {
                tagName: element.tagName,
                name: element.name,
                id: element.id,
                className: element.className,
                ariaLabel: element.getAttribute("aria-label"),
              });
            });
          }
        }

        // 显示填充结果
        if (titleFilled && contentFilled) {
          this.showNotification("内容已成功填入Reddit表单", "success");
        } else if (titleFilled) {
          this.showNotification("内容已填入，请检查是否正确", "success");
        } else {
          this.showNotification("填充失败，请手动复制内容", "error");
          console.log("未找到任何可填充的表单元素");
        }
      }, 500);
    } catch (error) {
      console.error("填充表单失败:", error);
      this.showNotification("填充表单失败，请手动复制内容", "error");
    }
  }

  truncateText(text, maxLength) {
    if (!text) return "-";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }

  async getStoredData() {
    try {
      return new Promise((resolve) => {
        chrome.storage.local.get(["lastExtractedNote"], (result) => {
          resolve(result.lastExtractedNote || null);
        });
      });
    } catch (error) {
      console.error("获取存储数据失败:", error);
      return null;
    }
  }

  async saveDataToStorage(data) {
    try {
      chrome.storage.local.set({ lastExtractedNote: data });
    } catch (error) {
      console.error("保存数据失败:", error);
    }
  }

  async extractNoteContent() {
    if (this.isExtracting) return;

    this.isExtracting = true;
    const extractBtn = this.panel.querySelector("#extract-btn");
    const originalText = extractBtn.textContent;

    extractBtn.textContent = "提取中...";
    extractBtn.disabled = true;

    try {
      await this.waitForContent();

      const title = this.getNoteTitle();
      const content = this.getNoteContent();
      const images = this.getNoteImages();
      const author = this.getAuthorInfo();

      this.extractedData = {
        title: title || "无标题",
        author: author,
        content: content,
        images: images,
        url: window.location.href,
        extractedAt: new Date().toISOString(),
        platform: "xiaohongshu",
        version: "1.0.0",
        stats: {
          wordCount: content ? content.length : 0,
          imageCount: images.length,
        },
      };

      // 显示过滤信息
      if (images.length === 0) {
        this.showNotification(
          "未检测到符合标准格式的笔记图片（sns-webpic-qc.xhscdn.com/.../notes_pre_post/...）。请在笔记图片区域滑动/预览后重试。",
          "warning"
        );
      }

      this.displayResults(this.extractedData);
      // 保存提取的数据到存储中，供Reddit页面使用
      await this.saveDataToStorage(this.extractedData);
      this.showNotification("笔记提取成功！");
    } catch (error) {
      console.error("提取失败:", error);
      this.showNotification("提取失败，请刷新页面重试", "error");
    } finally {
      this.isExtracting = false;
      extractBtn.textContent = originalText;
      extractBtn.disabled = false;
    }
  }

  getNoteTitle() {
    try {
      const selectors = [
        "#detail-title",
        'h1[data-testid="note-title"]',
        ".note-title",
        ".title",
        '[class*="title"]',
        "h1",
        ".content-title",
        ".note-content h1",
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent && element.textContent.trim()) {
          return element.textContent.trim();
        }
      }

      const headings = document.querySelectorAll("h1, h2, h3");
      for (const heading of headings) {
        if (heading.textContent && heading.textContent.trim().length > 5) {
          return heading.textContent.trim();
        }
      }

      return document.title
        ? document.title.replace(" - 小红书", "").trim()
        : "无标题";
    } catch (error) {
      console.error("getNoteTitle出错:", error);
      return "无标题";
    }
  }

  getNoteContent() {
    try {
      const selectors = [
        ".note-text",
        ".note-content .content",
        ".note-content",
        ".content",
        '[data-testid="note-content"]',
        ".detail-content",
        ".rich-content",
        ".note-detail-content",
        ".content-container",
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent && element.textContent.trim()) {
          return element.textContent.trim();
        }
      }

      const paragraphs = document.querySelectorAll("p, .paragraph");
      let content = "";
      for (const p of paragraphs) {
        if (p.textContent && p.textContent.trim()) {
          content += p.textContent.trim() + "\n\n";
        }
      }

      return content.trim();
    } catch (error) {
      console.error("getNoteContent出错:", error);
      return "";
    }
  }

  cleanImageUrl(url) {
    if (!url) return "";
    return url.trim();
  }

  getNoteImages() {
    // 从笔记正文中的实际图片元素提取图片
    const images = [];
    const seenUrls = new Set();

    // 小红书笔记图片的选择器 - 只选择笔记详情页的大图
    const imageSelectors = ["img.note-slider-img"];

    let imageIndex = 1;

    // 查找所有可能的图片元素
    imageSelectors.forEach((selector) => {
      const imgElements = document.querySelectorAll(selector);
      imgElements.forEach((img) => {
        let src =
          img.src || img.getAttribute("data-src") || img.getAttribute("srcset");
        if (src) {
          // 处理srcset
          if (src.includes(",")) {
            src = src.split(",")[0].split(" ")[0];
          }

          // 保留所有小红书CDN的图片
          if (
            src.includes("sns-webpic-qc.xhscdn.com") ||
            src.includes("xhscdn.com")
          ) {
            const cleanUrl = this.cleanImageUrl(src);
            // 放宽条件：提取所有小红书CDN的图片，不限制路径和格式
            if (cleanUrl && !seenUrls.has(cleanUrl)) {
              seenUrls.add(cleanUrl);
              images.push({
                url: cleanUrl,
                alt: img.alt || `小红书图片${imageIndex++}`,
                width: img.naturalWidth || 0,
                height: img.naturalHeight || 0,
              });
            }
          }
        }
      });
    });

    return images;
  }

  getAuthorInfo() {
    const selectors = [
      ".author-name",
      ".user-name",
      '[data-testid="author-name"]',
      ".note-author",
      ".username",
      ".user-info .name",
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    return "未知作者";
  }

  displayResults(data) {
    const resultDiv = this.panel.querySelector(".xhs-extractor-result");
    const titleEl = this.panel.querySelector("#result-title");
    const authorEl = this.panel.querySelector("#result-author");
    const imagesEl = this.panel.querySelector("#result-images");
    const wordsEl = this.panel.querySelector("#result-words");

    resultDiv.style.display = "block";
    titleEl.textContent = data.title;
    authorEl.textContent = data.author;
    imagesEl.textContent = `${data.images.length}张`;
    wordsEl.textContent = `${data.stats.wordCount}字`;
  }

  async downloadData(data) {
    console.log("downloadData");
    if (!data) {
      this.showNotification("请先提取笔记内容", "error");
      return;
    }

    try {
      // 创建JSON格式数据
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `小红书笔记_${this.sanitizeFilename(
        data.title || "未命名"
      )}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      // 保存到chrome.storage
      if (chrome.storage) {
        const key = `xhs_note_${Date.now()}`;
        await chrome.storage.local.set({ [key]: data });
      }

      this.showNotification("数据导出成功！已保存JSON格式");
    } catch (error) {
      console.error("数据保存失败:", error);
      this.showNotification("数据保存失败，请重试", "error");
    }
  }

  convertToMarkdown(data) {
    let md = `# ${data.title}\n\n`;
    md += `**作者:** ${data.author}\n\n`;
    md += `**链接:** ${data.url}\n\n`;
    md += `**提取时间:** ${new Date(data.extractedAt).toLocaleString()}\n\n`;

    if (data.images.length > 0) {
      md += `## 图片 (${data.images.length}张)\n\n`;
      data.images.forEach((img, index) => {
        md += `![图片${index + 1}](${img})\n\n`;
      });
    }

    md += `## 正文内容\n\n${data.content}\n`;

    return md;
  }

  convertToHTML(data) {
    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1 { color: #ff2442; }
        .meta { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .images img { max-width: 100%; height: auto; margin: 10px 0; border-radius: 8px; }
        .content { white-space: pre-wrap; }
    </style>
</head>
<body>
    <h1>${data.title}</h1>
    <div class="meta">
        <p><strong>作者:</strong> ${data.author}</p>
        <p><strong>链接:</strong> <a href="${data.url}">${data.url}</a></p>
        <p><strong>提取时间:</strong> ${new Date(
          data.extractedAt
        ).toLocaleString()}</p>
    </div>
    
    ${
      data.images.length > 0
        ? `
    <h2>图片 (${data.images.length}张)</h2>
    <div class="images">
        ${data.images
          .map((img) => `<img src="${img}" alt="笔记图片">`)
          .join("")}
    </div>
    `
        : ""
    }
    
    <h2>正文内容</h2>
    <div class="content">${data.content}</div>
</body>
</html>`;

    return html;
  }

  sanitizeFilename(filename) {
    return filename.replace(/[<>:'"/\\|?*]/g, "_").substring(0, 50);
  }

  async waitForContent() {
    return new Promise((resolve) => {
      // 确保在安全的环境中执行
      if (typeof document === "undefined" || !document.body) {
        console.log("document或document.body不存在，直接resolve");
        resolve();
        return;
      }

      let attempts = 0;
      const maxAttempts = 15;

      const checkContent = () => {
        try {
          const title = this.getNoteTitle();
          const content = this.getNoteContent();
          const images = this.getNoteImages();

          if ((title && content) || attempts >= maxAttempts) {
            resolve();
          } else {
            attempts++;
            setTimeout(checkContent, 800);
          }
        } catch (error) {
          console.error("checkContent出错:", error);
          resolve();
        }
      };

      const observer = new MutationObserver(() => {
        try {
          const title = this.getNoteTitle();
          const content = this.getNoteContent();
          if (title && content) {
            observer.disconnect();
            resolve();
          }
        } catch (error) {
          console.error("MutationObserver回调出错:", error);
          observer.disconnect();
          resolve();
        }
      });

      // 确保document.body存在
      if (document.body) {
        try {
          observer.observe(document.body, {
            childList: true,
            subtree: true,
          });
        } catch (error) {
          console.error("MutationObserver.observe出错:", error);
        }
      } else {
        console.log("document.body不存在，跳过MutationObserver");
      }

      checkContent();

      setTimeout(() => {
        try {
          observer.disconnect();
        } catch (error) {
          console.error("observer.disconnect出错:", error);
        }
        resolve();
      }, 15000);
    });
  }

  handleDrag(e) {
    const panel = this.panel;
    if (!panel) return;

    const rect = panel.getBoundingClientRect();
    const isDragging =
      e.target.closest(".xhs-extractor-header") && e.clientY <= rect.top + 60;

    if (isDragging) {
      panel.style.cursor = "grabbing";
      panel.classList.add("dragging");

      let startX = e.clientX - rect.left;
      let startY = e.clientY - rect.top;

      const handleMouseMove = (e) => {
        const newX = e.clientX - startX;
        const newY = e.clientY - startY;

        panel.style.left = `${Math.max(
          0,
          Math.min(window.innerWidth - rect.width, newX)
        )}px`;
        panel.style.top = `${Math.max(
          0,
          Math.min(window.innerHeight - rect.height, newY)
        )}px`;
        panel.style.right = "auto";
      };

      const handleMouseUp = () => {
        panel.style.cursor = "";
        panel.classList.remove("dragging");
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }
  }

  // 延迟函数
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 专门用于粘贴内容到Reddit的方法
  async pasteContentToReddit(data) {
    console.log("🚀 开始粘贴内容到Reddit...");
    console.log("📊 要粘贴的数据:", data);
    console.log("🔍 当前页面URL:", window.location.href);

    if (!data.content) {
      console.log("❌ 没有内容可粘贴");
      this.showNotification("没有内容可粘贴", "error");
      return;
    }

    try {
      // 检测页面类型
      const isImageSubmit = window.location.href.includes("type=IMAGE");
      const isTextSubmit =
        window.location.href.includes("type=TEXT") ||
        (window.location.href.includes("/submit") && !isImageSubmit);

      console.log("📋 页面类型检测:", { isImageSubmit, isTextSubmit });

      // 等待页面元素加载
      await this.sleep(500);

      let contentElement = null;
      let titleElement = null;

      // 1. 查找标题输入框
      console.log("🔍 开始查找标题输入框...");
      titleElement = this.findRedditTitleInput();

      if (titleElement) {
        console.log("✅ 找到标题输入框:", titleElement);
        this.fillTitleToElement(titleElement, data.title);
      } else {
        console.log("❌ 未找到标题输入框");
      }

      // 2. 查找内容输入框
      console.log("🔍 开始查找内容输入框...");
      contentElement = this.findRedditContentInput();

      if (contentElement) {
        console.log("✅ 找到内容输入框:", contentElement);
        await this.fillContentToElement(contentElement, data.content);
        this.showNotification("内容已成功粘贴到Reddit！", "success");
      } else {
        console.log("❌ 未找到内容输入框");
        this.showNotification("未找到内容输入框，请手动复制", "error");
      }
    } catch (error) {
      console.error("❌ 粘贴内容失败:", error);
      this.showNotification("粘贴内容失败，请手动复制", "error");
    }
  }

  // 查找Reddit标题输入框
  findRedditTitleInput() {
    console.log("🔍 查找Reddit标题输入框...");

    // 首先尝试直接查找
    let titleElement = document.getElementById("innerTextArea");
    console.log("直接查找 innerTextArea:", titleElement);

    // 如果没找到，尝试在Shadow DOM中查找
    if (!titleElement) {
      console.log("直接查找失败，尝试在Shadow DOM中查找...");

      const allElements = document.querySelectorAll("*");
      const elementsWithShadow = Array.from(allElements).filter(
        (el) => el.shadowRoot
      );
      console.log("找到Shadow DOM元素数量:", elementsWithShadow.length);

      for (const host of elementsWithShadow) {
        if (host.shadowRoot) {
          console.log("检查Shadow DOM:", host.tagName);

          titleElement = host.shadowRoot.getElementById("innerTextArea");
          if (titleElement) {
            console.log("在Shadow DOM中找到innerTextArea:", titleElement);
            break;
          }
        }
      }
    }

    return titleElement;
  }

  // 查找Reddit内容输入框
  findRedditContentInput() {
    console.log("🔍 查找Reddit内容输入框...");

    const contentSelectors = [
      'shreddit-composer[name="optionalBody"] div[slot="rte"]',
      'shreddit-composer div[slot="rte"][contenteditable="true"]',
      'div[slot="rte"][contenteditable="true"]',
      'div[data-lexical-editor="true"][contenteditable="true"]',
      'div[aria-label*="Body text"][contenteditable="true"]',
      'div[role="textbox"][contenteditable="true"]',
      'div[contenteditable="true"]',
    ];

    let contentElement = null;

    // 首先尝试在Shadow DOM中查找
    console.log("尝试在Shadow DOM中查找内容编辑器...");
    const allElements = document.querySelectorAll("*");
    const elementsWithShadow = Array.from(allElements).filter(
      (el) => el.shadowRoot
    );
    console.log("找到Shadow DOM元素数量:", elementsWithShadow.length);

    for (const host of elementsWithShadow) {
      if (host.shadowRoot) {
        console.log("检查Shadow DOM:", host.tagName);

        for (const selector of contentSelectors) {
          const element = host.shadowRoot.querySelector(selector);
          if (element && element.contentEditable === "true") {
            console.log("在Shadow DOM中找到内容编辑器:", selector, element);
            contentElement = element;
            break;
          }
        }
        if (contentElement) break;
      }
    }

    // 如果Shadow DOM中没找到，尝试直接查找
    if (!contentElement) {
      console.log("Shadow DOM中未找到，尝试直接查找...");
      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        console.log(`选择器 ${selector}:`, element);
        if (element && element.contentEditable === "true") {
          console.log("找到内容输入框:", selector, element);
          contentElement = element;
          break;
        }
      }
    }

    return contentElement;
  }

  // 填充标题到元素
  fillTitleToElement(titleElement, title) {
    console.log("📝 开始填充标题到元素:", titleElement, title);

    if (!title || !titleElement) {
      console.log("❌ 标题或元素为空");
      return;
    }

    try {
      if (
        titleElement.tagName.toLowerCase() === "div" &&
        titleElement.contentEditable === "true"
      ) {
        // contenteditable div
        console.log("使用contenteditable div方法填充标题");
        titleElement.focus();
        titleElement.textContent = "";
        setTimeout(() => {
          titleElement.textContent = title;
          titleElement.dispatchEvent(new Event("input", { bubbles: true }));
          titleElement.dispatchEvent(new Event("blur", { bubbles: true }));
        }, 100);
      } else {
        // textarea或input
        console.log("使用textarea/input方法填充标题");
        titleElement.focus();
        titleElement.value = "";
        setTimeout(() => {
          titleElement.value = title;
          titleElement.dispatchEvent(new Event("input", { bubbles: true }));
          titleElement.dispatchEvent(new Event("change", { bubbles: true }));
          titleElement.dispatchEvent(new Event("keyup", { bubbles: true }));
          titleElement.dispatchEvent(new Event("blur", { bubbles: true }));
        }, 100);
      }

      console.log("✅ 标题填充完成");
    } catch (error) {
      console.error("❌ 填充标题失败:", error);
    }
  }

  // 填充内容到Reddit富文本编辑器
  async fillContentToElement(contentElement, content) {
    console.log("开始填充内容到元素:", contentElement, content);

    // 先聚焦元素
    contentElement.focus();
    await this.sleep(100);

    // 对于Lexical编辑器，使用更精确的方法
    if (contentElement.getAttribute("data-lexical-editor") === "true") {
      console.log("检测到Lexical编辑器，使用专门的方法...");

      try {
        // 方法1: 清空现有内容并插入新内容
        contentElement.innerHTML = "";
        await this.sleep(50);

        // 创建正确的DOM结构
        const paragraph = document.createElement("p");
        paragraph.className = "first:mt-0 last:mb-0";
        paragraph.textContent = content;
        contentElement.appendChild(paragraph);

        console.log("使用Lexical DOM结构方法填充内容");
        await this.sleep(100);

        // 触发Lexical编辑器事件
        const inputEvent = new InputEvent("input", {
          bubbles: true,
          cancelable: true,
          inputType: "insertText",
          data: content,
        });
        contentElement.dispatchEvent(inputEvent);
      } catch (e) {
        console.log("Lexical方法失败，尝试通用方法:", e);

        // 方法2: 使用execCommand
        try {
          contentElement.focus();
          await this.sleep(50);
          document.execCommand("selectAll", false, null);
          document.execCommand("delete", false, null);
          await this.sleep(50);
          document.execCommand("insertText", false, content);
          console.log("使用execCommand填充内容成功");
        } catch (e2) {
          console.log("execCommand也失败，使用直接设置:", e2);
          contentElement.textContent = content;
        }
      }
    } else {
      // 对于普通contenteditable元素
      console.log("使用普通contenteditable方法...");

      try {
        // 先清空
        contentElement.innerHTML = "";
        await this.sleep(50);
        
        // 使用execCommand确保正确插入
        contentElement.focus();
        await this.sleep(50);
        document.execCommand("selectAll", false, null);
        document.execCommand("delete", false, null);
        await this.sleep(50);
        document.execCommand("insertText", false, content);

        console.log("使用execCommand填充内容成功");
      } catch (e) {
        console.log("execCommand失败，使用直接设置:", e);
        contentElement.textContent = content;
      }
    }

    // 等待一下再触发事件
    await this.sleep(100);

    // 触发多种事件确保Reddit识别
    const events = [
      new Event("focus", { bubbles: true }),
      new Event("input", { bubbles: true }),
      new Event("change", { bubbles: true }),
      new KeyboardEvent("keydown", { bubbles: true }),
      new KeyboardEvent("keyup", { bubbles: true }),
      new Event("blur", { bubbles: true }),
    ];

    for (const event of events) {
      contentElement.dispatchEvent(event);
      await this.sleep(10); // 每个事件之间稍微延迟
    }

    console.log(
      "内容填充完成，当前内容:",
      contentElement.textContent || contentElement.innerHTML
    );
  }

  // 从URL复制图片到剪贴板（使用你提供的方法）
  async copyImageFromURL(imageUrl) {
    try {
      console.log("🔄 开始从URL复制图片:", imageUrl);
      console.log("🔍 检查Chrome API可用性...");

      // 首先尝试使用Chrome扩展API通过background script下载
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        chrome.runtime.sendMessage
      ) {
        console.log("✅ Chrome API可用，使用background script下载");
        return new Promise((resolve) => {
          console.log("📤 发送下载请求到background script...");
          chrome.runtime.sendMessage(
            { action: "downloadImage", url: imageUrl },
            async (response) => {
              console.log("📥 收到background script响应:", response);
              if (response && response.success) {
                try {
                  console.log("🔄 开始转换base64为Blob...");
                  // 将base64转换为Blob
                  const byteCharacters = atob(response.data.split(",")[1]);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], {
                    type: response.contentType || "image/jpeg",
                  });

                  console.log(
                    "✅ 图片下载成功，大小:",
                    blob.size,
                    "bytes，类型:",
                    blob.type
                  );

                  // 如果图片是webp格式，需要转换为PNG
                  let finalBlob = blob;
                  if (blob.type === "image/webp") {
                    console.log("🔄 检测到WebP格式，转换为PNG...");
                    finalBlob = await this.convertToPng(blob);
                    console.log(
                      "✅ 转换完成，PNG大小:",
                      finalBlob.size,
                      "bytes"
                    );
                  }

                  console.log("🔄 创建ClipboardItem...");
                  // 创建 ClipboardItem
                  const item = new ClipboardItem({
                    [finalBlob.type]: finalBlob,
                  });

                  console.log("🔄 写入剪贴板...");
                  // 写入剪贴板
                  await navigator.clipboard.write([item]);
                  console.log("✅ 图片已复制到剪贴板");
                  resolve(true);
                } catch (clipboardError) {
                  console.error("❌ 剪贴板写入失败:", clipboardError);
                  resolve(false);
                }
              } else {
                console.error("❌ Background script下载失败:", response?.error);
                resolve(false);
              }
            }
          );
        });
      } else {
        console.log("⚠️ Chrome扩展API不可用，尝试直接fetch");

        // 如果Chrome API不可用，尝试直接fetch（可能会失败）
        const response = await fetch(imageUrl, {
          mode: "cors",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            Referer: "https://www.xiaohongshu.com/",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        console.log(
          "图片下载成功，大小:",
          blob.size,
          "bytes，类型:",
          blob.type,
          blob
        );

        // 如果图片是webp格式，需要转换为PNG
        let finalBlob = blob;
        if (blob.type === "image/webp") {
          console.log("检测到WebP格式，转换为PNG...");
          finalBlob = await this.convertToPng(blob);
          console.log("转换完成，PNG大小:", finalBlob.size, "bytes");
        }

        // 创建 ClipboardItem
        const item = new ClipboardItem({
          [finalBlob.type]: finalBlob,
        });

        // 写入剪贴板
        await navigator.clipboard.write([item]);
        console.log("图片已复制到剪贴板");

        return true;
      }
    } catch (err) {
      console.error("复制失败:", err);
      return false;
    }
  }

  // 备用方法：尝试通过文件输入上传图片
  async tryFileInputMethod(imageBlob, imageIndex) {
    try {
      console.log(`尝试文件输入方法处理第 ${imageIndex} 张图片`);

      // 查找文件输入元素
      const fileInput = document.querySelector('input[type="file"]');
      if (!fileInput) {
        console.log("未找到文件输入元素");
        return false;
      }

      console.log("找到文件输入元素:", fileInput);

      // 创建File对象
      const file = new File([imageBlob], `image_${imageIndex}.png`, {
        type: "image/png",
      });

      // 创建DataTransfer对象
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      // 设置文件到输入元素
      fileInput.files = dataTransfer.files;

      // 触发change事件
      const changeEvent = new Event("change", { bubbles: true });
      fileInput.dispatchEvent(changeEvent);

      // 触发input事件
      const inputEvent = new Event("input", { bubbles: true });
      fileInput.dispatchEvent(inputEvent);

      console.log(`第 ${imageIndex} 张图片通过文件输入方法处理完成`);
      return true;
    } catch (error) {
      console.error(`文件输入方法失败:`, error);
      return false;
    }
  }

  // 模拟粘贴操作
  async simulatePaste() {
    try {
      console.log("🔄 开始模拟粘贴操作...");
      console.log("🔍 当前页面URL:", window.location.href);
      console.log("🔍 当前页面标题:", document.title);

      // 等待确保剪贴板内容已设置
      console.log("⏳ 等待300ms确保剪贴板内容已设置...");
      await this.sleep(300);

      // 检查剪贴板内容
      let clipboardData = null;
      try {
        console.log("🔍 检查剪贴板内容...");
        const clipboardItems = await navigator.clipboard.read();
        console.log("📋 剪贴板项目数量:", clipboardItems.length);

        if (clipboardItems.length > 0) {
          // 获取第一个剪贴板项目的数据
          const item = clipboardItems[0];
          console.log(`📋 剪贴板项目类型:`, item.types);

          // 为每个类型创建DataTransfer
          clipboardData = new DataTransfer();

          for (const type of item.types) {
            try {
              const blob = await item.getType(type);
              console.log(`📋 类型 ${type} 大小:`, blob.size, "bytes");

              // 将blob添加到DataTransfer
              const file = new File([blob], `image.${type.split("/")[1]}`, {
                type,
              });
              clipboardData.items.add(file);
              console.log(`✅ 已添加 ${type} 到DataTransfer`);
            } catch (e) {
              console.log(`📋 类型 ${type} 读取失败:`, e.message);
            }
          }
        }
      } catch (error) {
        console.log("⚠️ 无法读取剪贴板内容:", error.message);
      }

      // 简化策略：直接聚焦页面并粘贴
      console.log("🎯 直接聚焦页面并粘贴...");

      // 确保页面获得焦点
      window.focus();
      document.body.focus();

      // 等待一下让页面获得焦点
      await this.sleep(100);

      // 创建带有实际数据的粘贴事件
      console.log("🔄 创建粘贴事件...");
      const pasteEvent = new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: clipboardData || new DataTransfer(),
      });

      // 创建键盘事件
      console.log("🔄 创建键盘事件...");
      const keyDownEvent = new KeyboardEvent("keydown", {
        key: "v",
        code: "KeyV",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });

      const keyUpEvent = new KeyboardEvent("keyup", {
        key: "v",
        code: "KeyV",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      });

      // 只在document上触发一次事件，避免重复粘贴
      console.log("🔄 在document上触发粘贴事件...");
      document.dispatchEvent(pasteEvent);
      
      console.log("🔄 在document上触发键盘事件...");
      document.dispatchEvent(keyDownEvent);
      document.dispatchEvent(keyUpEvent);

      console.log("✅ 已触发所有粘贴事件");

      // 等待一下看是否有反应
      console.log("⏳ 等待500ms看是否有反应...");
      await this.sleep(500);

      console.log("✅ 粘贴操作模拟完成");
    } catch (error) {
      console.error("❌ 模拟粘贴失败:", error);
    }
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['apiKey', 'model'], (result) => {
        resolve({
          apiKey: result.apiKey || '',
          model: result.model || 'gpt-3.5-turbo'
        });
      });
    });
  }

  async saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.local.set(settings, () => {
        resolve();
      });
    });
  }

  async showSettingsModal() {
    // 移除已存在的设置弹窗
    const existingModal = document.querySelector('.xhs-extractor-settings-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // 获取当前设置
    const settings = await this.getSettings();

    // 创建设置弹窗
    const modal = document.createElement('div');
    modal.className = 'xhs-extractor-settings-modal';
    modal.innerHTML = `
      <div class="xhs-extractor-settings-overlay"></div>
      <div class="xhs-extractor-settings-content">
        <div class="xhs-extractor-settings-header">
          <h3>插件设置</h3>
          <button class="xhs-extractor-settings-close" id="settings-close-btn">×</button>
        </div>
        <div class="xhs-extractor-settings-body">
          <div class="xhs-extractor-settings-item">
            <label for="api-key-input">API Key:</label>
            <input type="password" id="api-key-input" placeholder="请输入您的API Key" value="${settings.apiKey}">
          </div>
          <div class="xhs-extractor-settings-item">
            <label for="model-input">模型:</label>
            <select id="model-input">
              <option value="gpt-3.5-turbo" ${settings.model === 'gpt-3.5-turbo' ? 'selected' : ''}>GPT-3.5 Turbo</option>
              <option value="gpt-4" ${settings.model === 'gpt-4' ? 'selected' : ''}>GPT-4</option>
              <option value="gpt-4-turbo" ${settings.model === 'gpt-4-turbo' ? 'selected' : ''}>GPT-4 Turbo</option>
              <option value="claude-3-sonnet" ${settings.model === 'claude-3-sonnet' ? 'selected' : ''}>Claude 3 Sonnet</option>
              <option value="claude-3-opus" ${settings.model === 'claude-3-opus' ? 'selected' : ''}>Claude 3 Opus</option>
            </select>
          </div>
        </div>
        <div class="xhs-extractor-settings-footer">
          <button class="xhs-extractor-settings-save" id="settings-save-btn">保存设置</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.setupSettingsModalEvents(modal);
  }

  setupSettingsModalEvents(modal) {
    const overlay = modal.querySelector('.xhs-extractor-settings-overlay');
    const closeBtn = modal.querySelector('#settings-close-btn');
    const saveBtn = modal.querySelector('#settings-save-btn');
    const apiKeyInput = modal.querySelector('#api-key-input');
    const modelInput = modal.querySelector('#model-input');

    // 关闭弹窗事件
    const closeModal = () => {
      modal.remove();
    };

    overlay.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    // 保存设置事件
    saveBtn.addEventListener('click', async () => {
      const settings = {
        apiKey: apiKeyInput.value.trim(),
        model: modelInput.value
      };

      try {
        await this.saveSettings(settings);
        this.showNotification('设置保存成功！', 'success');
        closeModal();
      } catch (error) {
        console.error('保存设置失败:', error);
        this.showNotification('设置保存失败，请重试', 'error');
      }
    });

    // ESC键关闭弹窗
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
  }

  showNotification(message, type = "success") {
    const notification = document.createElement("div");
    notification.className = "xhs-extractor-notification";
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 14px 20px;
      background: ${type === "success" ? "#52c41a" : "#ff4d4f"};
      color: white;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-size: 14px;
      max-width: 300px;
      word-break: break-word;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateX(100%)";
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// 初始化扩展
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new XHSNoteExtractor();
  });
} else {
  new XHSNoteExtractor();
}