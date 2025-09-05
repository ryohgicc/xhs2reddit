// Background script for handling CORS-restricted image downloads

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadImage') {
    downloadImage(request.url)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        console.error('Background script下载图片失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // 返回true表示异步响应
    return true;
  }
});

async function downloadImage(imageUrl) {
  try {
    console.log('Background script开始下载图片:', imageUrl);
    
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.xiaohongshu.com/'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // 将Blob转换为base64
    const reader = new FileReader();
    return new Promise((resolve) => {
      reader.onloadend = () => {
        console.log('Background script图片下载成功，大小:', blob.size, 'bytes');
        resolve({
          success: true,
          data: reader.result,
          contentType: contentType,
          size: blob.size
        });
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Background script下载失败:', error);
    throw error;
  }
}