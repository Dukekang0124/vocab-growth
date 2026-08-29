/**
 * 链接兼容性检测模块
 * 用途：检测产品链接在微信、抖音等主流平台的打开支持状态
 *
 * @module link-compatibility-checker
 * @version 1.0.0
 * @date 2026-08-28
 */

// ==================== 配置常量 ====================

/**
 * 支持的平台配置
 * status: 'supported' | 'unsupported' | 'unknown'
 * reason: 失败原因说明
 */
const PLATFORM_CONFIG = {
  wechat: {
    name: '微信',
    supported: true,
    // 微信白名单机制：需要域名在微信公众平台配置
    // https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/WeChat_OA_web_dev.html
    notes: [
      '需要域名在微信公众平台配置白名单',
      '链接需要以 https:// 开头',
      '复制到聊天中点击打开需要微信版本 ≥ 7.0.0'
    ]
  },
  wechat_chat: {
    name: '微信聊天群',
    supported: true,
    notes: [
      '需要域名在微信公众平台配置白名单',
      '复制链接到群聊中点击打开',
      '建议先在个人对话中测试'
    ]
  },
  wechat_private: {
    name: '微信私聊',
    supported: true,
    notes: [
      '需要域名在微信公众平台配置白名单',
      '复制链接到私聊窗口点击打开',
      '私聊测试比群聊更可靠'
    ]
  },
  douyin_chat_group: {
    name: '抖音聊天群',
    supported: false,  // 抖音目前不支持通过链接直接打开应用内页面
    reason: '抖音不支持通过链接打开群聊内部页面，仅支持外链跳转',
    notes: [
      '抖音群聊链接会直接跳转到抖音网页版或外部浏览器',
      '建议使用抖音短视频链接引流',
      '群聊分享链接需要通过抖音短视频平台'
    ]
  },
  douyin_private_chat: {
    name: '抖音私聊',
    supported: false,  // 抖音目前不支持通过链接直接打开应用内页面
    reason: '抖音不支持通过链接打开私聊内部页面，仅支持外链跳转',
    notes: [
      '抖音私聊链接会直接跳转到抖音网页版或外部浏览器',
      '建议使用抖音短视频链接引流',
      '私聊分享链接需要通过抖音短视频平台'
    ]
  },
  douyin_short_video: {
    name: '抖音短视频',
    supported: true,
    notes: [
      '通过抖音短视频分享链接跳转',
      '需要用户点击"去网页"按钮',
      '适合引流到产品页面'
    ]
  },
  browser: {
    name: '浏览器',
    supported: true,
    notes: [
      '所有现代浏览器支持',
      '推荐 Chrome / Safari / Firefox / Edge'
    ]
  }
};

/**
 * 链接格式验证规则
 */
const LINK_FORMAT_RULES = {
  // 必须是 https 协议（微信/抖音白名单要求）
  protocolRequired: true,
  protocol: 'https://',
  // 域名白名单（需要在微信公众平台配置）
  domainWhitelist: [
    // GitHub Pages 域名示例
    'yourname.github.io',
    'vocab-growth-app.pages.dev',
    // 自定义域名示例
    'vocab.growth.app',
    'www.vocab.growth.app'
  ],
  // 路径要求
  pathRequired: true,
  // Hash 路由支持
  hashRoutingSupported: true,
  // 最大链接长度
  maxLength: 2048
};

// ==================== 核心检测函数 ====================

/**
 * 检测链接是否在指定平台支持
 *
 * @param {string} url - 产品链接
 * @param {string} platformKey - 平台标识（wechat/wechat_chat/wechat_private/douyin_.../browser）
 * @returns {Object} 检测结果对象
 *
 * @example
 * checkPlatformSupport('https://yourname.github.io/vocab-growth-app/', 'wechat')
 * // => { supported: true, reason: '需要域名在微信公众平台配置白名单', ... }
 */
