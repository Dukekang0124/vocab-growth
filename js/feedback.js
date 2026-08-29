/**
 * 词汇生长 - 用户反馈模块
 * 功能：收集用户反馈（bug/建议/新功能）、评分、邮箱
 * 存储方式：localStorage (key: vocab_growth_feedback_v1)
 */

// 存储键名
const FEEDBACK_STORAGE_KEY = 'vocab_growth_feedback_v1';

/**
 * 反馈类型枚举
 */
const FEEDBACK_TYPE = {
  BUG: 'bug',
  SUGGESTION: 'suggestion',
  FEATURE: 'feature'
};

/**
 * 初始化反馈数据结构
 * @returns {Object} 初始化的反馈数据对象
 */
function initializeFeedbackData() {
  return {
    feedbacks: []  // 结构: [ { id, type, content, rating, email, timestamp, userId } ]
  };
}

/**
 * 获取反馈数据
 * @returns {Object} 反馈数据对象
 */
function getFeedbackData() {
  try {
    const data = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    return data ? JSON.parse(data) : initializeFeedbackData();
  } catch (error) {
    console.error('读取反馈数据失败:', error);
    return initializeFeedbackData();
  }
}

/**
 * 保存反馈数据
 * @param {Object} feedbackData 反馈数据对象
 */
function saveFeedbackData(feedbackData) {
  try {
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedbackData));
  } catch (error) {
    console.error('保存反馈数据失败:', error);
  }
}

/**
 * 提交反馈
 * @param {string} type 反馈类型（bug/suggestion/feature）
 * @param {string} content 反馈内容
 * @param {number} rating 评分（1-5）
 * @param {string} email 邮箱（可选）
 * @returns {Object} { success: boolean, message: string }
 */
function submitFeedback(type, content, rating, email = '') {
  if (!type || !content || !rating) {
    return {
      success: false,
      message: '反馈类型、内容和评分不能为空'
    };
  }

  if (rating < 1 || rating > 5) {
    return {
      success: false,
      message: '评分必须在1-5之间'
    };
  }

  const feedbackData = getFeedbackData();
  const feedback = {
    id: Date.now(),
    type: type,
    content: content.trim(),
    rating: rating,
    email: email.trim(),
    timestamp: Date.now(),
    userId: 'user_' + Math.random().toString(36).substr(2, 9)
  };

  feedbackData.feedbacks.push(feedback);
  saveFeedbackData(feedbackData);

  return {
    success: true,
    message: '感谢您的反馈！我们会持续改进产品。'
  };
}

/**
 * 获取反馈列表
 * @param {number} limit 限制数量（默认50）
 * @returns {Array} 反馈列表
 */
function getFeedbackList(limit = 50) {
  const feedbackData = getFeedbackData();
  return feedbackData.feedbacks.slice(-limit).reverse();
}

/**
 * 获取反馈统计
 * @returns {Object} 反馈统计
 */
function getFeedbackStats() {
  const feedbackData = getFeedbackData();
  const feedbacks = feedbackData.feedbacks;

  const stats = {
    total: feedbacks.length,
    byType: {
      [FEEDBACK_TYPE.BUG]: 0,
      [FEEDBACK_TYPE.SUGGESTION]: 0,
      [FEEDBACK_TYPE.FEATURE]: 0
    },
    byRating: {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    },
    averageRating: 0
  };

  feedbacks.forEach(f => {
    // 按类型统计
    if (stats.byType[f.type] !== undefined) {
      stats.byType[f.type]++;
    }

    // 按评分统计
    if (stats.byRating[f.rating] !== undefined) {
      stats.byRating[f.rating]++;
    }
  });

  // 计算平均评分
  if (feedbacks.length > 0) {
    const totalRating = feedbacks.reduce((sum, f) => sum + f.rating, 0);
    stats.averageRating = (totalRating / feedbacks.length).toFixed(1);
  }

  return stats;
}

/**
 * 删除反馈
 * @param {number} feedbackId 反馈ID
 * @returns {boolean} 是否成功
 */
function deleteFeedback(feedbackId) {
  const feedbackData = getFeedbackData();
  const index = feedbackData.feedbacks.findIndex(f => f.id === feedbackId);

  if (index === -1) {
    return false;
  }

  feedbackData.feedbacks.splice(index, 1);
  saveFeedbackData(feedbackData);
  return true;
}

/**
 * 导出反馈数据为 JSON
 * @returns {string} JSON 字符串
 */
function exportFeedbackData() {
  const feedbackData = getFeedbackData();
  return JSON.stringify(feedbackData, null, 2);
}

/**
 * 从 JSON 导入反馈数据
 * @param {string} jsonString JSON 字符串
 * @returns {Object} { success: boolean, message: string }
 */
function importFeedbackData(jsonString) {
  try {
    const feedbackData = JSON.parse(jsonString);

    if (!feedbackData || !Array.isArray(feedbackData.feedbacks)) {
      return {
        success: false,
        message: 'JSON 格式错误（缺少 feedbacks 数组）'
      };
    }

    saveFeedbackData(feedbackData);
    return {
      success: true,
      message: '反馈数据已导入'
    };
  } catch (error) {
    console.error('导入反馈数据失败:', error);
    return {
      success: false,
      message: 'JSON 解析失败：' + error.message
    };
  }
}

/**
 * 清空所有反馈数据
 */
function clearAllFeedbackData() {
  localStorage.removeItem(FEEDBACK_STORAGE_KEY);
}

