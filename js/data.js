/* ============================================================
 * 词汇生长 Vocabulary Growth — 种子数据 (js/data.js)
 * 来源：OB 知识库「英语自学建设系统」真实数据资产（2026-08-28 迁移）
 *  - 66 词主动词汇库（2026-08-04 建，08-09 扩至66词）+ 2 词从 audio 资产恢复(strict/fabulous)
 *  - 13 语块地道说法库（4 场景）
 *  - 2 条真实造句记录
 *  - 40 个美音 mp3 → assets/audio/
 * 说明：firstLearned 为真实学习日期；nextReview 偏移量(offsetDays)在首次启动时
 *       相对"今天"计算，模拟系统已按 SRS-lite 规则运转中，保证首开复习量适中。
 * ============================================================ */
var VG_DATA = (function () {
  'use strict';

  var GROUPS = [
    { id: 'ocean',   name: '🌊 海洋探险', order: 1,
      story: '一次深海潜水远征：穿上 wetsuit，与海豚同游，寻找沉船宝藏。' },
    { id: 'mountain',name: '🏔️ 高山之旅', order: 2,
      story: '喜马拉雅登山故事：8000米高峰、零度以下、落石与攀登。' },
    { id: 'road',    name: '🚗 在路上', order: 3,
      story: '一段公路旅行：隧道、减速带、铁路道口、海鸥与加油站。' },
    { id: 'jobs',    name: '💼 职业故事', order: 4,
      story: '自媒体人的职业圈：编辑、记者、图书管理员、修理工，用相机记录一切。' },
    { id: 'daily',   name: '👕 日常物件', order: 5,
      story: '每天摸得到的东西：牛仔裤、相机、屏幕、报纸，还有一桌子 stuff。' },
    { id: 'mood',    name: '😊 情绪心态', order: 6,
      story: '学习路上的心情：好奇、焦虑、平静，忙乱但高效。' },
    { id: 'talk',    name: '💬 聊天高频', order: 7,
      story: '跟语伴聊天的万能词：基本上、在我看来、好处与优势。' },
    { id: 'world',   name: '🌍 世界与观点', order: 8,
      story: '聊更大的话题：传统与西方、预算与环境、逃离城市。' }
  ];

  /* 字段：w=word, ipa, pos, simple(简单英语释义), zh, chunk(句型骨架),
   *       ex{en,zh}=语境例句, note=原系统真实备注, g=groupId,
   *       audio=OB真实音频文件名(无则TTS),
   *       —— 运行态种子 ——
   *       sent: 'done'|'pending' 造句状态
   *       depth: 'untested'|1|3|5  遗忘深度(1=🟢 3=🟡 5=🔴)
   *       weak: 是否薄弱清单, learned=真实首学日期, off=首开时nextReview偏移天数 */
  var WORDS = [
    /* 🌊 海洋探险 */
    { w: 'dolphin', ipa: '/ˈdɒlfɪn/', pos: 'n.', simple: 'a smart sea animal that swims in groups', zh: '海豚',
      chunk: 'swim with dolphins', ex: { en: 'We saw dolphins jumping alongside our boat.', zh: '我们看到海豚在船边跳跃。' },
      g: 'ocean', audio: 'dolphin.mp3', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 2 },
    { w: 'wetsuit', ipa: '/ˈwetsuːt/', pos: 'n.', simple: 'tight clothing for swimming in cold water', zh: '潜水服',
      chunk: 'put on a wetsuit', ex: { en: 'You need a wetsuit for diving in cold water.', zh: '在冷水里潜水需要穿潜水服。' },
      g: 'ocean', audio: 'wetsuit.mp3', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 4 },
    { w: 'shark', ipa: '/ʃɑːk/', pos: 'n.', simple: 'a big fish with sharp teeth', zh: '鲨鱼',
      chunk: 'be afraid of sharks', ex: { en: 'Sharks rarely attack people.', zh: '鲨鱼很少攻击人。' },
      g: 'ocean', audio: 'shark.mp3', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 6 },
    { w: 'dive', ipa: '/daɪv/', pos: 'v./n.', simple: 'to jump into water or swim underwater', zh: '潜水；跳水',
      chunk: 'go diving', ex: { en: "Let's dive and look at the fish.", zh: '我们潜水看鱼吧。' },
      g: 'ocean', audio: 'dive.mp3', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 1 },
    { w: 'treasure', ipa: '/ˈtreʒə(r)/', pos: 'n.', simple: 'gold, jewels or very valuable things', zh: '宝藏；珍宝',
      chunk: 'look for treasure', ex: { en: 'Divers found a box of treasure on the old ship.', zh: '潜水员在旧船上找到一箱宝藏。' },
      g: 'ocean', audio: 'treasure.mp3', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 3 },
    { w: 'expedition', ipa: '/ˌekspəˈdɪʃn/', pos: 'n.', simple: 'a long trip to explore a place', zh: '远征；探险',
      chunk: 'go on an expedition', ex: { en: 'Our expedition to the island took three days.', zh: '我们去那个岛的探险花了三天。' },
      g: 'ocean', audio: 'expedition.mp3', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 5 },
    { w: 'alongside', ipa: '/əˈlɒŋsaɪd/', pos: 'prep.', simple: 'next to; together with', zh: '在…旁边；与…一起',
      chunk: 'swim alongside the boat', ex: { en: 'The seal swam alongside our boat.', zh: '海豹在我们船边一起游。' },
      g: 'ocean', audio: 'alongside.mp3', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 0 },

    /* 🏔️ 高山之旅 */
    { w: 'himalayas', ipa: '/ˌhɪməˈleɪəz/', pos: 'n.(pl.)', simple: 'the highest mountains in the world', zh: '喜马拉雅山脉',
      chunk: 'the Himalayas are ...', ex: { en: 'The Himalayas are the highest mountains in the world.', zh: '喜马拉雅是世界最高的山。' },
      note: '8/7 复习答成 hiamlay；音译=喜马拉雅', g: 'mountain', audio: 'himalayas.mp3',
      sent: 'pending', depth: 5, weak: true, learned: '2026-08-07', off: 0 },
    { w: 'climbing', ipa: '/ˈklaɪmɪŋ/', pos: 'n.', simple: 'the sport of going up mountains or rocks', zh: '攀登',
      chunk: 'go climbing / rock climbing', ex: { en: 'Rock climbing is dangerous but exciting.', zh: '攀岩危险但刺激。' },
      note: 'go climbing / rock climbing', g: 'mountain', audio: 'climbing.mp3',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-07', off: 2 },
    { w: 'below', ipa: '/bɪˈləʊ/', pos: 'prep./adv.', simple: 'under; lower than', zh: '在…下面',
      chunk: 'below zero / below average', ex: { en: 'The temperature drops below zero at night.', zh: '夜里气温降到零度以下。' },
      note: 'below zero / below average', g: 'mountain', audio: 'below.mp3',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-07', off: 5 },
    { w: 'metres', ipa: '/ˈmiːtəz/', pos: 'n.(pl.)', simple: 'units of length (100 cm = 1 metre)', zh: '米',
      chunk: '8,000 metres high', ex: { en: 'Some peaks are over 8,000 metres high.', zh: '有些山峰超过8000米高。' },
      note: '英式 metres = 美式 meters', g: 'mountain', audio: 'metres.mp3',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-07', off: 1 },
    { w: 'falling', ipa: '/ˈfɔːlɪŋ/', pos: 'v-ing', simple: 'going down (from fall)', zh: '落下',
      chunk: 'falling rocks / falling asleep', ex: { en: 'Watch out for falling rocks!', zh: '小心落石！' },
      g: 'mountain', audio: 'falling.mp3', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-07', off: 4 },

    /* 🚗 在路上 */
    { w: 'tunnel', ipa: '/ˈtʌnl/', pos: 'n.', simple: 'a road or path through a mountain or under the ground', zh: '隧道',
      chunk: 'go through a tunnel', ex: { en: 'The train goes through a long tunnel.', zh: '火车穿过一条长隧道。' },
      g: 'road', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 3 },
    { w: 'bumps', ipa: '/bʌmps/', pos: 'n.(pl.)', simple: 'small raised areas on a road', zh: '凸起；颠簸',
      chunk: 'speed bumps', ex: { en: 'Slow down at the speed bumps.', zh: '过减速带要减速。' },
      note: '凸起/颠簸；speed bumps', g: 'road',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 6 },
    { w: 'railway', ipa: '/ˈreɪlweɪ/', pos: 'n.', simple: 'the tracks that trains run on', zh: '铁路',
      chunk: 'railway station', ex: { en: 'We waited at the railway station.', zh: '我们在火车站等候。' },
      g: 'road', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 2 },
    { w: 'crossing', ipa: '/ˈkrɒsɪŋ/', pos: 'n.', simple: 'a place where two roads cross; a safe place to cross', zh: '交叉口；道口',
      chunk: 'railway crossing / pedestrian crossing', ex: { en: 'Stop at the railway crossing.', zh: '铁路道口要停下。' },
      g: 'road', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 0 },
    { w: 'seagulls', ipa: '/ˈsiːɡʌlz/', pos: 'n.(pl.)', simple: 'white birds that live near the sea', zh: '海鸥',
      chunk: 'seagulls flying over the beach', ex: { en: 'Seagulls were flying over the beach.', zh: '海鸥在海滩上空飞翔。' },
      g: 'road', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 5 },
    { w: 'dump', ipa: '/dʌmp/', pos: 'n./v.', simple: 'a place for garbage; to throw away', zh: '垃圾场；倾倒',
      chunk: 'dump truck', ex: { en: 'A dump truck carried away the sand.', zh: '一辆自卸卡车把沙子运走了。' },
      g: 'road', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 1 },
    { w: 'boot', ipa: '/buːt/', pos: 'n.', simple: 'a strong shoe that covers the ankle; (UK) the car trunk', zh: '靴子；（英）后备箱',
      chunk: 'a pair of boots', ex: { en: 'I put my boots in the boot.', zh: '我把靴子放进后备箱。' },
      note: '靴子/后备箱；boots 复数', g: 'road',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 4 },
    { w: 'gas', ipa: '/ɡæs/', pos: 'n.', simple: '(US) fuel for cars', zh: '汽油',
      chunk: 'fill up the gas tank', ex: { en: 'I need to fill up the gas tank this weekend.', zh: '这周末我得去加油。' },
      note: '美式 gas = 英式 petrol', g: 'road', audio: 'gas.mp3',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-07', off: 3 },
    { w: 'straight', ipa: '/streɪt/', pos: 'adj./adv.', simple: 'not turning; direct', zh: '直的；直接',
      chunk: 'go straight', ex: { en: 'Go straight and turn left at the bank.', zh: '直走，到银行左转。' },
      note: '直走/直发/直接；发音 /streɪt/', g: 'road', audio: 'straight.mp3',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-07', off: 0 },

    /* 💼 职业故事 */
    { w: 'editor', ipa: '/ˈedɪtə(r)/', pos: 'n.', simple: 'a person who fixes and improves videos or text', zh: '编辑',
      chunk: 'edit my video after the script', ex: { en: 'I edit my video after I finish the script.', zh: '写完稿子后我剪视频。' },
      note: '8/9 复习第0层想起+造句；与 reporter 的混淆已解除', g: 'jobs', audio: 'editor.mp3',
      sent: 'done', depth: 1, weak: false, learned: '2026-08-04', off: 3 },
    { w: 'reporter', ipa: '/rɪˈpɔːtə(r)/', pos: 'n.', simple: 'a person who finds news and tells it', zh: '记者',
      chunk: 'a news reporter', ex: { en: 'A reporter interviewed the diver.', zh: '一位记者采访了潜水员。' },
      note: '与 editor 混淆过；记者=采访', g: 'jobs', audio: 'reporter.mp3',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-07', off: 2 },
    { w: 'librarian', ipa: '/laɪˈbreəriən/', pos: 'n.', simple: 'a person who works in a library', zh: '图书管理员',
      chunk: 'ask the librarian', ex: { en: 'Ask the librarian where the English books are.', zh: '问图书管理员英语书在哪。' },
      note: '-ian 后缀=职业', g: 'jobs', audio: 'librarian.mp3',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-07', off: 6 },
    { w: 'mechanic', ipa: '/məˈkænɪk/', pos: 'n.', simple: 'a person who fixes machines and cars', zh: '机械师；修理工',
      chunk: 'a car mechanic', ex: { en: 'The mechanic fixed our van.', zh: '机械师修好了我们的面包车。' },
      note: '8/7 复习答成 metra；锚点=修 machine 的人', g: 'jobs', audio: 'mechanic.mp3',
      sent: 'pending', depth: 5, weak: true, learned: '2026-08-07', off: 0 },
    { w: 'photograph', ipa: '/ˈfəʊtəɡrɑːf/', pos: 'n./v.', simple: 'a picture made with a camera', zh: '照片；拍摄',
      chunk: 'take a photograph（口语常用 photo）', ex: { en: 'He took a photograph of the mountains.', zh: '他拍了张山的照片。' },
      note: '正式说法，口语用 photo', g: 'jobs', audio: 'photograph.mp3',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-07', off: 1 },
    { w: 'film', ipa: '/fɪlm/', pos: 'n./v.', simple: 'a movie; to record with a camera', zh: '电影；拍摄',
      chunk: 'film a video', ex: { en: 'I use my phone camera to film videos for my channel.', zh: '我用手机相机为频道拍视频。' },
      note: '英式 movie；动词=拍摄', g: 'jobs', audio: 'film.mp3',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-07', off: 4 },

    /* 👕 日常物件 */
    { w: 'jeans', ipa: '/dʒiːnz/', pos: 'n.(pl.)', simple: 'strong blue pants', zh: '牛仔裤',
      chunk: 'a pair of jeans', ex: { en: "I'm a jeans and T-shirt kind of guy.", zh: '我是牛仔裤T恤型的人。' },
      note: '⚠️ 永远复数 a pair of jeans', g: 'daily', audio: 'jeans.mp3',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-07', off: 2 },
    { w: 'trousers', ipa: '/ˈtraʊzəz/', pos: 'n.(pl.)', simple: 'pants', zh: '裤子',
      chunk: 'a pair of trousers', ex: { en: 'He bought a new pair of trousers.', zh: '他买了条新裤子。' },
      note: '⚠️ 永远复数', g: 'daily', audio: 'trousers.mp3',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 5 },
    { w: 'camera', ipa: '/ˈkæmərə/', pos: 'n.', simple: 'a tool for taking pictures or videos', zh: '相机',
      chunk: 'use my camera to record', ex: { en: 'I use my camera to record my videos.', zh: '我用相机录视频。' },
      note: '8/7 造句：I use my camera to record my videos.', g: 'daily', audio: 'camera.mp3',
      sent: 'done', depth: 1, weak: false, learned: '2026-08-04', off: 3 },
    { w: 'screen', ipa: '/skriːn/', pos: 'n.', simple: 'the flat part you look at', zh: '屏幕',
      chunk: 'look at the screen / screen time', ex: { en: 'My eyes hurt after a whole day on the screen.', zh: '盯了一天屏幕我眼睛疼。' },
      g: 'daily', audio: 'screen.mp3', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 0 },
    { w: 'newspaper', ipa: '/ˈnjuːzpeɪpə(r)/', pos: 'n.', simple: 'printed daily news pages', zh: '报纸',
      chunk: 'read the newspaper', ex: { en: 'I want to start reading an English newspaper.', zh: '我想开始读英文报纸。' },
      note: 'read the newspaper', g: 'daily', audio: 'newspaper.mp3',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 4 },
    { w: 'stuff', ipa: '/stʌf/', pos: 'n.', simple: 'things (informal)', zh: '东西',
      chunk: 'clean up my stuff', ex: { en: 'I need to clean up my stuff on my desk.', zh: '我得收拾桌上的东西。' },
      note: 'clean up 搭配', g: 'daily', audio: 'stuff.mp3',
      sent: 'done', depth: 1, weak: false, learned: '2026-08-04', off: 6 },
    { w: 'casually', ipa: '/ˈkæʒuəli/', pos: 'adv.', simple: 'in a relaxed way; not serious', zh: '随意地',
      chunk: 'casually practice English', ex: { en: 'I casually practice English every day.', zh: '我每天随意地练英语。' },
      g: 'daily', audio: 'casually.mp3', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 1 },

    /* 😊 情绪心态 */
    { w: 'curious', ipa: '/ˈkjʊəriəs/', pos: 'adj.', simple: 'wanting to know more about something', zh: '好奇的',
      chunk: "I'm curious about ...", ex: { en: "I'm curious—what's your next plan?", zh: '我好奇你下一步怎么打算。' },
      note: '间接疑问句语序需巩固', g: 'mood', audio: 'curious.mp3',
      sent: 'done', depth: 3, weak: false, learned: '2026-08-04', off: 0 },
    { w: 'anxious', ipa: '/ˈæŋkʃəs/', pos: 'adj.', simple: 'worried and nervous', zh: '焦虑的',
      chunk: 'be anxious about', ex: { en: "Don't be anxious about making mistakes.", zh: '别担心犯错。' },
      note: '8/7 复习答成 emotion→awful→anxious', g: 'mood', audio: 'anxious.mp3',
      sent: 'pending', depth: 3, weak: false, learned: '2026-08-07', off: 0 },
    { w: 'calm', ipa: '/kɑːm/', pos: 'adj.', simple: 'quiet inside; not nervous', zh: '平静的',
      chunk: 'stay calm', ex: { en: 'Take a deep breath and stay calm.', zh: '深呼吸，保持平静。' },
      note: 'anxious 的反义词；stay calm', g: 'mood',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 2 },
    { w: 'increasingly', ipa: '/ɪnˈkriːsɪŋli/', pos: 'adv.', simple: 'more and more', zh: '越来越',
      chunk: 'increasingly popular', ex: { en: 'English is increasingly useful for my job.', zh: '英语对我的工作越来越有用。' },
      note: '越来越；increase → increasingly', g: 'mood', audio: 'increasingly.mp3',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 5 },
    { w: 'hectic', ipa: '/ˈhektɪk/', pos: 'adj.', simple: 'very very busy', zh: '忙乱的',
      chunk: 'a hectic day', ex: { en: 'I had a hectic day—three meetings and a deadline.', zh: '今天忙疯了——三个会还要赶截止。' },
      note: '忙乱的；a hectic day', g: 'mood',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 1 },
    { w: 'productive', ipa: '/prəˈdʌktɪv/', pos: 'adj.', simple: 'doing a lot; getting things done', zh: '高效的',
      chunk: 'a really productive day', ex: { en: 'I had a really productive day today.', zh: '我今天很高效。' },
      g: 'mood', audio: 'productive.mp3', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 4 },
    { w: 'strict', ipa: '/strɪkt/', pos: 'adj.', simple: 'with strong rules; not allowing mistakes', zh: '严格的',
      chunk: 'a strict teacher', ex: { en: 'My English teacher is strict but kind.', zh: '我的英语老师严格但友善。' },
      note: '从 OB 音频资产恢复（8/9 脚本事故前已学）', g: 'mood', audio: 'strict.mp3',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 6 },
    { w: 'fabulous', ipa: '/ˈfæbjələs/', pos: 'adj.', simple: 'amazing; wonderful', zh: '极好的',
      chunk: 'look fabulous', ex: { en: 'You look fabulous in that wetsuit!', zh: '你穿那身潜水服太帅了！' },
      note: '从 OB 音频资产恢复（8/9 脚本事故前已学）', g: 'mood', audio: 'fabulous.mp3',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 3 },

    /* 💬 聊天高频 */
    { w: 'basically', ipa: '/ˈbeɪsɪkli/', pos: 'adv.', simple: 'in simple words; mostly', zh: '基本上',
      chunk: 'Basically, ...', ex: { en: 'Basically, I learn English by talking.', zh: '基本上，我靠聊天学英语。' },
      note: '口语万能开头', g: 'talk',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 0 },
    { w: 'view', ipa: '/vjuː/', pos: 'n.', simple: 'what you can see; your opinion', zh: '景色；看法',
      chunk: 'in my view', ex: { en: 'In my view, speaking beats studying.', zh: '在我看来，开口比学语法强。' },
      note: '景色/看法；in my view', g: 'talk',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 2 },
    { w: 'discussion', ipa: '/dɪˈskʌʃn/', pos: 'n.', simple: 'talking about something to decide or learn', zh: '讨论',
      chunk: 'have a discussion', ex: { en: 'We had a long discussion about our next plan.', zh: '我们就下一步计划讨论了很久。' },
      note: '讨论；have a discussion', g: 'talk',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 6 },
    { w: 'theory', ipa: '/ˈθɪəri/', pos: 'n.', simple: 'an idea that explains something', zh: '理论',
      chunk: 'in theory', ex: { en: 'In theory, input works. In real life, speaking works.', zh: '理论上输入有用；现实中开口才有用。' },
      note: '理论；in theory', g: 'talk',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 1 },
    { w: 'law', ipa: '/lɔː/', pos: 'n.', simple: 'rules everyone must follow', zh: '法律',
      chunk: 'break the law', ex: { en: 'Never break the law—study the visa rules!', zh: '永远别违法——好好研究签证规则！' },
      note: '法律；break the law', g: 'talk',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 5 },
    { w: 'react', ipa: '/riˈækt/', pos: 'v.', simple: 'to do or say something because of something', zh: '反应',
      chunk: 'react to sth', ex: { en: 'How did your language partner react to your mistake?', zh: '语伴对你的错误是什么反应？' },
      note: '反应；react to sth', g: 'talk',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 3 },
    { w: 'entire', ipa: '/ɪnˈtaɪə(r)/', pos: 'adj.', simple: 'whole; all of it', zh: '整个的',
      chunk: 'the entire day', ex: { en: 'I spent the entire day making one video.', zh: '我花了一整天做一个视频。' },
      note: '整个的；the entire day', g: 'talk',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 0 },
    { w: 'convenient', ipa: '/kənˈviːniənt/', pos: 'adj.', simple: 'easy to use; saves you trouble', zh: '方便的',
      chunk: 'convenient for sb', ex: { en: 'Is 8 pm convenient for you?', zh: '你晚上八点方便吗？' },
      note: '方便的；convenient for', g: 'talk',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 4 },
    { w: 'advantage', ipa: '/ədˈvɑːntɪdʒ/', pos: 'n.', simple: 'something that helps you win', zh: '优势',
      chunk: 'have an advantage', ex: { en: 'Talking every day gives you a big advantage.', zh: '每天开口说给你巨大优势。' },
      note: '优势；have an advantage', g: 'talk',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 2 },
    { w: 'benefits', ipa: '/ˈbenɪfɪts/', pos: 'n.(pl.)', simple: 'good things something gives you', zh: '好处；福利',
      chunk: 'the benefits of ...', ex: { en: 'What are the benefits of learning English?', zh: '学英语有什么好处？' },
      note: '好处/福利；the benefits of', g: 'talk',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 6 },
    { w: 'drop', ipa: '/drɒp/', pos: 'v./n.', simple: 'to fall; a small amount of liquid', zh: '掉落；一滴',
      chunk: 'drop by / the temperature drops', ex: { en: 'Drop by my place after work!', zh: '下班顺路来我这儿坐坐！' },
      note: '掉落/一滴/drop by', g: 'talk',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 1 },
    { w: 'by then', ipa: '/baɪ ðen/', pos: 'adv.', simple: 'at that time', zh: '到那时',
      chunk: 'by then / by the time', ex: { en: "I'll finish level 2 by then.", zh: '到那时我就学完二级了。' },
      note: '到那时；by the time', g: 'talk',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 5 },
    { w: 'content', ipa: '/ˈkɒntent/', pos: 'n.', simple: 'things in a video, book or app', zh: '内容',
      chunk: 'content creator', ex: { en: "I'm a content creator learning English in public.", zh: '我是个公开学英语的内容创作者。' },
      note: '内容；content creator', g: 'talk',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 3 },

    /* 🌍 世界与观点 */
    { w: 'traditional', ipa: '/trəˈdɪʃənl/', pos: 'adj.', simple: 'old way; passed down for years', zh: '传统的',
      chunk: 'traditional food', ex: { en: 'We ate traditional food at the festival.', zh: '节日里我们吃了传统食物。' },
      g: 'world', audio: 'traditional.mp3', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 4 },
    { w: 'western', ipa: '/ˈwestən/', pos: 'adj.', simple: 'from Europe or America', zh: '西方的',
      chunk: 'western food', ex: { en: 'I prefer western food when I travel.', zh: '旅行时我更爱吃西餐。' },
      g: 'world', audio: 'western.mp3', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 2 },
    { w: 'diverse', ipa: '/daɪˈvɜːs/', pos: 'adj.', simple: 'many different kinds', zh: '多元的',
      chunk: 'a diverse group', ex: { en: 'My language partners are a diverse group.', zh: '我的语伴们来自各种背景。' },
      g: 'world', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 0 },
    { w: 'budget', ipa: '/ˈbʌdʒɪt/', pos: 'n.', simple: 'a plan for money', zh: '预算',
      chunk: 'on a budget', ex: { en: 'I travel on a budget and learn English for free.', zh: '我穷游并且免费学英语。' },
      g: 'world', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 3 },
    { w: 'environment', ipa: '/ɪnˈvaɪrənmənt/', pos: 'n.', simple: 'the natural world around us', zh: '环境',
      chunk: 'protect the environment', ex: { en: 'Protect the environment—take your own cup!', zh: '保护环境——自带水杯！' },
      g: 'world', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 6 },
    { w: 'harmony', ipa: '/ˈhɑːməni/', pos: 'n.', simple: 'people or things living well together', zh: '和谐',
      chunk: 'live in harmony', ex: { en: 'We live in harmony with our neighbors.', zh: '我们和邻居相处和谐。' },
      g: 'world', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 1 },
    { w: 'attraction', ipa: '/əˈtrækʃn/', pos: 'n.', simple: 'an interesting place to visit', zh: '景点；吸引力',
      chunk: 'tourist attraction', ex: { en: 'The beach is the main tourist attraction here.', zh: '海滩是这里的主要景点。' },
      g: 'world', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 5 },
    { w: 'restart', ipa: '/ˌriːˈstɑːt/', pos: 'v.', simple: 'to start again', zh: '重新开始',
      chunk: 'restart from zero', ex: { en: 'I restarted my English learning from zero.', zh: '我从零开始重新学英语。' },
      g: 'world', audio: 'restart.mp3', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 0 },
    { w: 'curse', ipa: '/kɜːs/', pos: 'v./n.', simple: 'to say bad words', zh: '骂脏话；诅咒',
      chunk: 'curse words', ex: { en: "Don't use curse words when you talk to strangers.", zh: '跟陌生人说话别说脏话。' },
      g: 'world', audio: 'curse.mp3', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 3 },
    { w: 'skeleton', ipa: '/ˈskelɪtn/', pos: 'n.', simple: 'all the bones of a body', zh: '骨骼；骨架',
      chunk: 'a whale skeleton', ex: { en: 'The museum has a whale skeleton.', zh: '博物馆有一具鲸鱼骨架。' },
      g: 'world', audio: 'skeleton.mp3', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 5 },
    { w: 'scrabble', ipa: '/ˈskræbl/', pos: 'v./n.', simple: 'to scratch around; a word game', zh: '乱抓；拼字游戏',
      chunk: 'play Scrabble', ex: { en: 'We play Scrabble to practice words.', zh: '我们玩拼字游戏练单词。' },
      note: '双义：乱抓 / 拼字游戏', g: 'world', audio: 'scrabble.mp3',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 1 },
    { w: 'escape', ipa: '/ɪˈskeɪp/', pos: 'v./n.', simple: 'to get away; get free', zh: '逃离',
      chunk: 'escape the city', ex: { en: 'I like to escape the city on weekends.', zh: '我周末喜欢逃离城市。' },
      g: 'world', audio: 'escape.mp3', sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-04', off: 4 },
    { w: 'beam', ipa: '/biːm/', pos: 'n./v.', simple: 'a line of light; to smile big', zh: '光束；笑容',
      chunk: 'a beam of light / beam with joy', ex: { en: 'She beamed with joy when she passed the test.', zh: '她通过考试时笑开了花。' },
      note: '梁 / 光束 / 笑容', g: 'world',
      sent: 'pending', depth: 'untested', weak: false, learned: '2026-08-09', off: 2 }
  ];

  /* 地道说法库：13 语块 × 4 场景（原库 12 条 + 来源追踪中的 1 条真实语块） */
  var CHUNKS = [
    { id: 'c01', scene: '好奇提问', zh: '我好奇你下一步怎么打算', en: "I'm curious—what's your next plan?" },
    { id: 'c02', scene: '好奇提问', zh: '我好奇你怎么学中文的', en: "I'm curious—how did you learn Chinese?" },
    { id: 'c03', scene: '好奇提问', zh: '我对……很好奇', en: 'I\'m curious about ...' },
    { id: 'c04', scene: '表达观点', zh: '说实话', en: 'To be honest... / Honestly...' },
    { id: 'c05', scene: '表达观点', zh: '我觉得', en: 'I think... / I feel like...' },
    { id: 'c06', scene: '表达观点', zh: '在我看来', en: 'In my opinion... / From my perspective...' },
    { id: 'c07', scene: '日常闲聊', zh: '我今天很高效', en: 'I had a really productive day today.' },
    { id: 'c08', scene: '日常闲聊', zh: '我最近在忙求职的事', en: "I'm busy with job stuff these days." },
    { id: 'c09', scene: '日常闲聊', zh: '我周末想逃离城市', en: 'I like to escape the city on weekends.' },
    { id: 'c10', scene: '日常闲聊', zh: '我是牛仔裤T恤型的人', en: "I'm a jeans and T-shirt kind of guy." },
    { id: 'c11', scene: '学英语相关', zh: '我从零开始重新学英语', en: 'I restarted my English learning from zero.' },
    { id: 'c12', scene: '学英语相关', zh: '我每天都跟语伴练', en: 'I casually practice English every day with my language partners.' },
    { id: 'c13', scene: '学英语相关', zh: '学英语就像探险', en: 'My English learning journey is like a long expedition.' }
  ];

  /* 真实造句记录（2026-08-04，来自原系统造句记录表） */
  var SENTENCE_RECORDS = [
    { date: '2026-08-04', wordId: 'curious',
      userSentence: "I'm curious about where did you make an next plan?",
      correction: '间接疑问句不倒装（where you made）+ an next → your next',
      refEn: "I'm curious—what's your next plan?", status: 'corrected' },
    { date: '2026-08-04', wordId: 'stuff',
      userSentence: 'I need to clean stuff on my desk.',
      correction: 'clean → clean up（收拾）',
      refEn: 'I need to clean up my stuff on my desk.', status: 'corrected' }
  ];

  /* 真实里程碑（来自原系统 里程碑.md）+ 词汇量增长日志 */
  var MILESTONES = [
    { date: '2026-08-04', text: '首批 22 词建档，词汇生长系统启动', n: 22 },
    { date: '2026-08-07', text: '词汇量突破 30 词', n: 30 },
    { date: '2026-08-09', text: '单日 +38 词，词汇量突破 60 词', n: 66 }
  ];

  var GROWTH_LOG = [
    { date: '2026-08-04', total: 22 },
    { date: '2026-08-07', total: 38 },
    { date: '2026-08-09', total: 68 }
  ];

  /* 姊妹项目验证过的运行参数 */
  var CONFIG = {
    storageKey: 'vocab_growth_v1',
    reviewBatchSize: 5,     // 每次复习抽5词（原系统规则）
    newWordLockThreshold: 30, // 新词上限铁律：待复习>30 锁定
    streakSeedDays: 0       // 新用户从 0 开始累计（23 天是原系统私有数据，对新用户是误导）
  };

  return {
    GROUPS: GROUPS,
    WORDS: WORDS,
    CHUNKS: CHUNKS,
    SENTENCE_RECORDS: SENTENCE_RECORDS,
    MILESTONES: MILESTONES,
    GROWTH_LOG: GROWTH_LOG,
    CONFIG: CONFIG
  };
})();

/* Node 测试环境兼容 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VG_DATA;
}
