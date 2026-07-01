export const isSafari = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android');
};

export const isIOS = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod');
};

export const downloadBlobSafari = (blob: Blob, filename: string): void => {
  if (!isSafari()) {
    throw new Error('This function is only for Safari browsers');
  }

  if (isIOS()) {
    downloadBlobIOS(blob, filename);
  } else {
    downloadBlobDesktopSafari(blob, filename);
  }
};

const downloadBlobDesktopSafari = (blob: Blob, filename: string): void => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const dataUrl = reader.result as string;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  reader.readAsDataURL(blob);
};

const downloadBlobIOS = (blob: Blob, filename: string): void => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target?.result as string;
    const windowRef = window.open();
    if (windowRef) {
      windowRef.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Download</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex; 
              flex-direction: column; 
              align-items: center; 
              justify-content: center; 
              height: 100vh; 
              margin: 0; 
              background: #f5f5f5;
            }
            .download-btn {
              display: inline-block;
              padding: 12px 24px;
              background: #007aff;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 500;
            }
            .download-btn:hover {
              background: #0066cc;
            }
            .instructions {
              margin-top: 20px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <a href="${dataUrl}" download="${filename}" class="download-btn">点击下载 ${filename}</a>
          <p class="instructions">如果下载没有自动开始，请长按链接并选择"下载"</p>
        </body>
        </html>
      `);
      windowRef.document.close();
    }
  };
  reader.readAsDataURL(blob);
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  if (isSafari()) {
    downloadBlobSafari(blob, filename);
    return;
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  
  document.body.appendChild(a);
  
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
  });
  a.dispatchEvent(clickEvent);
  
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
};

interface DownloadResponse {
  data: Blob | string;
}

export const handleDownloadResponse = (response: DownloadResponse, filename: string): void => {
  const blob = response.data;
  
  if (blob instanceof Blob) {
    downloadBlob(blob, filename);
  } else if (typeof blob === 'string') {
    const textBlob = new Blob([blob], { type: 'text/plain' });
    downloadBlob(textBlob, filename);
  } else {
    throw new Error('Unsupported response type');
  }
};