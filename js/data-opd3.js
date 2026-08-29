/* ============================================================
 * 词汇生长 — 图解词库数据 (js/data-opd3.js)
 * 来源：Oxford Picture Dictionary 3rd ed.（OPD3）主题词汇
 * 处理：按页提取 → OCR 噪音清洗（"A I B" 取 A）→ 去重 → 人工核对中文释义
 * 定位：作为「词群学习法」的场景词群扩充，用户按主题浏览、一键收词进自己的词库
 * 字段：w 英文 / zh 中文（复习中→英用）
 * ============================================================ */
var VG_OPD3 = (function () {
  'use strict';

  var THEMES = [
    { id: 'opd-smalltalk', name: '社交开场', en: 'Small Talk', page: 19, words: [
      { w: 'start a conversation', zh: '开始一段对话' },
      { w: 'make small talk', zh: '闲聊、寒暄' },
      { w: 'compliment someone', zh: '夸奖某人' },
      { w: 'thank someone', zh: '感谢某人' },
      { w: 'offer something', zh: '主动提供帮助' },
      { w: 'refuse an offer', zh: '婉拒好意' },
      { w: 'apologize', zh: '道歉' },
      { w: 'accept an apology', zh: '接受道歉' },
      { w: 'invite someone', zh: '邀请某人' },
      { w: 'accept an invitation', zh: '接受邀请' },
      { w: 'decline an invitation', zh: '婉拒邀请' },
      { w: 'agree', zh: '同意' },
      { w: 'disagree', zh: '不同意' },
      { w: 'explain something', zh: '解释某事' },
      { w: 'check your understanding', zh: '确认自己理解对了' }
    ]},
    { id: 'opd-weather', name: '天气', en: 'Weather', page: 20, words: [
      { w: 'Fahrenheit', zh: '华氏温度' },
      { w: 'Celsius', zh: '摄氏温度' },
      { w: 'hot', zh: '热的' },
      { w: 'warm', zh: '温暖的' },
      { w: 'cool', zh: '凉爽的' },
      { w: 'cold', zh: '冷的' },
      { w: 'freezing', zh: '极冷的' },
      { w: 'sunny', zh: '晴朗的' },
      { w: 'cloudy', zh: '多云的' },
      { w: 'humid', zh: '潮湿的' },
      { w: 'rain', zh: '雨' },
      { w: 'snow', zh: '雪' },
      { w: 'windy', zh: '有风的' },
      { w: 'icy', zh: '结冰的' },
      { w: 'thunderstorm', zh: '雷暴' },
      { w: 'lightning', zh: '闪电' }
    ]},
    { id: 'opd-opposites', name: '反义形容词', en: 'Opposites', page: 30, words: [
      { w: 'hard chair', zh: '硬椅子' },
      { w: 'soft chair', zh: '软椅子' },
      { w: 'thick book', zh: '厚书' },
      { w: 'thin book', zh: '薄书' },
      { w: 'full glass', zh: '满杯' },
      { w: 'empty glass', zh: '空杯' },
      { w: 'heavy box', zh: '重箱子' },
      { w: 'light box', zh: '轻箱子' },
      { w: 'good news', zh: '好消息' },
      { w: 'bad news', zh: '坏消息' },
      { w: 'expensive ring', zh: '昂贵的戒指' },
      { w: 'cheap ring', zh: '便宜的戒指' }
    ]},
    { id: 'opd-family', name: '家庭成员', en: 'Family', page: 41, words: [
      { w: 'grandmother', zh: '奶奶/外婆' },
      { w: 'grandfather', zh: '爷爷/外公' },
      { w: 'mother', zh: '妈妈' },
      { w: 'father', zh: '爸爸' },
      { w: 'sister', zh: '姐妹' },
      { w: 'brother', zh: '兄弟' },
      { w: 'aunt', zh: '姑姑/姨妈' },
      { w: 'uncle', zh: '叔叔/舅舅' },
      { w: 'cousin', zh: '堂/表兄弟姐妹' },
      { w: 'mother-in-law', zh: '岳母/婆婆' },
      { w: 'father-in-law', zh: '岳父/公公' },
      { w: 'wife', zh: '妻子' },
      { w: 'husband', zh: '丈夫' },
      { w: 'daughter', zh: '女儿' },
      { w: 'son', zh: '儿子' },
      { w: 'niece', zh: '侄女/外甥女' },
      { w: 'nephew', zh: '侄子/外甥' }
    ]},
    { id: 'opd-morning', name: '早晨日常', en: 'Morning Routine', page: 45, words: [
      { w: 'wake up', zh: '醒来' },
      { w: 'get up', zh: '起床' },
      { w: 'take a shower', zh: '冲澡' },
      { w: 'get dressed', zh: '穿好衣服' },
      { w: 'eat breakfast', zh: '吃早饭' },
      { w: 'make lunch', zh: '做午饭' },
      { w: 'pick up the kids', zh: '接孩子' },
      { w: 'drive to work', zh: '开车上班' },
      { w: 'be in class', zh: '在上课' },
      { w: 'work', zh: '工作' },
      { w: 'leave work', zh: '下班' }
    ]},
    { id: 'opd-evening', name: '晚间日常', en: 'Evening Routine', page: 46, words: [
      { w: 'come home', zh: '到家' },
      { w: 'cook dinner', zh: '做晚饭' },
      { w: 'have dinner', zh: '吃晚饭' },
      { w: 'clean the house', zh: '打扫房间' },
      { w: 'do homework', zh: '做作业' },
      { w: 'check email', zh: '看邮件' },
      { w: 'exercise', zh: '锻炼' },
      { w: 'relax', zh: '放松' },
      { w: 'read the paper', zh: '读报' },
      { w: 'watch TV', zh: '看电视' },
      { w: 'go to bed', zh: '上床' },
      { w: 'go to sleep', zh: '入睡' }
    ]},
    { id: 'opd-feelings', name: '身体感受', en: 'How You Feel', page: 49, words: [
      { w: 'hungry', zh: '饿' },
      { w: 'full', zh: '饱' },
      { w: 'thirsty', zh: '渴' },
      { w: 'sleepy', zh: '困' },
      { w: 'sick', zh: '不舒服' },
      { w: 'well', zh: '安好' },
      { w: 'nervous', zh: '紧张' },
      { w: 'worried', zh: '担心' },
      { w: 'in pain', zh: '疼痛' },
      { w: 'hurt', zh: '受伤' },
      { w: 'lonely', zh: '孤独' },
      { w: 'in love', zh: '恋爱中' }
    ]},
    { id: 'opd-emotions', name: '情绪', en: 'Emotions', page: 50, words: [
      { w: 'happy', zh: '开心' },
      { w: 'sad', zh: '难过' },
      { w: 'excited', zh: '兴奋' },
      { w: 'tired', zh: '累' },
      { w: 'bored', zh: '无聊' },
      { w: 'proud', zh: '自豪' },
      { w: 'angry', zh: '生气' },
      { w: 'upset', zh: '心烦' },
      { w: 'scared', zh: '害怕' },
      { w: 'surprised', zh: '惊讶' },
      { w: 'embarrassed', zh: '尴尬' },
      { w: 'confused', zh: '困惑' },
      { w: 'frustrated', zh: '沮丧' },
      { w: 'homesick', zh: '想家' }
    ]},
    { id: 'opd-kitchen', name: '厨房餐具', en: 'In the Kitchen', page: 62, words: [
      { w: 'dish', zh: '盘子' },
      { w: 'bowl', zh: '碗' },
      { w: 'coffee mug', zh: '马克杯' },
      { w: 'fork', zh: '叉子' },
      { w: 'knife', zh: '刀' },
      { w: 'spoon', zh: '勺子' },
      { w: 'napkin', zh: '餐巾' },
      { w: 'teacup', zh: '茶杯' },
      { w: 'teapot', zh: '茶壶' },
      { w: 'tablecloth', zh: '桌布' },
      { w: 'tray', zh: '托盘' },
      { w: 'vase', zh: '花瓶' },
      { w: 'platter', zh: '大浅盘' },
      { w: 'sugar bowl', zh: '糖罐' }
    ]},
    { id: 'opd-food', name: '常见食物', en: 'Food', page: 73, words: [
      { w: 'fish', zh: '鱼' },
      { w: 'meat', zh: '肉' },
      { w: 'chicken', zh: '鸡肉' },
      { w: 'cheese', zh: '奶酪' },
      { w: 'milk', zh: '牛奶' },
      { w: 'butter', zh: '黄油' },
      { w: 'eggs', zh: '鸡蛋' },
      { w: 'vegetables', zh: '蔬菜' }
    ]},
    { id: 'opd-clothes', name: '日常服装', en: 'Clothes', page: 93, words: [
      { w: 'shirt', zh: '衬衫' },
      { w: 'T-shirt', zh: 'T恤' },
      { w: 'dress', zh: '连衣裙' },
      { w: 'socks', zh: '袜子' },
      { w: 'sneakers', zh: '运动鞋' },
      { w: 'baseball cap', zh: '棒球帽' },
      { w: 'tie', zh: '领带' }
    ]},
    { id: 'opd-body', name: '身体部位', en: 'The Body', page: 111, words: [
      { w: 'head', zh: '头' },
      { w: 'hair', zh: '头发' },
      { w: 'neck', zh: '脖子' },
      { w: 'chest', zh: '胸口' },
      { w: 'back', zh: '后背' },
      { w: 'nose', zh: '鼻子' },
      { w: 'mouth', zh: '嘴' },
      { w: 'foot', zh: '脚' }
    ]},
    { id: 'opd-aches', name: '疼痛不适', en: 'Aches & Pains', page: 117, words: [
      { w: 'headache', zh: '头疼' },
      { w: 'stomachache', zh: '胃疼' },
      { w: 'toothache', zh: '牙疼' },
      { w: 'backache', zh: '背疼' },
      { w: 'earache', zh: '耳朵疼' },
      { w: 'sore throat', zh: '嗓子疼' },
      { w: 'fever', zh: '发烧' },
      { w: 'cough', zh: '咳嗽' },
      { w: 'bruise', zh: '淤青' },
      { w: 'cut', zh: '伤口' },
      { w: 'sunburn', zh: '晒伤' },
      { w: 'sprained ankle', zh: '扭伤脚踝' },
      { w: 'bloody nose', zh: '流鼻血' },
      { w: 'feel dizzy', zh: '头晕' }
    ]},
    { id: 'opd-places', name: '城市场所', en: 'Places in Town', page: 134, words: [
      { w: 'hospital', zh: '医院' },
      { w: 'gas station', zh: '加油站' },
      { w: 'post office', zh: '邮局' },
      { w: 'fire station', zh: '消防站' },
      { w: 'courthouse', zh: '法院' },
      { w: 'restaurant', zh: '餐厅' },
      { w: 'library', zh: '图书馆' }
    ]},
    { id: 'opd-transport', name: '交通工具', en: 'Transportation', page: 161, words: [
      { w: 'car', zh: '小汽车' },
      { w: 'taxi', zh: '出租车' },
      { w: 'motorcycle', zh: '摩托车' },
      { w: 'truck', zh: '卡车' },
      { w: 'train', zh: '火车' },
      { w: 'passenger', zh: '乘客' },
      { w: 'street', zh: '街道' }
    ]},
    { id: 'opd-airport', name: '机场出行', en: 'At the Airport', page: 172, words: [
      { w: 'gate', zh: '登机口' },
      { w: 'boarding area', zh: '登机区' },
      { w: 'pilot', zh: '机长' },
      { w: 'flight attendant', zh: '空乘' },
      { w: 'cockpit', zh: '驾驶舱' },
      { w: 'turbulence', zh: '气流颠簸' },
      { w: 'baggage carousel', zh: '行李转盘' },
      { w: 'luggage', zh: '行李' },
      { w: 'customs officer', zh: '海关人员' },
      { w: 'emergency exit', zh: '紧急出口' },
      { w: 'tray table', zh: '小桌板' },
      { w: 'on time', zh: '准点' },
      { w: 'delayed', zh: '延误' }
    ]},
    { id: 'opd-jobs', name: '职业', en: 'Jobs', page: 177, words: [
      { w: 'accountant', zh: '会计' },
      { w: 'actor', zh: '演员' },
      { w: 'architect', zh: '建筑师' },
      { w: 'artist', zh: '艺术家' },
      { w: 'babysitter', zh: '临时保姆' },
      { w: 'baker', zh: '面包师' },
      { w: 'butcher', zh: '肉贩' },
      { w: 'carpenter', zh: '木匠' },
      { w: 'administrative assistant', zh: '行政助理' },
      { w: 'auto mechanic', zh: '汽车修理工' },
      { w: 'business owner', zh: '企业主' },
      { w: 'businessperson', zh: '商人' },
      { w: 'cashier', zh: '收银员' },
      { w: 'childcare worker', zh: '育儿工作者' },
      { w: 'assembler', zh: '装配工' },
      { w: 'appliance repairperson', zh: '家电修理工' }
    ]},
    { id: 'opd-fun', name: '娱乐场所', en: 'Fun Places', page: 235, words: [
      { w: 'zoo', zh: '动物园' },
      { w: 'movies', zh: '电影院' },
      { w: 'botanical garden', zh: '植物园' },
      { w: 'bowling alley', zh: '保龄球馆' },
      { w: 'rock concert', zh: '摇滚演唱会' },
      { w: 'aquarium', zh: '水族馆' },
      { w: 'swap meet', zh: '跳蚤市场' }
    ]},
    { id: 'opd-outdoors', name: '户外露营', en: 'Outdoors', page: 239, words: [
      { w: 'hiking', zh: '徒步' },
      { w: 'fishing', zh: '钓鱼' },
      { w: 'camping', zh: '露营' },
      { w: 'boating', zh: '划船' },
      { w: 'horseback riding', zh: '骑马' },
      { w: 'tent', zh: '帐篷' },
      { w: 'backpack', zh: '背包' },
      { w: 'campfire', zh: '篝火' },
      { w: 'camping stove', zh: '露营炉' },
      { w: 'matches', zh: '火柴' },
      { w: 'sleeping bag', zh: '睡袋' },
      { w: 'lantern', zh: '提灯' },
      { w: 'rope', zh: '绳子' },
      { w: 'canteen', zh: '水壶' }
    ]},
    { id: 'opd-sports', name: '运动', en: 'Sports', page: 242, words: [
      { w: 'basketball', zh: '篮球' },
      { w: 'soccer', zh: '足球' },
      { w: 'baseball', zh: '棒球' },
      { w: 'football', zh: '美式橄榄球' },
      { w: 'volleyball', zh: '排球' },
      { w: 'ice hockey', zh: '冰球' },
      { w: 'team', zh: '队伍' },
      { w: 'player', zh: '球员' },
      { w: 'coach', zh: '教练' },
      { w: 'score', zh: '得分' },
      { w: 'fan', zh: '球迷' },
      { w: 'court', zh: '球场' }
    ]}
  ];

  var wordCount = 0;
  THEMES.forEach(function (t) { wordCount += t.words.length; });

  return {
    THEMES: THEMES,
    themeCount: THEMES.length,
    wordCount: wordCount
  };
})();

if (typeof window !== 'undefined') window.VG_OPD3 = VG_OPD3;
if (typeof module !== 'undefined' && module.exports) module.exports = VG_OPD3;
