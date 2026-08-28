/**
 * 词汇生长 - 微信白名单模块
 * 功能：检测当前域名是否在微信白名单中，提供微信拦截提示
 */

// 使用类型枚举
const WECHAT_WHITELIST_TYPE = {
  EXACT: 'exact',        // 精确匹配
  WILDCARD: 'wildcard',  // 通配符匹配（*）
  SUBDOMAIN: 'subdomain' // 子域名匹配
};

// 微信白名单配置
const WECHAT_WHITELIST = [
  { domain: 'vocab-growth-app.vercel.app', type: WECHAT_WHITELIST_TYPE.EXACT },
  { domain: 'vocab-growth-app.netlify.app', type: WECHAT_WHITELIST_TYPE.EXACT },
  { domain: 'vocab-growth-app.github.io', type: WECHAT_WHITELIST_TYPE.EXACT },
  { domain: 'vocab-growth.app', type: WECHAT_WHITELIST_TYPE.EXACT },
  { domain: 'vocab-growth.vercel.app', type: WECHAT_WHITELIST_TYPE.EXACT },
  { domain: '*.github.io', type: WECHAT_WHITELIST_TYPE.WILDCARD },
  { domain: 'localhost', type: WECHAT_WHITELIST_TYPE.EXACT },
  { domain: '127.0.0.1', type: WECHAT_WHITELIST_TYPE.EXACT }
];

// 存储键名
const WHITELIST_STORAGE_KEY = 'vocab_growth_wechat_whitelist';

/**
 * 获取微信白名单配置
 * @returns {Array} 白名单配置数组
 */
function getWechatWhitelist() {
  try {
    // 从localStorage获取
    const storedWhitelist = localStorage.getItem(WHITELIST_STORAGE_KEY);
    if (storedWhitelist) {
      return JSON.parse(storedWhitelist);
    }
    
    // 返回默认配置
    return WECHAT_WHITELIST;
  } catch (error) {
    console.error('获取微信白名单失败:', error);
    return WECHAT_WHITELIST;
  }
}

/**
 * 保存微信白名单到localStorage
 * @param {Array} whitelist 白名单配置数组
 */
function saveWechatWhitelist(whitelist) {
  try {
    localStorage.setItem(WHITELIST_STORAGE_KEY, JSON.stringify(whitelist));
  } catch (error) {
    console.error('保存微信白名单失败:', error);
  }
}

/**
 * 检测是否在微信白名单中
 * @returns {boolean} 是否在白名单中
 */
function isWhitelisted() {
  const hostname = window.location.hostname;
  const whitelist = getWechatWhitelist();

  // 检查当前域名是否在白名单中
  return whitelist.some(item => {
    const { domain, type } = item;
    
    switch (type) {
      case WECHAT_WHITELIST_TYPE.EXACT:
        return hostname === domain;
      
      case WECHAT_WHITELIST_TYPE.WILDCARD:
        if (domain.startsWith('*.')) {
          const baseDomain = domain.substring(2);
          return hostname === baseDomain || hostname.endsWith('.' + baseDomain);
        }
        return hostname === domain;
      
      case WECHAT_WHITELIST_TYPE.SUBDOMAIN:
        return hostname.endsWith('.' + domain) || hostname === domain;
      
      default:
        return hostname === domain;
    }
  });
}

/**
 * 检测是否在微信浏览器中
 * @returns {boolean} 是否在微信浏览器中
 */
function isWeChatBrowser() {
  const ua = navigator.userAgent.toLowerCase();
  return ua.indexOf('micromessenger') !== -1;
}

/**
 * 检测是否需要提示用户在浏览器中打开
 * @returns {Object} { needAlert: boolean, message: string }
 */
function needBrowserAlert() {
  if (!isWeChatBrowser()) {
    return {
      needAlert: false,
      message: ''
    };
  }

  if (isWhitelisted()) {
    return {
      needAlert: false,
      message: ''
    };
  }

  return {
    needAlert: true,
    message: '请在浏览器中打开此链接以获得最佳体验。'
  };
}

/**
 * 显示微信浏览器提示（如果需要）
 * @param {number} delay 延迟显示时间（毫秒）
 */
function showAlertIfNeeded(delay = 0) {
  const alert = needBrowserAlert();

  if (!alert.needAlert) {
    return;
  }

  setTimeout(() => {
    // 检查是否还在微信浏览器中
    if (!isWeChatBrowser()) {
      return;
    }

    // 显示提示（使用自定义方式，不使用 alert）
    const existingAlert = document.getElementById('wechat-alert');
    if (existingAlert) {
      existingAlert.remove();
    }

    const alertDiv = document.createElement('div');
    alertDiv.id = 'wechat-alert';
    alertDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #FFC107;
      color: #000;
      padding: 12px;
      text-align: center;
      font-size: 14px;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      animation: slideDown 0.3s ease-out;
    `;
    alertDiv.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
        <span>⚠️</span>
        <span>${alert.message}</span>
        <a href="${window.location.href}" style="color: #000; text-decoration: underline; font-weight: bold;">在浏览器中打开 →</a>
      </div>
    `;

    // 添加关闭按钮
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
      margin-left: 16px;
      font-weight: bold;
      cursor: pointer;
      font-size: 18px;
    `;
    closeBtn.onclick = () => alertDiv.remove();
    alertDiv.appendChild(closeBtn);

    document.body.appendChild(alertDiv);

    // 5秒后自动关闭
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.remove();
      }
    }, 5000);

  }, delay);
}

/**
 * 添加CSS动画
 */
function addAlertStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * 初始化微信白名单检查
 */
function initWechatWhitelistCheck() {
  // 页面加载完成后检查
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      addAlertStyles();
      showAlertIfNeeded(1000);
    });
  } else {
    addAlertStyles();
    showAlertIfNeeded(1000);
  }

  // 监听域名变化（单页应用路由变化）
  window.addEventListener('popstate', () => {
    showAlertIfNeeded(500);
  });
}

/**
 * 更新微信白名单
 * @param {Array} whitelist 新的白名单配置
 * @returns {Object} { success: boolean, message: string }
 */
function updateWechatWhitelist(whitelist) {
  try {
    saveWechatWhitelist(whitelist);
    return {
      success: true,
      message: '微信白名单已更新'
    };
  } catch (error) {
    console.error('更新微信白名单失败:', error);
    return {
      success: false,
      message: '更新微信白名单失败'
    };
  }
}

/**
 * 获取微信白名单状态
 * @returns {Object} 白名单状态
 */
function getWechatWhitelistStatus() {
  const currentDomain = window.location.hostname;
  const whitelist = getWechatWhitelist();
  const isInWhitelist = isWhitelisted();
  const isWechat = isWeChatBrowser();
  
  return {
    currentDomain,
    whitelist,
    isInWhitelist,
    isWechat,
    accessAllowed: isInWhitelist || !isWechat
  };
}

// 初始化微信白名单检查
initWechatWhitelistCheck();

// 导出公共 API
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    WECHAT_WHITELIST,
    WECHAT_WHITELIST_TYPE,
    getWechatWhitelist,
    saveWechatWhitelist,
    isWhitelisted,
    isWeChatBrowser,
    needBrowserAlert,
    showAlertIfNeeded,
    initWechatWhitelistCheck,
    updateWechatWhitelist,
    getWechatWhitelistStatus
  };
}
