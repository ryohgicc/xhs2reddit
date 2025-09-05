// 小红书笔记搬运助手 - 内容脚本
class XHSNoteExtractor {
  constructor() {
    this.panel = null;
    this.isExtracting = false;
    this.extractedData = null;
    
    this.init();
  }

  init() {
    // 检测当前页面类型
    if (this.isRedditSubmitPage()) {
      this.createRedditPanel();
    } else {
      this.createPanel();
    }
  }

  isRedditSubmitPage() {
    return window.location.href.includes('reddit.com') && window.location.href.includes('/submit/');
  }



  createPanel() {
    if (document.querySelector('.xhs-extractor-panel')) return;

    this.panel = document.createElement('div');
    this.panel.className = 'xhs-extractor-panel';
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
    const extractBtn = this.panel.querySelector('#extract-btn');
    const downloadBtn = this.panel.querySelector('#download-btn');
    const header = this.panel.querySelector('.xhs-extractor-header');

    extractBtn.addEventListener('click', () => this.extractNoteContent());
    downloadBtn.addEventListener('click', () => this.downloadData(this.extractedData));
    
    header.addEventListener('mousedown', (e) => this.handleDrag(e));
  }

  async createRedditPanel() {
    if (document.querySelector('.xhs-extractor-panel')) return;

    // 从存储中获取上次提取的数据
    const lastExtractedData = await this.getStoredData();
    
    this.panel = document.createElement('div');
    this.panel.className = 'xhs-extractor-panel';
    
    if (lastExtractedData) {
      // 显示上次提取的内容
      this.panel.innerHTML = `
        <div class="xhs-extractor-header">
          <h3 class="xhs-extractor-title">小红书笔记内容</h3>
          <button class="xhs-extractor-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="xhs-extractor-result">
          <div class="xhs-extractor-info">
            <div class="xhs-extractor-info-item">
              <span class="xhs-extractor-info-label">标题:</span>
              <span class="xhs-extractor-info-value">${lastExtractedData.title}</span>
            </div>
            <div class="xhs-extractor-info-item">
              <span class="xhs-extractor-info-label">作者:</span>
              <span class="xhs-extractor-info-value">${lastExtractedData.author || '-'}</span>
            </div>
            <div class="xhs-extractor-info-item">
              <span class="xhs-extractor-info-label">内容:</span>
              <div class="xhs-extractor-content-preview">${this.truncateText(lastExtractedData.content, 200)}</div>
            </div>
            <div class="xhs-extractor-info-item">
              <span class="xhs-extractor-info-label">图片:</span>
              <span class="xhs-extractor-info-value">${lastExtractedData.stats.imageCount} 张</span>
            </div>
          </div>
          <button class="xhs-extractor-download" id="reddit-download-btn">使用此内容</button>
        </div>
      `;
    } else {
      // 显示提示语
      this.panel.innerHTML = `
        <div class="xhs-extractor-header">
          <h3 class="xhs-extractor-title">小红书笔记搬运助手</h3>
          <button class="xhs-extractor-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
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
    const header = this.panel.querySelector('.xhs-extractor-header');
    const downloadBtn = this.panel.querySelector('#reddit-download-btn');
    
    header.addEventListener('mousedown', (e) => this.handleDrag(e));
    
    if (downloadBtn && data) {
      downloadBtn.addEventListener('click', () => this.downloadData(data));
    }
  }

  truncateText(text, maxLength) {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  async getStoredData() {
    try {
      return new Promise((resolve) => {
        chrome.storage.local.get(['lastExtractedNote'], (result) => {
          resolve(result.lastExtractedNote || null);
        });
      });
    } catch (error) {
      console.error('获取存储数据失败:', error);
      return null;
    }
  }

  async saveDataToStorage(data) {
    try {
      chrome.storage.local.set({ lastExtractedNote: data });
    } catch (error) {
      console.error('保存数据失败:', error);
    }
  }



  async extractNoteContent() {
    if (this.isExtracting) return;
    
    this.isExtracting = true;
    const extractBtn = this.panel.querySelector('#extract-btn');
    const originalText = extractBtn.textContent;
    
    extractBtn.textContent = '提取中...';
    extractBtn.disabled = true;

    try {
      await this.waitForContent();
      
      const title = this.getNoteTitle();
      const content = this.getNoteContent();
      const images = this.getNoteImages();
      const author = this.getAuthorInfo();
      
      this.extractedData = {
        title: title || '无标题',
        author: author,
        content: content,
        images: images,
        url: window.location.href,
        extractedAt: new Date().toISOString(),
        platform: 'xiaohongshu',
        version: '1.0.0',
        stats: {
          wordCount: content ? content.length : 0,
          imageCount: images.length
        }
      };

      // 显示过滤信息
      if (images.length === 0) {
        this.showNotification('未检测到符合标准格式的笔记图片（sns-webpic-qc.xhscdn.com/.../notes_pre_post/...）。请在笔记图片区域滑动/预览后重试。', 'warning');
      }

      this.displayResults(this.extractedData);
      // 保存提取的数据到存储中，供Reddit页面使用
      await this.saveDataToStorage(this.extractedData);
      this.showNotification('笔记提取成功！');
      
    } catch (error) {
      console.error('提取失败:', error);
      this.showNotification('提取失败，请刷新页面重试', 'error');
    } finally {
      this.isExtracting = false;
      extractBtn.textContent = originalText;
      extractBtn.disabled = false;
    }
  }

  getNoteTitle() {
    const selectors = [
      '#detail-title',
      'h1[data-testid="note-title"]',
      '.note-title',
      '.title',
      '[class*="title"]',
      'h1',
      '.content-title',
      '.note-content h1'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    const headings = document.querySelectorAll('h1, h2, h3');
    for (const heading of headings) {
      if (heading.textContent.trim().length > 5) {
        return heading.textContent.trim();
      }
    }

    return document.title.replace(' - 小红书', '').trim();
  }

  getNoteContent() {
    const selectors = [
      '.note-text',
      '.note-content .content',
      '.note-content',
      '.content',
      '[data-testid="note-content"]',
      '.detail-content',
      '.rich-content',
      '.note-detail-content',
      '.content-container'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    const paragraphs = document.querySelectorAll('p, .paragraph');
    let content = '';
    for (const p of paragraphs) {
      if (p.textContent.trim()) {
        content += p.textContent.trim() + '\n\n';
      }
    }

    return content.trim();
  }

  cleanImageUrl(url) {
    if (!url) return '';
    return url.trim();
  }

  getNoteImages() {
    // 从笔记正文中的实际图片元素提取图片
    const images = [];
    const seenUrls = new Set();
    
    // 小红书笔记图片的选择器 - 只选择笔记详情页的大图
    const imageSelectors = [
      'img.note-slider-img'
    ];
    
    let imageIndex = 1;
    
    // 查找所有可能的图片元素
    imageSelectors.forEach(selector => {
      const imgElements = document.querySelectorAll(selector);
      imgElements.forEach((img) => {
        let src = img.src || img.getAttribute('data-src') || img.getAttribute('srcset');
        if (src) {
          // 处理srcset
          if (src.includes(',')) {
            src = src.split(',')[0].split(' ')[0];
          }
          
          // 保留所有小红书CDN的图片
          if (src.includes('sns-webpic-qc.xhscdn.com') || src.includes('xhscdn.com')) {
            const cleanUrl = this.cleanImageUrl(src);
            // 放宽条件：提取所有小红书CDN的图片，不限制路径和格式
            if (cleanUrl && !seenUrls.has(cleanUrl)) {
              seenUrls.add(cleanUrl);
              images.push({
                url: cleanUrl,
                alt: img.alt || `小红书图片${imageIndex++}`,
                width: img.naturalWidth || 0,
                height: img.naturalHeight || 0
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
      '.author-name',
      '.user-name',
      '[data-testid="author-name"]',
      '.note-author',
      '.username',
      '.user-info .name'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    return '未知作者';
  }

  displayResults(data) {
    const resultDiv = this.panel.querySelector('.xhs-extractor-result');
    const titleEl = this.panel.querySelector('#result-title');
    const authorEl = this.panel.querySelector('#result-author');
    const imagesEl = this.panel.querySelector('#result-images');
    const wordsEl = this.panel.querySelector('#result-words');

    resultDiv.style.display = 'block';
    titleEl.textContent = data.title;
    authorEl.textContent = data.author;
    imagesEl.textContent = `${data.images.length}张`;
    wordsEl.textContent = `${data.stats.wordCount}字`;
  }

  async downloadData(data) {
    if (!data) {
      this.showNotification('请先提取笔记内容', 'error');
      return;
    }

    try {
      // 创建JSON格式数据
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `小红书笔记_${this.sanitizeFilename(data.title || '未命名')}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      // 保存到chrome.storage
      if (chrome.storage) {
        const key = `xhs_note_${Date.now()}`;
        await chrome.storage.local.set({ [key]: data });
      }

      this.showNotification('数据导出成功！已保存JSON格式');
      
    } catch (error) {
      console.error('数据保存失败:', error);
      this.showNotification('数据保存失败，请重试', 'error');
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
        <p><strong>提取时间:</strong> ${new Date(data.extractedAt).toLocaleString()}</p>
    </div>
    
    ${data.images.length > 0 ? `
    <h2>图片 (${data.images.length}张)</h2>
    <div class="images">
        ${data.images.map(img => `<img src="${img}" alt="笔记图片">`).join('')}
    </div>
    ` : ''}
    
    <h2>正文内容</h2>
    <div class="content">${data.content}</div>
</body>
</html>`;
    
    return html;
  }

  sanitizeFilename(filename) {
    return filename.replace(/[<>:'"/\\|?*]/g, '_').substring(0, 50);
  }

  async waitForContent() {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 15;
      
      const checkContent = () => {
        const title = this.getNoteTitle();
        const content = this.getNoteContent();
        const images = this.getNoteImages();
        
        if ((title && content) || attempts >= maxAttempts) {
          resolve();
        } else {
          attempts++;
          setTimeout(checkContent, 800);
        }
      };
      
      const observer = new MutationObserver(() => {
        const title = this.getNoteTitle();
        const content = this.getNoteContent();
        if (title && content) {
          observer.disconnect();
          resolve();
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      checkContent();
      
      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, 15000);
    });
  }

  handleDrag(e) {
    const panel = this.panel;
    if (!panel) return;
    
    const rect = panel.getBoundingClientRect();
    const isDragging = e.target.closest('.xhs-extractor-header') && 
                      e.clientY <= rect.top + 60;
    
    if (isDragging) {
      panel.style.cursor = 'grabbing';
      panel.classList.add('dragging');
      
      let startX = e.clientX - rect.left;
      let startY = e.clientY - rect.top;
      
      const handleMouseMove = (e) => {
        const newX = e.clientX - startX;
        const newY = e.clientY - startY;
        
        panel.style.left = `${Math.max(0, Math.min(window.innerWidth - rect.width, newX))}px`;
        panel.style.top = `${Math.max(0, Math.min(window.innerHeight - rect.height, newY))}px`;
        panel.style.right = 'auto';
      };
      
      const handleMouseUp = () => {
        panel.style.cursor = '';
        panel.classList.remove('dragging');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'xhs-extractor-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 14px 20px;
      background: ${type === 'success' ? '#52c41a' : '#ff4d4f'};
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
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// 初始化扩展
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new XHSNoteExtractor();
  });
} else {
  new XHSNoteExtractor();
}