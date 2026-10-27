/* ============================================================
 * 词块生长 JobChunks — 职场词块库（数据层）
 * 结构：方向 Track → 场景 Scenario → 词块 Chunk（原子学习单元）
 * 依据：Lexical Approach（Lewis）+ TBLT/ESP + 语料库搭配校准
 * 每条词块服务于一个可验收任务（can-do），先听懂看懂、再说出来
 * 字段：id / track / sc / chunk / zh / level(CEFR) / ex 例句 / exzh
 *       trap 中式英语易错点(❌→✅) / reg 语域(spoken|email|meeting|formal)
 * ============================================================ */
window.VG_CHUNKS = {

  TRACKS: [
    { id: 'interview', icon: '🎤', name: '英语面试突围', en: 'Interview Ready',
      desc: '所有含英语口测的岗位通用：从自我介绍到谈薪，一套词块走完一场面试' },
    { id: 'ecommerce', icon: '🛒', name: '跨境电商运营', en: 'Cross-border E-commerce',
      desc: '亚马逊/独立站/DTC 岗位日常：Listing、买家邮件、广告投放、运营站会' },
    { id: 'global', icon: '🌏', name: '出海业务', en: 'Going Global',
      desc: '出海企业海外 BD 与协作：客户开发信、视频会议、报价谈判、展会接待' }
  ],

  SCENARIOS: {
    interview: [
      { id: 'self-intro',    name: '自我介绍',   task: '能完成 60 秒英文自我介绍' },
      { id: 'project-story', name: 'STAR 讲项目', task: '能按 STAR 结构讲清一个项目' },
      { id: 'strengths',     name: '优缺点问答', task: '能自然说出优势与改进中的短板' },
      { id: 'why-us',        name: '择业动机',   task: '能说清为什么选这家公司这个岗' },
      { id: 'behavioral',    name: '行为面试',   task: '能接住 Tell me about a time 类问题' },
      { id: 'salary',        name: '谈薪环节',   task: '能礼貌探区间并守住期望值' },
      { id: 'reverse',       name: '反问环节',   task: '能问出让面试官加分的问题' },
      { id: 'video',         name: '视频面试应变', task: '能应对卡顿/没听清等突发状况' }
    ],
    ecommerce: [
      { id: 'listing',   name: 'Listing 优化',  task: '能用运营术语讨论标题与五点描述' },
      { id: 'buyer',     name: '买家邮件',      task: '能回复咨询/差评/退款邮件' },
      { id: 'supplier',  name: '供应商沟通',    task: '能谈 MOQ、交期、样品费' },
      { id: 'review',    name: '差评处理',      task: '能安抚买家并推动改评' },
      { id: 'ads',       name: '广告投放',      task: '能汇报 ACOS 并调整打法' },
      { id: 'inventory', name: '库存物流',      task: '能跟进补货与断货风险' },
      { id: 'standup',   name: '运营站会',      task: '能用数字汇报周环比进展' },
      { id: 'promo',     name: '大促策划',      task: '能讨论 Prime Day 打法' }
    ],
    global: [
      { id: 'outreach',   name: '海外客户开发', task: '能写出发达国家客户愿意回的开发信' },
      { id: 'meetings',   name: '视频会议',     task: '能在英文会上接话、确认、收尾' },
      { id: 'collab',     name: '跨团队协作',   task: '能用地道短语跟进跨时区协作' },
      { id: 'tradeshow',  name: '展会接待',     task: '能在展位完成接待与留资' },
      { id: 'negotiation', name: '报价谈判',    task: '能探对方目标价并守住底线' },
      { id: 'report',     name: '周报汇报',     task: '能按 highlights/next steps 汇报' },
      { id: 'smalltalk',  name: '职场闲聊',     task: '能与海外同事寒暄破冰' },
      { id: 'escalation', name: '危机沟通',     task: '能在出问题时稳住客户并同步进展' }
    ]
  },

  CHUNKS: [
    /* ============ A. 英语面试突围 ============ */
    /* 自我介绍 */
    { id: 'in-si-1', track: 'interview', sc: 'self-intro', chunk: "I'm currently working as…", zh: '我目前在……担任', level: 'B1', ex: "I'm currently working as an operations specialist at a trading company.", exzh: '我目前在一家贸易公司做运营专员。', trap: '', reg: 'spoken' },
    { id: 'in-si-2', track: 'interview', sc: 'self-intro', chunk: "I have three years of experience in…", zh: '我在……方面有三年经验', level: 'B1', ex: "I have three years of experience in cross-border e-commerce.", exzh: '我在跨境电商方面有三年经验。', trap: '❌ I have three years experiences → ✅ three years of experience（experience 不可数）', reg: 'spoken' },
    { id: 'in-si-3', track: 'interview', sc: 'self-intro', chunk: "My main responsibility is…", zh: '我的主要职责是……', level: 'B1', ex: "My main responsibility is managing our Amazon US store.", exzh: '我的主要职责是管理我们的亚马逊美国站。', reg: 'spoken' },
    { id: 'in-si-4', track: 'interview', sc: 'self-intro', chunk: "I'm looking to grow into…", zh: '我希望成长为……', level: 'B2', ex: "I'm looking to grow into a team lead role in the next two years.", exzh: '我希望两年内成长为团队负责人。', reg: 'spoken' },
    { id: 'in-si-5', track: 'interview', sc: 'self-intro', chunk: "That's a little about my background.", zh: '这就是我的大致背景', level: 'B1', ex: "That's a little about my background — happy to go deeper on any part.", exzh: '这就是我的大致背景——任何部分都可以展开讲。', reg: 'spoken' },
    /* STAR 讲项目 */
    { id: 'in-ps-1', track: 'interview', sc: 'project-story', chunk: "We ran into a problem where…", zh: '我们遇到了一个问题……', level: 'B2', ex: "We ran into a problem where our main keyword dropped to page three.", exzh: '我们遇到核心关键词掉到第三页的问题。', reg: 'spoken' },
    { id: 'in-ps-2', track: 'interview', sc: 'project-story', chunk: "I took the initiative to…", zh: '我主动牵头……', level: 'B2', ex: "I took the initiative to rebuild the listing and relaunch our ads.", exzh: '我主动重写 Listing 并重启了广告。', trap: '❌ I initiative to… → ✅ I took the initiative to…（initiative 是名词）', reg: 'spoken' },
    { id: 'in-ps-3', track: 'interview', sc: 'project-story', chunk: "As a result, we saw…", zh: '结果我们实现了……', level: 'B1', ex: "As a result, we saw a 30% lift in conversion within a month.", exzh: '结果一个月内转化率提升了 30%。', reg: 'spoken' },
    { id: 'in-ps-4', track: 'interview', sc: 'project-story', chunk: "The key challenge was…", zh: '最关键的挑战是……', level: 'B2', ex: "The key challenge was coordinating three time zones.", exzh: '最关键的挑战是协调三个时区。', reg: 'spoken' },
    { id: 'in-ps-5', track: 'interview', sc: 'project-story', chunk: "What I learned from that was…", zh: '我从中学到的是……', level: 'B2', ex: "What I learned from that was to validate ideas with data first.", exzh: '我从中学到的是先用数据验证想法。', reg: 'spoken' },
    /* 优缺点 */
    { id: 'in-sw-1', track: 'interview', sc: 'strengths', chunk: "My biggest strength is…", zh: '我最大的优势是……', level: 'B1', ex: "My biggest strength is staying calm under tight deadlines.", exzh: '我最大的优势是赶工期时能保持冷静。', reg: 'spoken' },
    { id: 'in-sw-2', track: 'interview', sc: 'strengths', chunk: "One area I'm improving is…", zh: '我正在改进的一点是……', level: 'B2', ex: "One area I'm improving is delegating instead of doing everything myself.", exzh: '我正在改进的一点是学会授权而不是事事亲力亲为。', reg: 'spoken' },
    { id: 'in-sw-3', track: 'interview', sc: 'strengths', chunk: "I've been working on…", zh: '我一直在练习/改进……', level: 'B1', ex: "I've been working on my public speaking by presenting at weekly meetings.", exzh: '我通过在周会上做分享来练习公开表达。', reg: 'spoken' },
    { id: 'in-sw-4', track: 'interview', sc: 'strengths', chunk: "I'm a quick learner when it comes to…", zh: '在……方面我上手很快', level: 'B1', ex: "I'm a quick learner when it comes to new tools and platforms.", exzh: '在新工具和新平台上我上手很快。', reg: 'spoken' },
    { id: 'in-sw-5', track: 'interview', sc: 'strengths', chunk: "I tend to…, so I've built habits to manage it.", zh: '我容易……，所以我建立了应对习惯', level: 'B2', ex: "I tend to over-polish details, so I set time boxes for each task.", exzh: '我容易在细节上过度打磨，所以给每个任务设了时间盒。', reg: 'spoken' },
    /* 择业动机 */
    { id: 'in-wu-1', track: 'interview', sc: 'why-us', chunk: "I've been following your company's…", zh: '我一直在关注贵公司的……', level: 'B2', ex: "I've been following your company's expansion into Europe.", exzh: '我一直在关注贵公司的欧洲扩张。', reg: 'spoken' },
    { id: 'in-wu-2', track: 'interview', sc: 'why-us', chunk: "What drew me to this role is…", zh: '吸引我投这个岗位的是……', level: 'B2', ex: "What drew me to this role is the chance to own the US market end to end.", exzh: '吸引我的是能端到端负责美国市场。', reg: 'spoken' },
    { id: 'in-wu-3', track: 'interview', sc: 'why-us', chunk: "I see a strong fit between… and…", zh: '我觉得我的……和贵司的……非常匹配', level: 'B2', ex: "I see a strong fit between my Amazon experience and your DTC push.", exzh: '我的亚马逊经验和你们的 DTC 布局非常匹配。', reg: 'spoken' },
    { id: 'in-wu-4', track: 'interview', sc: 'why-us', chunk: "I'd love to contribute to…", zh: '我很想为……出一份力', level: 'B1', ex: "I'd love to contribute to your new product lines.", exzh: '我很想为你们的新产品线出一份力。', trap: '❌ contribute to do → ✅ contribute to + 名词/doing', reg: 'spoken' },
    { id: 'in-wu-5', track: 'interview', sc: 'why-us', chunk: "This role feels like a natural next step for me.", zh: '这个岗位对我来说是顺理成章的下一步', level: 'B2', ex: "After three years in ops, this role feels like a natural next step for me.", exzh: '做了三年运营，这个岗位是顺理成章的下一步。', reg: 'spoken' },
    /* 行为面试 */
    { id: 'in-bh-1', track: 'interview', sc: 'behavioral', chunk: "In that situation, I…", zh: '在当时那种情况下，我……', level: 'B1', ex: "In that situation, I escalated to my manager right away.", exzh: '在当时那种情况下，我立刻上报了经理。', reg: 'spoken' },
    { id: 'in-bh-2', track: 'interview', sc: 'behavioral', chunk: "I made sure to…", zh: '我特意确保了……', level: 'B2', ex: "I made sure to document every step so the team could replicate it.", exzh: '我特意把每一步都记录下来，方便团队复用。', reg: 'spoken' },
    { id: 'in-bh-3', track: 'interview', sc: 'behavioral', chunk: "I communicated with… to align on…", zh: '我和……沟通对齐了……', level: 'B2', ex: "I communicated with the supplier to align on a new timeline.", exzh: '我和供应商沟通对齐了新的时间表。', reg: 'spoken' },
    { id: 'in-bh-4', track: 'interview', sc: 'behavioral', chunk: "Looking back, I would…", zh: '现在回头看，我会……', level: 'B2', ex: "Looking back, I would involve the design team earlier.", exzh: '回头看，我会更早拉设计团队进来。', reg: 'spoken' },
    { id: 'in-bh-5', track: 'interview', sc: 'behavioral', chunk: "The outcome was that…", zh: '最终结果是……', level: 'B1', ex: "The outcome was that we recovered the account in two weeks.", exzh: '最终结果是两周内恢复了账号。', reg: 'spoken' },
    /* 谈薪 */
    { id: 'in-sa-1', track: 'interview', sc: 'salary', chunk: "Could you share the range for this role?", zh: '方便介绍一下这个岗位的薪资范围吗？', level: 'B2', ex: "Before I give a number, could you share the range for this role?", exzh: '在我报数之前，方便介绍一下这个岗位的薪资范围吗？', reg: 'spoken' },
    { id: 'in-sa-2', track: 'interview', sc: 'salary', chunk: "Based on my experience, I'm looking for…", zh: '结合我的经验，我的期望是……', level: 'B2', ex: "Based on my experience, I'm looking for something in the 20 to 25K range.", exzh: '结合我的经验，我的期望在 20K 到 25K 之间。', reg: 'spoken' },
    { id: 'in-sa-3', track: 'interview', sc: 'salary', chunk: "I'm open to discussing the total package.", zh: '整体待遇包都可以谈', level: 'B2', ex: "I'm flexible on base salary — I'm open to discussing the total package.", exzh: '底薪可以灵活谈——整体待遇包都可以聊。', reg: 'spoken' },
    { id: 'in-sa-4', track: 'interview', sc: 'salary', chunk: "Is that within your budget?", zh: '这在我的预算/你们的范围内吗？', level: 'B1', ex: "I'm targeting 25K — is that within your budget?", exzh: '我的目标是 25K——这在你们预算内吗？', reg: 'spoken' },
    { id: 'in-sa-5', track: 'interview', sc: 'salary', chunk: "I'd like to be fair to both sides.", zh: '我希望对双方都公平', level: 'B2', ex: "I'd like to be fair to both sides and find a number that works.", exzh: '我希望对双方都公平，找一个都能接受的数字。', reg: 'spoken' },
    /* 反问环节 */
    { id: 'in-rv-1', track: 'interview', sc: 'reverse', chunk: "Could you walk me through a typical day?", zh: '能讲讲这个岗位典型的一天吗？', level: 'B1', ex: "Could you walk me through a typical day in this role?", exzh: '能讲讲这个岗位典型的一天是怎样的吗？', reg: 'spoken' },
    { id: 'in-rv-2', track: 'interview', sc: 'reverse', chunk: "How do you measure success in this role?", zh: '这个岗位的成败如何衡量？', level: 'B2', ex: "How do you measure success in this role in the first 90 days?", exzh: '入职前 90 天，这个岗位的成败如何衡量？', reg: 'spoken' },
    { id: 'in-rv-3', track: 'interview', sc: 'reverse', chunk: "What are the biggest challenges facing the team?", zh: '团队目前面临的最大挑战是什么？', level: 'B2', ex: "What are the biggest challenges facing the team right now?", exzh: '团队目前面临的最大挑战是什么？', reg: 'spoken' },
    { id: 'in-rv-4', track: 'interview', sc: 'reverse', chunk: "What does growth look like for someone in this position?", zh: '这个岗位的成长路径是怎样的？', level: 'B2', ex: "What does growth look like for someone in this position after a year?", exzh: '这个岗位一年后通常的成长路径是怎样的？', reg: 'spoken' },
    { id: 'in-rv-5', track: 'interview', sc: 'reverse', chunk: "What's the team's roadmap for this quarter?", zh: '团队这个季度的规划是什么？', level: 'B2', ex: "What's the team's roadmap for this quarter, and where would I fit in?", exzh: '团队这个季度的规划是什么？我会在哪个环节？', reg: 'spoken' },
    /* 视频面试应变 */
    { id: 'in-vd-1', track: 'interview', sc: 'video', chunk: "Sorry, could you repeat that?", zh: '抱歉，能再说一遍吗？', level: 'A2', ex: "Sorry, the audio cut out — could you repeat that?", exzh: '抱歉，声音断了一下——能再说一遍吗？', reg: 'spoken' },
    { id: 'in-vd-2', track: 'interview', sc: 'video', chunk: "You're breaking up a little.", zh: '你的声音有点断断续续', level: 'B1', ex: "You're breaking up a little — can you hear me okay?", exzh: '你的声音有点断续——你们听我清楚吗？', reg: 'spoken' },
    { id: 'in-vd-3', track: 'interview', sc: 'video', chunk: "Let me share my screen.", zh: '我来共享一下屏幕', level: 'B1', ex: "Let me share my screen so I can walk you through my project.", exzh: '我共享屏幕，带你过一遍我的项目。', reg: 'spoken' },
    { id: 'in-vd-4', track: 'interview', sc: 'video', chunk: "That's a great question — let me think for a second.", zh: '好问题——让我想一下', level: 'B1', ex: "That's a great question — let me think for a second.", exzh: '好问题——让我想一下。', reg: 'spoken' },
    { id: 'in-vd-5', track: 'interview', sc: 'video', chunk: "I'll get back to you on that after the interview.", zh: '这个问题我面试后再回复您', level: 'B2', ex: "I don't have the exact figure now — I'll get back to you on that.", exzh: '具体数字我现在不确定——稍后回复您。', reg: 'spoken' },

    /* ============ B. 跨境电商运营 ============ */
    /* Listing 优化 */
    { id: 'ec-li-1', track: 'ecommerce', sc: 'listing', chunk: "best-selling", zh: '畅销的', level: 'B1', ex: "We put the best-selling color first in the variation list.", exzh: '我们把最畅销的颜色放在变体第一位。', reg: 'meeting' },
    { id: 'ec-li-2', track: 'ecommerce', sc: 'listing', chunk: "rank for keywords", zh: '关键词排名', level: 'B2', ex: "The new listing ranks for 12 main keywords after two weeks.", exzh: '新 Listing 两周内 12 个核心关键词有了排名。', trap: '❌ rank the keywords → ✅ rank for keywords（为关键词获得排名）', reg: 'meeting' },
    { id: 'ec-li-3', track: 'ecommerce', sc: 'listing', chunk: "bullet points", zh: '五点描述（产品要点）', level: 'B1', ex: "We rewrote the bullet points to lead with benefits.", exzh: '我们重写了五点描述，把卖点放前面。', reg: 'email' },
    { id: 'ec-li-4', track: 'ecommerce', sc: 'listing', chunk: "conversion rate", zh: '转化率', level: 'B1', ex: "Traffic is fine, but our conversion rate dropped after the price hike.", exzh: '流量还行，但涨价后转化率掉了。', reg: 'meeting' },
    { id: 'ec-li-5', track: 'ecommerce', sc: 'listing', chunk: "A+ content", zh: 'A+ 页面（品牌图文详情）', level: 'B2', ex: "We're building A+ content to lift the premium feel of the page.", exzh: '我们在做 A+ 页面来提升页面高级感。', reg: 'meeting' },
    /* 买家邮件 */
    { id: 'ec-bm-1', track: 'ecommerce', sc: 'buyer', chunk: "Thanks for reaching out.", zh: '感谢您的来信', level: 'B1', ex: "Thanks for reaching out — sorry for the trouble with your order.", exzh: '感谢来信——订单给您带来困扰非常抱歉。', reg: 'email' },
    { id: 'ec-bm-2', track: 'ecommerce', sc: 'buyer', chunk: "Sorry for the inconvenience.", zh: '给您带来不便非常抱歉', level: 'B1', ex: "Sorry for the inconvenience — we'll ship a replacement right away.", exzh: '非常抱歉——我们马上补发一件。', reg: 'email' },
    { id: 'ec-bm-3', track: 'ecommerce', sc: 'buyer', chunk: "Could you provide your order number?", zh: '方便提供一下订单号吗？', level: 'A2', ex: "Could you provide your order number so I can check the status?", exzh: '方便提供订单号吗？我帮您查一下状态。', reg: 'email' },
    { id: 'ec-bm-4', track: 'ecommerce', sc: 'buyer', chunk: "We'll ship a replacement free of charge.", zh: '我们会免费补发一件', level: 'B1', ex: "No need to return it — we'll ship a replacement free of charge.", exzh: '不用退回——我们免费补发一件。', reg: 'email' },
    { id: 'ec-bm-5', track: 'ecommerce', sc: 'buyer', chunk: "refund request", zh: '退款申请', level: 'B1', ex: "I've approved your refund request; it takes 3-5 business days.", exzh: '您的退款申请已通过，3-5 个工作日到账。', reg: 'email' },
    /* 供应商沟通 */
    { id: 'ec-sp-1', track: 'ecommerce', sc: 'supplier', chunk: "MOQ (minimum order quantity)", zh: '最小起订量', level: 'B2', ex: "What's the MOQ if we want two colors?", exzh: '如果做两个颜色，最小起订量是多少？', reg: 'email' },
    { id: 'ec-sp-2', track: 'ecommerce', sc: 'supplier', chunk: "lead time", zh: '生产/交付周期', level: 'B2', ex: "The lead time is 25 days after deposit.", exzh: '定金到账后生产周期 25 天。', reg: 'email' },
    { id: 'ec-sp-3', track: 'ecommerce', sc: 'supplier', chunk: "unit price", zh: '单价', level: 'B1', ex: "Can we get a better unit price at 5,000 pieces?", exzh: '做到 5000 件，单价能再降吗？', reg: 'email' },
    { id: 'ec-sp-4', track: 'ecommerce', sc: 'supplier', chunk: "sample fee", zh: '样品费', level: 'B1', ex: "Is the sample fee refundable after we place the order?", exzh: '下单后样品费可以退吗？', reg: 'email' },
    { id: 'ec-sp-5', track: 'ecommerce', sc: 'supplier', chunk: "quality inspection", zh: '质检', level: 'B2', ex: "We do a random quality inspection before shipment.", exzh: '发货前我们会做随机质检。', reg: 'email' },
    /* 差评处理 */
    { id: 'ec-rv-1', track: 'ecommerce', sc: 'review', chunk: "negative review", zh: '差评', level: 'B1', ex: "We got a negative review over a damaged box.", exzh: '因为包装破损我们收到一条差评。', reg: 'meeting' },
    { id: 'ec-rv-2', track: 'ecommerce', sc: 'review', chunk: "reach out to the buyer", zh: '主动联系买家', level: 'B2', ex: "Let's reach out to the buyer and offer a partial refund.", exzh: '我们主动联系买家，提出部分退款。', reg: 'meeting' },
    { id: 'ec-rv-3', track: 'ecommerce', sc: 'review', chunk: "make it right", zh: '把事情做好/补偿到位', level: 'B2', ex: "We couldn't save the sale, but we made it right with the customer.", exzh: '这单没保住，但我们把补偿做到了位。', reg: 'email' },
    { id: 'ec-rv-4', track: 'ecommerce', sc: 'review', chunk: "verified purchase", zh: '已验证购买（标识）', level: 'B2', ex: "The review is from a verified purchase, so it can't be removed.", exzh: '这条评论来自已验证购买，无法移除。', reg: 'meeting' },
    { id: 'ec-rv-5', track: 'ecommerce', sc: 'review', chunk: "case closed", zh: '案件已结/投诉已关闭', level: 'B2', ex: "Amazon marked the A-to-z case closed in our favor.", exzh: '亚马逊把 A-to-z 索赔判给我们了。', reg: 'email' },
    /* 广告投放 */
    { id: 'ec-ad-1', track: 'ecommerce', sc: 'ads', chunk: "ACOS (advertising cost of sales)", zh: '广告销售成本比', level: 'B2', ex: "Our ACOS dropped from 35% to 22% after narrowing the match types.", exzh: '收窄匹配方式后，ACOS 从 35% 降到 22%。', reg: 'meeting' },
    { id: 'ec-ad-2', track: 'ecommerce', sc: 'ads', chunk: "raise the bid", zh: '提高竞价', level: 'B2', ex: "Raise the bid on the top keyword — it's converting well.", exzh: '把核心词竞价提上去——它转化不错。', reg: 'meeting' },
    { id: 'ec-ad-3', track: 'ecommerce', sc: 'ads', chunk: "impressions", zh: '曝光量', level: 'B1', ex: "Impressions doubled but clicks stayed flat.", exzh: '曝光翻倍但点击没涨。', reg: 'meeting' },
    { id: 'ec-ad-4', track: 'ecommerce', sc: 'ads', chunk: "auto campaign", zh: '自动广告', level: 'B2', ex: "Run an auto campaign first to harvest search terms.", exzh: '先跑自动广告收集搜索词。', reg: 'meeting' },
    { id: 'ec-ad-5', track: 'ecommerce', sc: 'ads', chunk: "negative keywords", zh: '否定关键词', level: 'B2', ex: "Add those as negative keywords to stop wasting spend.", exzh: '把这些加成否定关键词，别浪费预算。', reg: 'meeting' },
    /* 库存物流 */
    { id: 'ec-iv-1', track: 'ecommerce', sc: 'inventory', chunk: "restock", zh: '补货', level: 'B1', ex: "We need to restock before Prime Day or we'll run dry.", exzh: '得在大促前补货，不然会断货。', reg: 'meeting' },
    { id: 'ec-iv-2', track: 'ecommerce', sc: 'inventory', chunk: "out of stock", zh: '断货/缺货', level: 'B1', ex: "Our best seller went out of stock for a week — ranking took a hit.", exzh: '畅销款断货一周——排名掉了。', reg: 'meeting' },
    { id: 'ec-iv-3', track: 'ecommerce', sc: 'inventory', chunk: "FBA shipment", zh: 'FBA 入仓货件', level: 'B2', ex: "The FBA shipment is stuck in customs.", exzh: 'FBA 货件卡在海关了。', reg: 'email' },
    { id: 'ec-iv-4', track: 'ecommerce', sc: 'inventory', chunk: "replenish", zh: '补足库存', level: 'B2', ex: "Replenish weekly based on the sales velocity.", exzh: '按销售速度每周补货。', reg: 'meeting' },
    { id: 'ec-iv-5', track: 'ecommerce', sc: 'inventory', chunk: "customs clearance", zh: '清关', level: 'B2', ex: "Customs clearance took five days longer than expected.", exzh: '清关比预期多花了五天。', reg: 'email' },
    /* 运营站会 */
    { id: 'ec-st-1', track: 'ecommerce', sc: 'standup', chunk: "week over week", zh: '周环比', level: 'B2', ex: "Sales are up 15% week over week.", exzh: '销售额周环比涨了 15%。', reg: 'meeting' },
    { id: 'ec-st-2', track: 'ecommerce', sc: 'standup', chunk: "as of yesterday", zh: '截至昨天', level: 'B1', ex: "As of yesterday, we're at 400 orders this month.", exzh: '截至昨天，本月已出 400 单。', reg: 'meeting' },
    { id: 'ec-st-3', track: 'ecommerce', sc: 'standup', chunk: "action items", zh: '行动项/待办', level: 'B2', ex: "Two action items from today: fix the images and chase the supplier.", exzh: '今天两个行动项：修图、催供应商。', reg: 'meeting' },
    { id: 'ec-st-4', track: 'ecommerce', sc: 'standup', chunk: "push back", zh: '推迟/拒绝（把事情顶回去）', level: 'B2', ex: "Let's push back the launch to next Monday.", exzh: '我们把上线推迟到下周一。', trap: '❌ push the launch behind → ✅ push back the launch', reg: 'meeting' },
    { id: 'ec-st-5', track: 'ecommerce', sc: 'standup', chunk: "sales are trending up/down", zh: '销售趋势向上/下滑', level: 'B1', ex: "Sales are trending down since the price change.", exzh: '调价后销售趋势向下。', reg: 'meeting' },
    /* 大促策划 */
    { id: 'ec-pr-1', track: 'ecommerce', sc: 'promo', chunk: "deal of the day", zh: '当日特惠（促销位）', level: 'B2', ex: "We applied for a deal of the day slot for the launch week.", exzh: '我们为首发周申请了一个当日特惠坑位。', reg: 'meeting' },
    { id: 'ec-pr-2', track: 'ecommerce', sc: 'promo', chunk: "clip the coupon", zh: '领取优惠券', level: 'B2', ex: "Ask buyers to clip the coupon before checkout.", exzh: '引导买家结账前先领券。', reg: 'meeting' },
    { id: 'ec-pr-3', track: 'ecommerce', sc: 'promo', chunk: "lightning deal", zh: '秒杀（限时抢购）', level: 'B2', ex: "Our lightning deal sold out in two hours.", exzh: '我们的秒杀两小时就卖光了。', reg: 'meeting' },
    { id: 'ec-pr-4', track: 'ecommerce', sc: 'promo', chunk: "sell-through rate", zh: '售罄率', level: 'C1', ex: "Target a 70% sell-through rate by the end of the event.", exzh: '活动结束时目标售罄率 70%。', reg: 'meeting' },
    { id: 'ec-pr-5', track: 'ecommerce', sc: 'promo', chunk: "stock up on inventory", zh: '提前备足库存', level: 'B2', ex: "We stocked up on inventory ahead of Prime Day.", exzh: '我们在 Prime Day 前备足了库存。', reg: 'meeting' },

    /* ============ C. 出海业务 ============ */
    /* 海外客户开发 */
    { id: 'gl-ou-1', track: 'global', sc: 'outreach', chunk: "I came across your company while…", zh: '我在……时注意到贵司', level: 'B2', ex: "I came across your company while researching US distributors.", exzh: '我在调研美国经销商时注意到贵司。', reg: 'email' },
    { id: 'gl-ou-2', track: 'global', sc: 'outreach', chunk: "Are you the right person to talk to about…?", zh: '关于……，您是对口的人吗？', level: 'B2', ex: "Are you the right person to talk to about private-label orders?", exzh: '关于贴牌订单，您是对口的人吗？', reg: 'email' },
    { id: 'gl-ou-3', track: 'global', sc: 'outreach', chunk: "I'd love to set up a quick call.", zh: '希望能安排一个简短通话', level: 'B1', ex: "I'd love to set up a quick call this week — 15 minutes is plenty.", exzh: '希望本周能安排个简短通话——15 分钟就够。', reg: 'email' },
    { id: 'gl-ou-4', track: 'global', sc: 'outreach', chunk: "I'm following up on my previous email.", zh: '跟进一下我之前的邮件', level: 'B1', ex: "I'm following up on my previous email about the samples.", exzh: '跟进一下我之前关于样品的邮件。', reg: 'email' },
    { id: 'gl-ou-5', track: 'global', sc: 'outreach', chunk: "cold email", zh: '陌生开发信', level: 'B2', ex: "Our cold email reply rate went from 2% to 8%.", exzh: '我们的开发信回复率从 2% 提到了 8%。', reg: 'meeting' },
    /* 视频会议 */
    { id: 'gl-mt-1', track: 'global', sc: 'meetings', chunk: "Let's get started.", zh: '我们开始吧', level: 'A2', ex: "Everyone's here — let's get started.", exzh: '人都齐了——我们开始吧。', reg: 'meeting' },
    { id: 'gl-mt-2', track: 'global', sc: 'meetings', chunk: "Just to confirm, you're saying…", zh: '确认一下，您的意思是……', level: 'B2', ex: "Just to confirm, you're saying the deadline moves to Friday?", exzh: '确认一下，您的意思是截止日挪到周五？', reg: 'meeting' },
    { id: 'gl-mt-3', track: 'global', sc: 'meetings', chunk: "Let me jump in here.", zh: '我插一句', level: 'B2', ex: "Sorry — let me jump in here with one data point.", exzh: '抱歉——我插一句，补充一个数据。', reg: 'meeting' },
    { id: 'gl-mt-4', track: 'global', sc: 'meetings', chunk: "Can everyone see my screen?", zh: '大家能看到我的屏幕吗？', level: 'A2', ex: "Can everyone see my screen? Great, moving on.", exzh: '大家能看到我的屏幕吗？好，继续。', reg: 'meeting' },
    { id: 'gl-mt-5', track: 'global', sc: 'meetings', chunk: "We're running out of time, so let's wrap up.", zh: '时间差不多了，我们收个尾', level: 'B2', ex: "We're running out of time, so let's wrap up with next steps.", exzh: '时间差不多了，我们用下一步安排收尾。', reg: 'meeting' },
    /* 跨团队协作 */
    { id: 'gl-cl-1', track: 'global', sc: 'collab', chunk: "keep me in the loop", zh: '有进展随时同步我', level: 'B2', ex: "Keep me in the loop on the pricing change.", exzh: '价格有变动随时同步我。', trap: '❌ keep me in the loop of → ✅ keep me in the loop（固定短语）', reg: 'email' },
    { id: 'gl-cl-2', track: 'global', sc: 'collab', chunk: "circle back", zh: '回头再谈/再跟进', level: 'B2', ex: "Let's circle back on this after the demo.", exzh: '演示完我们再回头聊这个。', reg: 'meeting' },
    { id: 'gl-cl-3', track: 'global', sc: 'collab', chunk: "EOD (end of day)", zh: '今天下班前', level: 'B2', ex: "I'll send the numbers by EOD today.", exzh: '数据我今天下班前发你。', reg: 'email' },
    { id: 'gl-cl-4', track: 'global', sc: 'collab', chunk: "on my end", zh: '在我这边', level: 'B1', ex: "Everything works on my end — maybe it's a network issue.", exzh: '我这边一切正常——可能是网络问题。', reg: 'meeting' },
    { id: 'gl-cl-5', track: 'global', sc: 'collab', chunk: "as per our discussion", zh: '按我们讨论的', level: 'B2', ex: "As per our discussion, I've attached the revised quote.", exzh: '按我们讨论的，附上修改后的报价单。', reg: 'email' },
    /* 展会接待 */
    { id: 'gl-ts-1', track: 'global', sc: 'tradeshow', chunk: "How can I help you today?", zh: '今天想了解点什么？', level: 'A2', ex: "Welcome! How can I help you today?", exzh: '欢迎！今天想了解点什么？', reg: 'spoken' },
    { id: 'gl-ts-2', track: 'global', sc: 'tradeshow', chunk: "Let me scan your badge.", zh: '我扫一下您的胸牌（登记）', level: 'B1', ex: "Let me scan your badge so we can send you the catalog.", exzh: '我扫一下您的胸牌，回头把目录发您。', reg: 'spoken' },
    { id: 'gl-ts-3', track: 'global', sc: 'tradeshow', chunk: "We're based in Shenzhen.", zh: '我们公司总部在深圳', level: 'A2', ex: "We're based in Shenzhen with a warehouse in LA.", exzh: '我们总部在深圳，洛杉矶有仓。', reg: 'spoken' },
    { id: 'gl-ts-4', track: 'global', sc: 'tradeshow', chunk: "Here's our catalog — take your time.", zh: '这是我们的目录——您慢慢看', level: 'B1', ex: "Here's our catalog — take your time, I'm right here.", exzh: '这是我们的目录——您慢慢看，我就在旁边。', reg: 'spoken' },
    { id: 'gl-ts-5', track: 'global', sc: 'tradeshow', chunk: "Feel free to reach out anytime.", zh: '随时联系我', level: 'B1', ex: "Feel free to reach out anytime — my WeChat is on the card.", exzh: '随时联系——我微信在名片上。', reg: 'spoken' },
    /* 报价谈判 */
    { id: 'gl-ng-1', track: 'global', sc: 'negotiation', chunk: "What's your target price?", zh: '您的目标价是多少？', level: 'B2', ex: "To save us both time — what's your target price?", exzh: '省点时间——您的目标价是多少？', reg: 'meeting' },
    { id: 'gl-ng-2', track: 'global', sc: 'negotiation', chunk: "volume discount", zh: '批量折扣', level: 'B2', ex: "We can offer a volume discount at 10,000 units.", exzh: '一万件以上我们可以给批量折扣。', reg: 'email' },
    { id: 'gl-ng-3', track: 'global', sc: 'negotiation', chunk: "payment terms", zh: '付款条件', level: 'B2', ex: "Our payment terms are 30% deposit, balance before shipment.", exzh: '付款条件是 30% 定金，发货前付清尾款。', reg: 'email' },
    { id: 'gl-ng-4', track: 'global', sc: 'negotiation', chunk: "Let's meet in the middle.", zh: '我们各让一步', level: 'B2', ex: "You're at 5, I'm at 6 — let's meet in the middle at 5.5.", exzh: '你出 5 我要 6——各让一步，5.5 成交。', reg: 'meeting' },
    { id: 'gl-ng-5', track: 'global', sc: 'negotiation', chunk: "Here's our best offer.", zh: '这是我们的最终报价', level: 'B2', ex: "Given the volume, here's our best offer.", exzh: '考虑到这个量，这是我们的最终报价。', reg: 'email' },
    /* 周报汇报 */
    { id: 'gl-rp-1', track: 'global', sc: 'report', chunk: "This week's highlights", zh: '本周要点', level: 'B1', ex: "This week's highlights: two new pilots signed.", exzh: '本周要点：签下两个试点客户。', reg: 'email' },
    { id: 'gl-rp-2', track: 'global', sc: 'report', chunk: "on track", zh: '进度正常', level: 'B2', ex: "The website revamp is on track for the 20th.", exzh: '官网改版按计划 20 号上线。', reg: 'email' },
    { id: 'gl-rp-3', track: 'global', sc: 'report', chunk: "stuck on", zh: '卡在……上', level: 'B1', ex: "We're stuck on the compliance paperwork.", exzh: '我们卡在合规文件上了。', reg: 'email' },
    { id: 'gl-rp-4', track: 'global', sc: 'report', chunk: "blockers", zh: '阻碍项', level: 'B2', ex: "No blockers this week — everything is moving.", exzh: '本周没有阻碍项，都在推进。', reg: 'meeting' },
    { id: 'gl-rp-5', track: 'global', sc: 'report', chunk: "next steps", zh: '下一步安排', level: 'B1', ex: "Next steps: finalize pricing and book the demo.", exzh: '下一步：敲定价格、预约演示。', reg: 'email' },
    /* 职场闲聊 */
    { id: 'gl-sm-1', track: 'global', sc: 'smalltalk', chunk: "How was your weekend?", zh: '周末过得怎么样？', level: 'A2', ex: "Morning! How was your weekend?", exzh: '早！周末过得怎么样？', reg: 'spoken' },
    { id: 'gl-sm-2', track: 'global', sc: 'smalltalk', chunk: "It's been a crazy week.", zh: '这一周太忙了', level: 'B1', ex: "It's been a crazy week — I'm looking forward to Friday.", exzh: '这周忙疯了——盼着周五呢。', reg: 'spoken' },
    { id: 'gl-sm-3', track: 'global', sc: 'smalltalk', chunk: "Did you catch…?", zh: '你看了/赶上……了吗？', level: 'B1', ex: "Did you catch the game last night?", exzh: '昨晚比赛看了吗？', reg: 'spoken' },
    { id: 'gl-sm-4', track: 'global', sc: 'smalltalk', chunk: "Let's catch up soon.", zh: '回头聊/找时间叙叙', level: 'B1', ex: "Great running into you — let's catch up soon.", exzh: '碰到你真好——回头找时间聊聊。', reg: 'spoken' },
    { id: 'gl-sm-5', track: 'global', sc: 'smalltalk', chunk: "Safe travels!", zh: '一路平安！', level: 'A2', ex: "You're flying back tonight? Safe travels!", exzh: '你今晚飞回去？一路平安！', reg: 'spoken' },
    /* 危机沟通 */
    { id: 'gl-es-1', track: 'global', sc: 'escalation', chunk: "Thanks for flagging this.", zh: '感谢你指出这个问题', level: 'B2', ex: "Thanks for flagging this — let me look into it right away.", exzh: '感谢指出——我马上查。', reg: 'email' },
    { id: 'gl-es-2', track: 'global', sc: 'escalation', chunk: "Here's what we know so far.", zh: '目前我们掌握的情况是……', level: 'B2', ex: "Here's what we know so far: the delay is at the port, not the factory.", exzh: '目前的情况是：延误在港口，不在工厂。', reg: 'email' },
    { id: 'gl-es-3', track: 'global', sc: 'escalation', chunk: "We're looking into it.", zh: '我们正在核查', level: 'B1', ex: "We're looking into it and will update you within the hour.", exzh: '我们正在核查，一小时内给你答复。', reg: 'email' },
    { id: 'gl-es-4', track: 'global', sc: 'escalation', chunk: "I'll keep you posted.", zh: '有进展我会随时同步', level: 'B1', ex: "I'll keep you posted as things develop.", exzh: '事情有进展我会随时同步。', reg: 'email' },
    { id: 'gl-es-5', track: 'global', sc: 'escalation', chunk: "Let's get on a call to sort this out.", zh: '我们打个电话把这事理清楚', level: 'B2', ex: "This is getting hard over email — let's get on a call to sort this out.", exzh: '邮件里说不清——我们打电话理一理。', reg: 'email' }
  ]
};