function checkPlatformSupport(url, platformKey) {
  const platform = PLATFORM_CONFIG[platformKey];

  if (!platform) {
    return {
      platform: platformKey,
      supported: false,
      reason: `未知平台：${platformKey}`,
      status: 'unknown'
    };
  }

  // 1. 基础链接格式验证
  const formatCheck = validateLinkFormat(url);
  if (!formatCheck.valid) {
    return {
      platform: platformKey,
      supported: false,
      reason: formatCheck.reason,
      status: 'invalid_format'
    };
  }

  // 2. 域名白名单检查（微信/抖音需要）
  const domainCheck = checkDomainWhitelist(url);
  if (!domainCheck.valid) {
    return {
      platform: platformKey,
      supported: false,
      reason: domainCheck.reason,
      status: 'domain_not_whitelisted',
      notes: domainCheck.notes
    };
  }

  // 3. 平台特定检查
  const platformCheck = checkPlatformSpecific(platformKey, url);

  // 4. 返回最终结果
  return {
    platform: platformKey,
    platformName: platform.name,
    supported: platformCheck.supported,
    reason: platformCheck.reason || platform.reason || '平台支持但需配置',
    status: platformCheck.supported ? 'supported' : 'unsupported',
    notes: platform.notes || [],
    details: {
      url: url,
      protocol: formatCheck.protocol,
      domain: formatCheck.domain,
      path: formatCheck.path,
      hashRouting: LINK_FORMAT_RULES.hashRoutingSupported
    }
  };
}

/**
 * 验证链接格式是否正确
 *
 * @param {string} url - 待验证链接
 * @returns {Object} 验证结果
 */
function validateLinkFormat(url) {
  // 1. 检查链接长度
  if (url.length > LINK_FORMAT_RULES.maxLength) {
    return {
      valid: false,
      reason: `链接长度超过限制（最大 ${LINK_FORMAT_RULES.maxLength} 字符）`
    };
  }

  // 2. 检查协议
  if (LINK_FORMAT_RULES.protocolRequired) {
    if (!url.startsWith(LINK_FORMAT_RULES.protocol)) {
      return {
        valid: false,
        reason: `链接必须使用 ${LINK_FORMAT_RULES.protocol} 协议`,
        notes: ['微信和抖音要求 https 协议以启用白名单']
      };
    }
  }

  // 3. 解析域名和路径
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname;
    const protocol = urlObj.protocol;

    return {
      valid: true,
      protocol: protocol,
      domain: domain,
      path: path,
      notes: []
    };
  } catch (e) {
    return {
      valid: false,
      reason: '链接格式无效（无法解析 URL）',
      notes: ['请检查链接是否包含 http:// 或 https:// 前缀']
    };
  }
}

/**
 * 检查域名是否在白名单中
 *
 * @param {string} url - 待检查链接
 * @returns {Object} 检查结果
 */
function checkDomainWhitelist(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // 检查是否在白名单中
    const isWhitelisted = LINK_FORMAT_RULES.domainWhitelist.some(
      whitelistDomain => domain === whitelistDomain || domain.endsWith('.' + whitelistDomain)
    );

    if (!isWhitelisted) {
      return {
        valid: false,
        reason: `域名 ${domain} 未在白名单中`,
        notes: [
          '需要在微信公众平台配置域名白名单',
          '配置路径：微信公众平台 → 设置 → 功能设置 → 业务域名',
          '或使用自定义域名并添加 DNS 解析'
        ]
      };
    }

    return {
      valid: true,
      notes: ['域名已在白名单中']
    };
  } catch (e) {
    return {
      valid: false,
      reason: '无法解析域名',
      notes: ['请检查链接格式是否正确']
    };
  }
}

/**
 * 检查平台特定要求
 *
 * @param {string} platformKey - 平台标识
 * @param {string} url - 链接
 * @returns {Object} 平台检查结果
 */
