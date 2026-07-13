const API_BASE_URL = 'http://localhost:5001/api';

async function getStoredToken() {
  const result = await chrome.storage.local.get('authToken');
  return result.authToken || null;
}

async function setStoredToken(token) {
  await chrome.storage.local.set({ authToken: token });
}

async function addDownload(url, filename = '') {
  const token = await getStoredToken();
  if (!token) {
    return { success: false, error: '请先登录下载管理系统' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/downloads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        url: url,
        filename: filename || url.split('/').pop() || ''
      })
    });

    const data = await response.json();
    return { success: response.ok, data, error: data.message };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getDownloads() {
  const token = await getStoredToken();
  if (!token) {
    return { success: false, error: '请先登录' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/downloads`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    return { success: response.ok, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function createContextMenu() {
  chrome.contextMenus.create({
    id: 'add-link-to-download',
    title: '添加链接到下载管理器',
    contexts: ['link'],
    icons: {
      '16': 'icons/icon16.png',
      '32': 'icons/icon32.png'
    }
  });

  chrome.contextMenus.create({
    id: 'add-page-to-download',
    title: '添加当前页面到下载管理器',
    contexts: ['page'],
    icons: {
      '16': 'icons/icon16.png',
      '32': 'icons/icon32.png'
    }
  });

  chrome.contextMenus.create({
    id: 'download-manager-menu',
    title: '下载管理器',
    contexts: ['browser_action'],
    icons: {
      '16': 'icons/icon16.png',
      '32': 'icons/icon32.png'
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
  console.log('Download Manager Helper 扩展已安装');
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'add-link-to-download' && info.linkUrl) {
    const result = await addDownload(info.linkUrl, info.linkText);
    showNotification(result);
  } else if (info.menuItemId === 'add-page-to-download' && tab?.url) {
    const result = await addDownload(tab.url, tab.title);
    showNotification(result);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'add-current-page') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      const result = await addDownload(tab.url, tab.title);
      showNotification(result);
    }
  } else if (command === 'add-selected-link') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: getSelectedLink
      }, async (results) => {
        if (results && results[0]?.result) {
          const { url, text } = results[0].result;
          const result = await addDownload(url, text);
          showNotification(result);
        }
      });
    }
  }
});

function getSelectedLink() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  
  const range = selection.getRangeAt(0);
  const link = range.commonAncestorContainer.closest('a');
  if (link && link.href) {
    return { url: link.href, text: link.textContent || '' };
  }
  return null;
}

function showNotification(result) {
  if (result.success) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '✅ 添加成功',
      message: `已将链接添加到下载管理器`
    });
  } else {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '❌ 添加失败',
      message: result.error || '未知错误'
    });
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addDownload') {
    addDownload(request.url, request.filename).then(sendResponse);
    return true;
  } else if (request.action === 'getDownloads') {
    getDownloads().then(sendResponse);
    return true;
  } else if (request.action === 'setToken') {
    setStoredToken(request.token).then(() => sendResponse({ success: true }));
    return true;
  } else if (request.action === 'getToken') {
    getStoredToken().then(token => sendResponse({ token }));
    return true;
  }
});

chrome.downloads.onCreated.addListener((downloadItem) => {
  chrome.storage.local.get('autoAddDownloads', async (result) => {
    if (result.autoAddDownloads && downloadItem.url) {
      await addDownload(downloadItem.url, downloadItem.filename);
    }
  });
});