/**
 * 显示反馈表单
 */
function showFeedbackForm() {
  // 检查是否已存在反馈表单
  const existingForm = document.getElementById('feedback-form');
  if (existingForm) {
    existingForm.remove();
    return;
  }

  // 创建反馈表单
  const form = document.createElement('div');
  form.id = 'feedback-form';
  form.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 320px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 10000;
    animation: slideUp 0.3s ease-out;
  `;

  form.innerHTML = `
    <h3 style="margin: 0 0 12px 0; color: #333;">💬 反馈建议</h3>
    
    <div style="margin-bottom: 12px;">
      <label style="display: block; margin-bottom: 4px; font-size: 14px;">反馈类型</label>
      <select id="feedback-type" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        <option value="${FEEDBACK_TYPE.BUG}">问题反馈</option>
        <option value="${FEEDBACK_TYPE.SUGGESTION}">功能建议</option>
        <option value="${FEEDBACK_TYPE.FEATURE}">新功能需求</option>
      </select>
    </div>
    
    <div style="margin-bottom: 12px;">
      <label style="display: block; margin-bottom: 4px; font-size: 14px;">评分</label>
      <div style="display: flex; gap: 4px;">
        ${[1,2,3,4,5].map(i => `
          <button type="button" class="star" data-rating="${i}" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: #f5f5f5;">
            ⭐
          </button>
        `).join('')}
      </div>
    </div>
    
    <div style="margin-bottom: 12px;">
      <label style="display: block; margin-bottom: 4px; font-size: 14px;">反馈内容</label>
      <textarea id="feedback-content" style="width: 100%; height: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; resize: vertical;" placeholder="请详细描述您的建议或问题..."></textarea>
    </div>
    
    <div style="margin-bottom: 12px;">
      <label style="display: block; margin-bottom: 4px; font-size: 14px;">邮箱（可选，用于回复）</label>
      <input type="email" id="feedback-email" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="your@email.com">
    </div>
    
    <div style="display: flex; gap: 8px;">
      <button id="submit-feedback" style="flex: 1; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">提交</button>
      <button id="close-feedback" style="flex: 1; padding: 8px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">取消</button>
    </div>
  `;

  document.body.appendChild(form);

  // 添加CSS样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    .star.active {
      background: #FFD700;
      color: #333;
    }
  `;
  document.head.appendChild(style);

  // 添加事件监听
  let currentRating = 0;
  
  // 星级评分
  form.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', (e) => {
      currentRating = parseInt(e.target.dataset.rating);
      form.querySelectorAll('.star').forEach((s, i) => {
        s.classList.toggle('active', i < currentRating);
      });
    });
  });

  // 提交反馈
  form.querySelector('#submit-feedback').addEventListener('click', () => {
    const type = form.querySelector('#feedback-type').value;
    const content = form.querySelector('#feedback-content').value;
    const email = form.querySelector('#feedback-email').value;
    
    const result = submitFeedback(type, content, currentRating, email);
    
    // 显示结果
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      margin-top: 12px;
      padding: 8px;
      border-radius: 4px;
      text-align: center;
      font-size: 14px;
    `;
    
    if (result.success) {
      messageDiv.style.backgroundColor = '#E8F5E9';
      messageDiv.style.color = '#2E7D32';
      messageDiv.textContent = result.message;
    } else {
      messageDiv.style.backgroundColor = '#FFEBEE';
      messageDiv.style.color = '#C62828';
      messageDiv.textContent = result.message;
    }
    
    form.appendChild(messageDiv);
    
    // 3秒后关闭
    setTimeout(() => {
      form.remove();
    }, 3000);
  });

  // 关闭表单
  form.querySelector('#close-feedback').addEventListener('click', () => {
    form.remove();
  });
}

/**
 * 初始化反馈功能
 */
function initFeedback() {
  // 添加浮动反馈按钮
  const feedbackBtn = document.createElement('button');
  feedbackBtn.id = 'feedback-float-btn';
  feedbackBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #4CAF50;
    color: white;
    border: none;
    font-size: 20px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    z-index: 9999;
    transition: transform 0.2s;
  `;
  feedbackBtn.innerHTML = '💬';
  feedbackBtn.title = '反馈建议';
  feedbackBtn.addEventListener('click', showFeedbackForm);
  
  document.body.appendChild(feedbackBtn);

  // 添加悬浮效果
  feedbackBtn.addEventListener('mouseenter', () => {
    feedbackBtn.style.transform = 'scale(1.1)';
  });
  
  feedbackBtn.addEventListener('mouseleave', () => {
    feedbackBtn.style.transform = 'scale(1)';
  });
}

// 初始化反馈功能
// 本文件提供 submitFeedback/setRating 数据层；浮动按钮和弹窗 UI 由 index.html + app.js 负责，
// 这里不再重复注入第二套按钮+表单（曾导致页面右下角出现两个叠加的反馈按钮）。
if (typeof document !== 'undefined' && !document.getElementById('feedbackFloatBtn')) {
  initFeedback();
}

// 导出公共 API
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FEEDBACK_STORAGE_KEY,
    FEEDBACK_TYPE,
    initializeFeedbackData,
    getFeedbackData,
    saveFeedbackData,
    submitFeedback,
    getFeedbackList,
    getFeedbackStats,
    deleteFeedback,
    exportFeedbackData,
    importFeedbackData,
    clearAllFeedbackData,
    showFeedbackForm,
    initFeedback
  };
}