function checkPlatformSpecific(platformKey, url) {
  switch (platformKey) {
    case 'wechat':
    case 'wechat_chat':
    case 'wechat_private':
      // 微信需要域名白名单（已在 checkDomainWhitelist 中检查）
      // 检查 hash 路由是否支持
      const urlObj = new URL(url);
      if (!urlObj.hash || urlObj.hash === '#') {
        return {
          supported: true,
          reason: '链接格式正确，但缺少 hash 路由',
          notes: [
            '建议使用 hash 路由（如 #today/#learn/#review）',
            'hash 路由在微信中更稳定'
          ]
        };
      }
      return { supported: true };

    case 'douyin_chat_group':
    case 'douyin_private_chat':
      return {
        supported: false,
        reason: '抖音不支持通过链接打开应用内页面',
        notes: [
          '抖音群聊和私聊链接会直接跳转到外部浏览器',
          '建议使用抖音短视频链接引流',
          '群聊分享链接需要通过短视频平台'
        ]
      };

    case 'douyin_short_video':
      return {
        supported: true,
        reason: '抖音短视频链接支持外链跳转',
        notes: [
          '需要用户点击"去网页"按钮',
          '适合引流到产品页面'
        ]
      };

    case 'browser':
      return {
        supported: true,
        reason: '所有现代浏览器支持'
      };

    default:
      return {
        supported: false,
        reason: `未知的平台：${platformKey}`
      };
  }
}

/**
 * 批量检测链接在所有平台的兼容性
 *
 * @param {string} url - 产品链接
 * @returns {Array<Object>} 所有平台的检测结果
 *
 * @example
 * checkAllPlatforms('https://yourname.github.io/vocab-growth-app/')
 * // => [
 * //   { platform: 'wechat', supported: true, ... },
 * //   { platform: 'wechat_chat', supported: true, ... },
 * //   { platform: 'douyin_chat_group', supported: false, ... },
 * //   ...
 * // ]
 */
function checkAllPlatforms(url) {
  const platforms = Object.keys(PLATFORM_CONFIG);
  const results = platforms.map(key => checkPlatformSupport(url, key));
  return results;
}

/**
 * 获取平台支持总结报告
 *
 * @param {string} url - 产品链接
 * @returns {Object} 支持总结
 *
 * @example
 * getSupportSummary('https://yourname.github.io/vocab-growth-app/')
 * // => {
 * //   supportedPlatforms: ['wechat', 'wechat_chat', 'wechat_private', 'browser'],
 * //   unsupportedPlatforms: ['douyin_chat_group', 'douyin_private_chat'],
 * //   totalPlatforms: 7,
 * //   supportRate: 57.1,
 * //   recommendations: [...]
 * // }
 */
function getSupportSummary(url) {
  const results = checkAllPlatforms(url);

  const supportedPlatforms = results.filter(r => r.supported).map(r => r.platform);
  const unsupportedPlatforms = results.filter(r => !r.supported).map(r => r.platform);
  const totalPlatforms = results.length;
  const supportRate = totalPlatforms > 0
    ? ((supportedPlatforms.length / totalPlatforms) * 100).toFixed(1)
    : 0;

  const recommendations = [];

  // 生成建议
  if (!supportedPlatforms.includes('wechat')) {
    recommendations.push({
      priority: 'high',
      message: '微信链接未支持，需要配置微信公众平台域名白名单',
      action: '在微信公众平台配置业务域名'
    });
  }

  if (!supportedPlatforms.includes('browser')) {
    recommendations.push({
      priority: 'high',
      message: '浏览器链接未支持，检查链接格式',
      action: '确保使用 https 协议且格式正确'
    });
  }

  if (unsupportedPlatforms.includes('douyin_chat_group') || unsupportedPlatforms.includes('douyin_private_chat')) {
    recommendations.push({
      priority: 'medium',
      message: '抖音聊天群和私聊不支持链接打开，建议通过短视频引流',
      action: '创建抖音短视频分享链接'
    });
  }

  return {
    url: url,
    totalPlatforms: totalPlatforms,
    supportedPlatforms: supportedPlatforms,
    unsupportedPlatforms: unsupportedPlatforms,
    supportRate: parseFloat(supportRate),
    recommendations: recommendations,
    platformDetails: results
  };
}

