/* ============================================================
 * 词汇生长 — 48 国际音标数据 (js/data-phonetics.js)
 * 设计原则：音标寄生在词库上——例词优先取自 data.js 的 68 词
 * （运行时自动识别：在词库里的词点发音走 OB 原声链，词外词走 TTS）。
 * 每个音标：sym 符号 / tip 口诀（口型舌位一句话） / words 例词×3
 * ============================================================ */
var VG_PHONETICS = {
  GROUPS: [
    {
      id: 'short', name: '短元音', icon: '⚡',
      desc: '短促有力，一闪而过——短元音发长了意思就变了',
      sounds: [
        { sym: 'ɪ', tip: '短促放松的"衣"，嘴比 /iː/ 略开，声音一闪而过', words: [
          { w: 'film', ipa: '/fɪlm/' }, { w: 'expedition', ipa: '/ˌekspəˈdɪʃn/' }, { w: 'big', ipa: '/bɪɡ/' } ] },
        { sym: 'e', tip: '嘴半开，舌头放平，干脆的"哎"', words: [
          { w: 'wetsuit', ipa: '/ˈwetsuːt/' }, { w: 'editor', ipa: '/ˈedɪtə(r)/' }, { w: 'best', ipa: '/best/' } ] },
        { sym: 'æ', tip: '嘴张大到能放进两根手指，"哎"往开了发——bad 不是"白的"', words: [
          { w: 'camera', ipa: '/ˈkæmərə/' }, { w: 'gas', ipa: '/ɡæs/' }, { w: 'fabulous', ipa: '/ˈfæbjələs/' } ] },
        { sym: 'ɒ', tip: '嘴巴圆而不突，喉部放松，短促的"奥"', words: [
          { w: 'dolphin', ipa: '/ˈdɒlfɪn/' }, { w: 'drop', ipa: '/drɒp/' }, { w: 'content', ipa: '/ˈkɒntent/' } ] },
        { sym: 'ʌ', tip: '嘴自然微开，中央短促的"啊"——像突然被轻碰了一声', words: [
          { w: 'tunnel', ipa: '/ˈtʌnl/' }, { w: 'stuff', ipa: '/stʌf/' }, { w: 'bumps', ipa: '/bʌmps/' } ] },
        { sym: 'ʊ', tip: '双唇收圆略突，短促的"乌"——比中文"乌"更松', words: [
          { w: 'put', ipa: '/pʊt/' }, { w: 'book', ipa: '/bʊk/' }, { w: 'good', ipa: '/ɡʊd/' } ] },
        { sym: 'ə', tip: '全身放松自然发出的"呃"——英语最重要的弱读音，几乎每个长单词里都有它', words: [
          { w: 'camera', ipa: '/ˈkæmərə/' }, { w: 'mechanic', ipa: '/məˈkænɪk/' }, { w: 'about', ipa: '/əˈbaʊt/' } ] }
      ]
    },
    {
      id: 'long', name: '长元音', icon: '〰️',
      desc: '把声音拉住——长元音发短了，词就变了样',
      sounds: [
        { sym: 'iː', tip: '嘴角向两边咧开像微笑，"衣——"拉长，舌尖抵下齿', words: [
          { w: 'metres', ipa: '/ˈmiːtəz/' }, { w: 'beam', ipa: '/biːm/' }, { w: 'jeans', ipa: '/dʒiːnz/' } ] },
        { sym: 'ɑː', tip: '嘴大张，舌身压低后缩，"啊——"拖长——像医生压舌检查', words: [
          { w: 'shark', ipa: '/ʃɑːk/' }, { w: 'calm', ipa: '/kɑːm/' }, { w: 'photograph', ipa: '/ˈfəʊtəɡrɑːf/' } ] },
        { sym: 'ɔː', tip: '双唇收圆前突，"奥——"拉长——比 /ɒ/ 更圆更长', words: [
          { w: 'law', ipa: '/lɔː/' }, { w: 'falling', ipa: '/ˈfɔːlɪŋ/' }, { w: 'reporter', ipa: '/rɪˈpɔːtə(r)/' } ] },
        { sym: 'uː', tip: '双唇收圆前突，"乌——"拉长——像吹蜡烛前的口型', words: [
          { w: 'boot', ipa: '/buːt/' }, { w: 'newspaper', ipa: '/ˈnjuːzpeɪpə(r)/' }, { w: 'food', ipa: '/fuːd/' } ] },
        { sym: 'ɜː', tip: '舌头居中放松，"呃——"拖长——美式发音会顺势卷成 r', words: [
          { w: 'curse', ipa: '/kɜːs/' }, { w: 'diverse', ipa: '/daɪˈvɜːs/' }, { w: 'bird', ipa: '/bɜːd/' } ] }
      ]
    },
    {
      id: 'double', name: '双元音', icon: '🌊',
      desc: '一个音里滑两次——前重后轻，滑到位别吞尾巴',
      sounds: [
        { sym: 'eɪ', tip: '从"诶"滑向"衣"，前重后轻——像答应别人："诶？好"', words: [
          { w: 'railway', ipa: '/ˈreɪlweɪ/' }, { w: 'straight', ipa: '/streɪt/' }, { w: 'escape', ipa: '/ɪˈskeɪp/' } ] },
        { sym: 'aɪ', tip: '从"啊"滑向"衣"——"爱"，嘴从大张收到半开', words: [
          { w: 'dive', ipa: '/daɪv/' }, { w: 'climbing', ipa: '/ˈklaɪmɪŋ/' }, { w: 'librarian', ipa: '/laɪˈbreəriən/' } ] },
        { sym: 'ɔɪ', tip: '从"奥"滑向"衣"——像磕到脚喊"哎哟"', words: [
          { w: 'boy', ipa: '/bɔɪ/' }, { w: 'toy', ipa: '/tɔɪ/' }, { w: 'join', ipa: '/dʒɔɪn/' } ] },
        { sym: 'əʊ', tip: '从中央"呃"滑向"乌"，圆唇收尾——比中文"欧"起点更靠中间', words: [
          { w: 'below', ipa: '/bɪˈləʊ/' }, { w: 'photograph', ipa: '/ˈfəʊtəɡrɑːf/' }, { w: 'home', ipa: '/həʊm/' } ] },
        { sym: 'aʊ', tip: '从"啊"滑向"乌"——"傲"，嘴从大张到圆唇', words: [
          { w: 'down', ipa: '/daʊn/' }, { w: 'now', ipa: '/naʊ/' }, { w: 'about', ipa: '/əˈbaʊt/' } ] },
        { sym: 'ɪə', tip: '从"衣"滑向"呃"——"衣尔"，尾巴别吞掉', words: [
          { w: 'theory', ipa: '/ˈθɪəri/' }, { w: 'here', ipa: '/hɪə(r)/' }, { w: 'near', ipa: '/nɪə(r)/' } ] },
        { sym: 'eə', tip: '从"诶"滑向"呃"，嘴渐渐放松——air 的味道', words: [
          { w: 'air', ipa: '/eə(r)/' }, { w: 'care', ipa: '/keə(r)/' }, { w: 'hair', ipa: '/heə(r)/' } ] },
        { sym: 'ʊə', tip: '从"乌"短促滑向"呃"，一滑即收', words: [
          { w: 'curious', ipa: '/ˈkjʊəriəs/' }, { w: 'tour', ipa: '/tʊə(r)/' }, { w: 'sure', ipa: '/ʃʊə(r)/' } ] }
      ]
    },
    {
      id: 'plosive', name: '爆破音', icon: '💥',
      desc: '先憋气再弹开——清音送气，浊音喉咙振动',
      sounds: [
        { sym: 'p', tip: '双唇憋气再弹开，送气强——拿纸巾放嘴前会被吹动', words: [
          { w: 'expedition', ipa: '/ˌekspəˈdɪʃn/' }, { w: 'productive', ipa: '/prəˈdʌktɪv/' }, { w: 'pen', ipa: '/pen/' } ] },
        { sym: 'b', tip: '像 /p/ 但不送气，喉咙要振动——手摸喉咙有麻感', words: [
          { w: 'bumps', ipa: '/bʌmps/' }, { w: 'boot', ipa: '/buːt/' }, { w: 'below', ipa: '/bɪˈləʊ/' } ] },
        { sym: 't', tip: '舌尖抵上齿龈憋气弹开，送气清脆——像滴答的"答"', words: [
          { w: 'tunnel', ipa: '/ˈtʌnl/' }, { w: 'trousers', ipa: '/ˈtraʊzəz/' }, { w: 'straight', ipa: '/streɪt/' } ] },
        { sym: 'd', tip: '同 /t/ 但声带振动、不送气——"的"但要振动', words: [
          { w: 'dive', ipa: '/daɪv/' }, { w: 'dump', ipa: '/dʌmp/' }, { w: 'drop', ipa: '/drɒp/' } ] },
        { sym: 'k', tip: '舌根顶住软腭憋气弹开，送气——像轻咳的起头', words: [
          { w: 'camera', ipa: '/ˈkæmərə/' }, { w: 'climbing', ipa: '/ˈklaɪmɪŋ/' }, { w: 'mechanic', ipa: '/məˈkænɪk/' } ] },
        { sym: 'g', tip: '同 /k/ 但声带振动、不送气', words: [
          { w: 'gas', ipa: '/ɡæs/' }, { w: 'seagulls', ipa: '/ˈsiːɡʌlz/' }, { w: 'good', ipa: '/ɡʊd/' } ] }
      ]
    },
    {
      id: 'fricative', name: '摩擦音', icon: '💨',
      desc: '气流挤过窄缝的嘶嘶声——位置对了才有摩擦',
      sounds: [
        { sym: 'f', tip: '上齿轻咬下唇送气——"夫"，但牙齿必须碰到嘴唇', words: [
          { w: 'film', ipa: '/fɪlm/' }, { w: 'fabulous', ipa: '/ˈfæbjələs/' }, { w: 'benefits', ipa: '/ˈbenɪfɪts/' } ] },
        { sym: 'v', tip: '同 /f/ 但上齿碰下唇、声带振动', words: [
          { w: 'view', ipa: '/vjuː/' }, { w: 'dive', ipa: '/daɪv/' }, { w: 'diverse', ipa: '/daɪˈvɜːs/' } ] },
        { sym: 'θ', tip: '舌尖轻放上下齿之间送气——咬着舌头说"丝"，中文没有', words: [
          { w: 'theory', ipa: '/ˈθɪəri/' }, { w: 'think', ipa: '/θɪŋk/' }, { w: 'three', ipa: '/θriː/' } ] },
        { sym: 'ð', tip: '同 /θ/ 但声带振动——咬着舌头说"这个"的"这"', words: [
          { w: 'by then', ipa: '/baɪ ðen/' }, { w: 'this', ipa: '/ðɪs/' }, { w: 'mother', ipa: '/ˈmʌðə(r)/' } ] },
        { sym: 's', tip: '舌尖接近上齿龈送气，嘶嘶响——像漏气的轮胎', words: [
          { w: 'seagulls', ipa: '/ˈsiːɡʌlz/' }, { w: 'straight', ipa: '/streɪt/' }, { w: 'skeleton', ipa: '/ˈskelɪtn/' } ] },
        { sym: 'z', tip: '同 /s/ 但声带振动——蜜蜂嗡嗡的振动感', words: [
          { w: 'metres', ipa: '/ˈmiːtəz/' }, { w: 'jeans', ipa: '/dʒiːnz/' }, { w: 'himalayas', ipa: '/ˌhɪməˈleɪəz/' } ] },
        { sym: 'ʃ', tip: '双唇略前突，舌面抬向硬腭——"嘘"让人安静的音', words: [
          { w: 'shark', ipa: '/ʃɑːk/' }, { w: 'traditional', ipa: '/trəˈdɪʃənl/' }, { w: 'anxious', ipa: '/ˈæŋkʃəs/' } ] },
        { sym: 'ʒ', tip: '同 /ʃ/ 但声带振动——"嘘"加上嗡嗡振动', words: [
          { w: 'treasure', ipa: '/ˈtreʒə(r)/' }, { w: 'casually', ipa: '/ˈkæʒuəli/' }, { w: 'pleasure', ipa: '/ˈpleʒə(r)/' } ] },
        { sym: 'h', tip: '气流从喉咙轻轻呼出——像哈气起雾，不摩擦', words: [
          { w: 'himalayas', ipa: '/ˌhɪməˈleɪəz/' }, { w: 'hectic', ipa: '/ˈhektɪk/' }, { w: 'harmony', ipa: '/ˈhɑːməni/' } ] },
        { sym: 'r', tip: '双唇略圆前突，舌尖卷起不碰任何地方——"若"的舌头姿势', words: [
          { w: 'reporter', ipa: '/rɪˈpɔːtə(r)/' }, { w: 'railway', ipa: '/ˈreɪlweɪ/' }, { w: 'restart', ipa: '/ˌriːˈstɑːt/' } ] }
      ]
    },
    {
      id: 'affricate', name: '破擦音', icon: '🌪️',
      desc: '先憋住再摩擦放开——爆破+摩擦合体',
      sounds: [
        { sym: 'tʃ', tip: '舌尖抵上齿龈憋气摩擦弹开——"吃"，但嘴角向两边、不卷舌', words: [
          { w: 'chair', ipa: '/tʃeə(r)/' }, { w: 'teach', ipa: '/tiːtʃ/' }, { w: 'watch', ipa: '/wɒtʃ/' } ] },
        { sym: 'dʒ', tip: '同 /tʃ/ 但声带振动——"之"的振动版', words: [
          { w: 'jeans', ipa: '/dʒiːnz/' }, { w: 'advantage', ipa: '/ədˈvɑːntɪdʒ/' }, { w: 'budget', ipa: '/ˈbʌdʒɪt/' } ] },
        { sym: 'tr', tip: '咬着 /r/ 的圆唇姿势发 /t/——卷舌的"出"，圆唇是关键', words: [
          { w: 'traditional', ipa: '/trəˈdɪʃənl/' }, { w: 'tree', ipa: '/triː/' }, { w: 'try', ipa: '/traɪ/' } ] },
        { sym: 'dr', tip: '咬着 /r/ 的圆唇姿势发 /d/——卷舌的"珠"', words: [
          { w: 'drop', ipa: '/drɒp/' }, { w: 'dream', ipa: '/driːm/' }, { w: 'drink', ipa: '/drɪŋk/' } ] },
        { sym: 'ts', tip: '舌尖抵上齿龈直接送气——"次"去掉元音，短促', words: [
          { w: 'cats', ipa: '/kæts/' }, { w: 'boats', ipa: '/bəʊts/' }, { w: 'meets', ipa: '/miːts/' } ] },
        { sym: 'dz', tip: '同 /ts/ 但声带振动——"字"去掉元音带振动', words: [
          { w: 'birds', ipa: '/bɜːdz/' }, { w: 'beds', ipa: '/bedz/' }, { w: 'needs', ipa: '/niːdz/' } ] }
      ]
    },
    {
      id: 'other', name: '鼻音 · 半元音 · 边音', icon: '🎵',
      desc: '声音从鼻腔或舌侧走的特殊音——中文里没有的要多练',
      sounds: [
        { sym: 'm', tip: '双唇闭合，声音从鼻腔出——闭着嘴也能哼出"姆"', words: [
          { w: 'mechanic', ipa: '/məˈkænɪk/' }, { w: 'film', ipa: '/fɪlm/' }, { w: 'harmony', ipa: '/ˈhɑːməni/' } ] },
        { sym: 'n', tip: '舌尖抵上齿龈，声音从鼻腔出——"恩"', words: [
          { w: 'newspaper', ipa: '/ˈnjuːzpeɪpə(r)/' }, { w: 'tunnel', ipa: '/ˈtʌnl/' }, { w: 'environment', ipa: '/ɪnˈvaɪrənmənt/' } ] },
        { sym: 'ŋ', tip: '舌根顶软腭，声音从鼻腔出——中文没有！像"嗯"的后鼻加长', words: [
          { w: 'climbing', ipa: '/ˈklaɪmɪŋ/' }, { w: 'crossing', ipa: '/ˈkrɒsɪŋ/' }, { w: 'anxious', ipa: '/ˈæŋkʃəs/' } ] },
        { sym: 'w', tip: '双唇收圆前突再快速张开——"乌"滑向下一个音', words: [
          { w: 'wetsuit', ipa: '/ˈwetsuːt/' }, { w: 'railway', ipa: '/ˈreɪlweɪ/' }, { w: 'western', ipa: '/ˈwestən/' } ] },
        { sym: 'j', tip: '嘴角咧开像 /iː/，快速滑向下一个音——"衣"当滑板', words: [
          { w: 'view', ipa: '/vjuː/' }, { w: 'curious', ipa: '/ˈkjʊəriəs/' }, { w: 'newspaper', ipa: '/ˈnjuːzpeɪpə(r)/' } ] },
        { sym: 'l', tip: '舌尖抵上齿龈，声音从舌两侧出——"勒"；词尾时舌尖抵住只收气流', words: [
          { w: 'librarian', ipa: '/laɪˈbreəriən/' }, { w: 'law', ipa: '/lɔː/' }, { w: 'tunnel', ipa: '/ˈtʌnl/' } ] }
      ]
    }
  ]
};

/* Node 测试环境兼容 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VG_PHONETICS;
}
