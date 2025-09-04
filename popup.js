// 弹出窗口脚本

document.addEventListener('DOMContentLoaded', function() {
    // 设置按钮点击事件
    document.getElementById('open-settings').addEventListener('click', function() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('settings.html')
        });
        window.close();
    });

    // 帮助按钮点击事件
    document.getElementById('open-help').addEventListener('click', function() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('help.html')
        });
        window.close();
    });

    // 检查当前标签页
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const currentTab = tabs[0];
        const isXHSPage = currentTab.url.includes('xiaohongshu.com');
        
        if (!isXHSPage) {
            // 如果不是小红书页面，可以显示提示
            const content = document.querySelector('.popup-content');
            const warning = document.createElement('div');
            warning.className = 'warning-message';
            warning.innerHTML = `
                <div style="
                    padding: 16px;
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    border-radius: 8px;
                    color: #856404;
                    text-align: center;
                    margin-bottom: 16px;
                ">
                    📍 请在小红书网页中使用此扩展
                </div>
            `;
            content.insertBefore(warning, content.firstChild);
        }
    });
});