// ==================== 实用工具函数 ====================

/**
 * 生成测试链接（根据当前环境自动选择）
 *
 * @returns {string} 测试链接
 */
function generateTestLink() {
  // 优先使用 GitHub Pages 域名
  const githubPagesDomain = 'yourname.github.io/vocab-growth-app';
  return `https://${githubPagesDomain}/`;
}

/**
 * 验证当前页面是否在指定平台打开
 *
 * @param {string} expectedPlatform - 预期平台标识
 * @returns {boolean} 是否在预期平台打开
 */
function isRunningOnPlatform(expectedPlatform) {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = PLATFORM_CONFIG[expectedPlatform];

  if (!platform) return false;

  switch (expectedPlatform) {
    case 'wechat':
    case 'wechat_chat':
    case 'wechat_private':
      // 微信浏览器特征
      return /micromessenger/i.test(userAgent);
    case 'browser':
      // 非微信浏览器
      return !/micromessenger/i.test(userAgent);
    default:
      return false;
  }
}

/**
 * 获取当前平台信息
 *
 * @returns {Object} 当前平台信息
 */
function getCurrentPlatform() {
  const userAgent = navigator.userAgent.toLowerCase();

  if (/micromessenger/i.test(userAgent)) {
    // 微信环境
    if (userAgent.includes('group')) {
      return {
        platform: 'wechat_chat',
        name: '微信聊天群',
        isWechat: true
      };
    } else {
      return {
        platform: 'wechat_private',
        name: '微信私聊',
        isWechat: true
      };
    }
  } else {
    return {
      platform: 'browser',
      name: '浏览器',
      isWechat: false
    };
  }
}

// ==================== 导出 ====================

// 暴露给全局（浏览器环境）
if (typeof window !== 'undefined') {
  window.LinkCompatibilityChecker = {
    checkPlatformSupport,
    checkAllPlatforms,
    getSupportSummary,
    validateLinkFormat,
    checkDomainWhitelist,
    generateTestLink,
    isRunningOnPlatform,
    getCurrentPlatform,
    PLATFORM_CONFIG,
    LINK_FORMAT_RULES
  };
}

// 导出模块（Node.js 环境）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    checkPlatformSupport,
    checkAllPlatforms,
    getSupportSummary,
    validateLinkFormat,
    checkDomainWhitelist,
    generateTestLink,
    isRunningOnPlatform,
    getCurrentPlatform,
    PLATFORM_CONFIG,
    LINK_FORMAT_RULES
  };
}

// ==================== 使用示例 ====================

/*
// 浏览器控制台使用示例：

// 1. 生成测试链接
const testLink = LinkCompatibilityChecker.generateTestLink();
console.log('测试链接:', testLink);

// 2. 检查单个平台支持
const wechatResult = LinkCompatibilityChecker.checkPlatformSupport(testLink, 'wechat');
console.log('微信支持:', wechatResult);

const douyinResult = LinkCompatibilityChecker.checkPlatformSupport(testLink, 'douyin_chat_group');
console.log('抖音聊天群支持:', douyinResult);

// 3. 批量检查所有平台
const allResults = LinkCompatibilityChecker.checkAllPlatforms(testLink);
console.log('所有平台检测结果:', allResults);

// 4. 获取支持总结
const summary = LinkCompatibilityChecker.getSupportSummary(testLink);
console.log('支持总结:', summary);
console.log('支持率:', summary.supportRate + '%');

// 5. 检测当前平台
const currentPlatform = LinkCompatibilityChecker.getCurrentPlatform();
console.log('当前平台:', currentPlatform);
*/
