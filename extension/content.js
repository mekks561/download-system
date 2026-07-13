const DOWNLOAD_MANAGER_HOST = 'localhost:3000';

function isDownloadManagerPage() {
  return window.location.host === DOWNLOAD_MANAGER_HOST;
}

function extractDownloadLinks() {
  const links = [];
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.href;
    if (isDownloadable(href)) {
      links.push({
        url: href,
        text: link.textContent.trim(),
        element: link
      });
    }
  });
  return links;
}

function isDownloadable(url) {
  const downloadExtensions = [
    '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2',
    '.exe', '.msi', '.dmg', '.apk',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.mp3', '.mp4', '.avi', '.mkv', '.mov', '.flv', '.wmv',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg',
    '.iso', '.img', '.bin',
    '.torrent',
    '.epub', '.mobi', '.azw',
    '.json', '.xml', '.csv', '.txt',
    '.deb', '.rpm', '.pkg', '.sh', '.bat'
  ];
  
  const urlLower = url.toLowerCase();
  return downloadExtensions.some(ext => urlLower.endsWith(ext)) ||
         urlLower.includes('download') ||
         urlLower.includes('file');
}

function addDownloadButtons() {
  if (isDownloadManagerPage()) return;
  
  document.querySelectorAll('.download-manager-helper-btn').forEach(btn => btn.remove());
  
  extractDownloadLinks().forEach(({ url, text, element }) => {
    if (element.querySelector('.download-manager-helper-btn')) return;
    
    const btn = document.createElement('button');
    btn.className = 'download-manager-helper-btn';
    btn.textContent = '📥';
    btn.title = '添加到下载管理器';
    btn.style.cssText = `
      position: absolute;
      right: -30px;
      top: 50%;
      transform: translateY(-50%);
      width: 24px;
      height: 24px;
      border: none;
      border-radius: 50%;
      background: linear-gradient(135deg, #ec4899, #8b5cf6);
      color: white;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(236, 72, 153, 0.4);
      opacity: 0;
      transition: opacity 0.2s, transform 0.2s;
      z-index: 9999;
    `;
    
    element.style.position = 'relative';
    
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({
        action: 'addDownload',
        url: url,
        filename: text
      }, (response) => {
        if (response?.success) {
          btn.textContent = '✅';
          setTimeout(() => {
            btn.textContent = '📥';
          }, 2000);
        }
      });
    });
    
    element.appendChild(btn);
    
    element.addEventListener('mouseenter', () => {
      btn.style.opacity = '1';
      btn.style.transform = 'translateY(-50%) scale(1.1)';
    });
    
    element.addEventListener('mouseleave', () => {
      btn.style.opacity = '0';
      btn.style.transform = 'translateY(-50%) scale(1)';
    });
  });
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .download-manager-helper-btn:hover {
      transform: translateY(-50%) scale(1.2) !important;
      box-shadow: 0 4px 12px rgba(236, 72, 153, 0.6) !important;
    }
    .download-manager-highlight {
      background: rgba(236, 72, 153, 0.1) !important;
      border: 2px solid rgba(236, 72, 153, 0.5) !important;
      border-radius: 4px !important;
    }
  `;
  document.head.appendChild(style);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const debouncedAddButtons = debounce(addDownloadButtons, 500);

if (isDownloadManagerPage()) {
  chrome.runtime.sendMessage({ action: 'getToken' }, (response) => {
    if (!response?.token) {
      const token = localStorage.getItem('token');
      if (token) {
        chrome.runtime.sendMessage({ action: 'setToken', token });
      }
    }
  });
} else {
  injectStyles();
  addDownloadButtons();
  
  const observer = new MutationObserver(() => {
    debouncedAddButtons();
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractLinks') {
    sendResponse(extractDownloadLinks());
  } else if (request.action === 'addDownloadFromPage') {
    chrome.runtime.sendMessage({
      action: 'addDownload',
      url: request.url,
      filename: request.filename
    }, sendResponse);
  }
});
