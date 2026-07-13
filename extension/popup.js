document.addEventListener('DOMContentLoaded', async () => {
  const loginSection = document.getElementById('login-section');
  const mainSection = document.getElementById('main-section');
  const loadingSection = document.getElementById('loading-section');
  const tokenInput = document.getElementById('token-input');
  const loginBtn = document.getElementById('login-btn');
  const loginHint = document.getElementById('login-hint');
  const addCurrentPageBtn = document.getElementById('add-current-page-btn');
  const addSelectedLinkBtn = document.getElementById('add-selected-link-btn');
  const openManagerBtn = document.getElementById('open-manager-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const autoAddToggle = document.getElementById('auto-add-toggle');
  const downloadCount = document.getElementById('download-count');

  async function showLoading(show) {
    loginSection.style.display = show ? 'none' : 'block';
    mainSection.style.display = show ? 'none' : 'block';
    loadingSection.style.display = show ? 'block' : 'none';
  }

  async function checkAuth() {
    showLoading(true);
    const response = await chrome.runtime.sendMessage({ action: 'getToken' });
    
    if (response?.token) {
      showMainSection();
      await loadDownloadCount();
    } else {
      showLoginSection();
    }
    showLoading(false);
  }

  function showLoginSection() {
    loginSection.style.display = 'block';
    mainSection.style.display = 'none';
    loadingSection.style.display = 'none';
  }

  function showMainSection() {
    loginSection.style.display = 'none';
    mainSection.style.display = 'block';
    loadingSection.style.display = 'none';
  }

  async function loadDownloadCount() {
    const response = await chrome.runtime.sendMessage({ action: 'getDownloads' });
    if (response?.success && response.data) {
      const count = Array.isArray(response.data) ? response.data.length : 0;
      const completed = response.data.filter ? response.data.filter(d => d.status === 'completed').length : 0;
      downloadCount.textContent = `📊 共 ${count} 个任务，已完成 ${completed} 个`;
    } else {
      downloadCount.textContent = '📊 无法获取下载统计';
    }
  }

  async function handleLogin() {
    const token = tokenInput.value.trim();
    if (!token) {
      loginHint.textContent = '❌ 请输入API Token';
      loginHint.className = 'status status-error';
      return;
    }

    showLoading(true);
    
    try {
      const response = await fetch('http://localhost:5001/api/downloads', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await chrome.runtime.sendMessage({ action: 'setToken', token });
        showMainSection();
        await loadDownloadCount();
      } else {
        loginHint.textContent = '❌ Token无效，请重试';
        loginHint.className = 'status status-error';
        showLoginSection();
      }
    } catch (error) {
      loginHint.textContent = '❌ 连接失败，请检查后端服务';
      loginHint.className = 'status status-error';
      showLoginSection();
    }
    
    showLoading(false);
  }

  async function handleLogout() {
    await chrome.storage.local.remove('authToken');
    tokenInput.value = '';
    showLoginSection();
    loginHint.textContent = '💡 在下载管理系统中获取Token';
    loginHint.className = 'status status-info';
  }

  async function handleAddCurrentPage() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      const response = await chrome.runtime.sendMessage({
        action: 'addDownload',
        url: tab.url,
        filename: tab.title || ''
      });
      
      if (response?.success) {
        downloadCount.textContent = '✅ 已添加到下载管理器';
        setTimeout(() => loadDownloadCount(), 1000);
      } else {
        downloadCount.textContent = `❌ 添加失败: ${response?.error}`;
      }
    }
  }

  async function handleAddSelectedLink() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          function: () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return null;
            const range = selection.getRangeAt(0);
            const link = range.commonAncestorContainer.closest('a');
            if (link && link.href) {
              return { url: link.href, text: link.textContent || '' };
            }
            return null;
          }
        });

        if (result?.result) {
          const response = await chrome.runtime.sendMessage({
            action: 'addDownload',
            url: result.result.url,
            filename: result.result.text
          });
          
          if (response?.success) {
            downloadCount.textContent = '✅ 已添加到下载管理器';
            setTimeout(() => loadDownloadCount(), 1000);
          } else {
            downloadCount.textContent = `❌ 添加失败: ${response?.error}`;
          }
        } else {
          downloadCount.textContent = '❌ 未选中任何链接';
        }
      } catch (error) {
        downloadCount.textContent = '❌ 无法获取选中链接';
      }
    }
  }

  function handleOpenManager() {
    chrome.tabs.create({ url: 'http://localhost:3000/downloads' });
    window.close();
  }

  async function toggleAutoAdd() {
    const result = await chrome.storage.local.get('autoAddDownloads');
    const newValue = !result.autoAddDownloads;
    await chrome.storage.local.set({ autoAddDownloads: newValue });
    autoAddToggle.classList.toggle('active', newValue);
  }

  loginBtn.addEventListener('click', handleLogin);
  tokenInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });

  logoutBtn.addEventListener('click', handleLogout);
  addCurrentPageBtn.addEventListener('click', handleAddCurrentPage);
  addSelectedLinkBtn.addEventListener('click', handleAddSelectedLink);
  openManagerBtn.addEventListener('click', handleOpenManager);
  autoAddToggle.addEventListener('click', toggleAutoAdd);

  chrome.storage.local.get('autoAddDownloads', (result) => {
    autoAddToggle.classList.toggle('active', result.autoAddDownloads);
  });

  checkAuth();
});
