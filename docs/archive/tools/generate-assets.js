/* ============================================================
 * 词汇生长 — 全量视觉素材生成器
 * 产出 40 件 SVG：8 词群场景 + 20 OPD 主题 + 8 徽章 + 3 空状态 + 1 引导主视觉
 * 用法：node generate-assets.js  →  输出到 app/assets/art/
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const OUT = path.join(__dirname, 'app', 'assets', 'art');
fs.mkdirSync(OUT, { recursive: true });

/* ---------- 通用工具 ---------- */
function svgWrap(w, h, body) { return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${body}</svg>`; }
function rect(x, y, w, h, fill, rx) { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${rx ? ` rx="${rx}"` : ''}/>`; }
function circle(cx, cy, r, fill, extra) { return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${extra ? ' ' + extra : ''}/>`; }
function ellipse(cx, cy, rx, ry, fill, extra) { return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${extra ? ' ' + extra : ''}/>`; }
function pathEl(d, fill, extra) { return `<path d="${d}" fill="${fill}"${extra ? ' ' + extra : ''}/>`; }
function gradDef(id, stops) { return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"/>`).join('')}</linearGradient>`; }
function sceneBg(id, skyTop, skyBot, groundY, groundFill) {
  return `<defs>${gradDef(id + '_sky', [[0, skyTop], [1, skyBot]])}</defs>` +
    rect(0, 0, 800, 300, `url(#${id}_sky)`) +
    (groundFill ? rect(0, groundY, 800, 300 - groundY, groundFill) : '');
}
function cloud(x, y, s, o) {
  return `<g transform="translate(${x},${y}) scale(${s || 1})" opacity="${o || 0.85}">` +
    ellipse(0, 0, 38, 14, '#fff') + ellipse(22, -6, 26, 11, '#fff') + ellipse(-20, -4, 22, 10, '#fff') + `</g>`;
}

/* ============================================================
 * A. 8 张词群场景插画（800×300）
 * ============================================================ */
const groups = {
  'g-ocean': svgWrap(800, 300,
    `<defs>${gradDef('o_sky', [[0, '#81D4FA'], [1, '#E1F5FE']])}${gradDef('o_sea', [[0, '#29B6F6'], [1, '#01579B']])}</defs>` +
    rect(0, 0, 800, 300, 'url(#o_sky)') +
    circle(680, 55, 38, '#FFF176', 'opacity=.9') +
    cloud(120, 55, 1.2, 0.7) + cloud(420, 40, 0.8, 0.5) +
    pathEl('M580 190 Q640 150 700 190 Q740 210 780 190 L800 190 L800 210 L580 210 Z', '#00796B', 'opacity=.6') +
    pathEl('M0 190 Q100 175 200 190 T400 190 T600 190 T800 190 V300 H0 Z', 'url(#o_sea)') +
    pathEl('M0 225 Q120 210 240 225 T480 225 T720 225 T800 225 V300 H0 Z', '#0277BD', 'opacity=.7') +
    /* 海豚 */
    pathEl('M540 115 Q570 75 620 82 Q640 85 650 78 Q640 100 615 108 Q580 118 560 130 Q545 138 540 130 Q535 120 540 115 Z', '#26C6DA') +
    pathEl('M575 78 Q585 65 600 68 Q592 76 582 82 Z', '#00ACC1') +
    circle(628, 84, 3.5, '#006064') +
    circle(535, 135, 5, '#B3E5FC', 'opacity=.7') + circle(548, 142, 4, '#B3E5FC', 'opacity=.5') +
    /* 潜水员 */
    `<g transform="translate(230,155) rotate(15)">` +
    ellipse(0, 0, 28, 12, '#37474F') + circle(32, -4, 10, '#FFCC80') +
    `<rect x="38" y="-8" width="14" height="8" rx="3" fill="#263238"/>` +
    `<rect x="46" y="-10" width="16" height="10" rx="4" fill="#546E7A"/>` +
    pathEl('M-26 8 l-12 20 8 4 12-18 Z', '#263238') + pathEl('M-14 12 l-14 22 8 4 14-20 Z', '#455A64') +
    `</g>` +
    ellipse(212, 240, 60, 8, '#01579B', 'opacity=.5') +
    /* 沉船宝藏 */
    pathEl('M60 250 l70 0 -18 50 -42 0 Z', '#6D4C41') +
    `<rect x="68" y="216" width="54" height="12" rx="4" fill="#4E342E"/>` +
    `<path d="M80 236 v-20 h5 v20 M118 236 v-20 h5 v20" stroke="#4E342E" stroke-width="5"/>` +
    circle(98, 278, 9, '#FFD54F', 'stroke="#F9A825" stroke-width="2"') +
    circle(120, 282, 7, '#FFD54F', 'stroke="#F9A825" stroke-width="2"') +
    `<circle cx="300" cy="120" r="6" fill="none" stroke="#B3E5FC" stroke-width="1.5" opacity=".6"/>` +
    `<circle cx="330" cy="95" r="4" fill="none" stroke="#B3E5FC" stroke-width="1.5" opacity=".5"/>`
  ),
  'g-mountain': svgWrap(800, 300,
    `<defs>${gradDef('m_sky', [[0, '#B2DFDB'], [1, '#E0F2F1']])}</defs>` +
    rect(0, 0, 800, 300, 'url(#m_sky)') +
    cloud(100, 50, 1.3, 0.7) + cloud(550, 35, 1.0, 0.55) + cloud(700, 65, 0.7, 0.4) +
    pathEl('M-20 300 L120 130 L240 240 L340 160 L480 300 Z', '#90A4AE', 'opacity=.55') +
    pathEl('M600 300 L720 140 L820 280 Z', '#78909C', 'opacity=.6') +
    pathEl('M60 300 L300 50 L420 180 L540 80 L740 300 Z', '#546E7A') +
    pathEl('M262 88 L300 50 L342 92 L322 80 L300 94 L278 78 Z', '#ECEFF1') +
    pathEl('M506 118 L540 80 L578 120 L558 106 L540 122 L522 104 Z', '#ECEFF1') +
    `<path d="M300 50 L340 120 L400 170 M540 80 L500 160" stroke="#455A64" stroke-width="2" fill="none" opacity=".4"/>` +
    `<g transform="translate(470,190)">` +
    circle(0, 0, 9, '#FF7043') +
    `<rect x="-6" y="10" width="12" height="26" rx="5" fill="#37474F"/>` +
    `<rect x="-4" y="35" width="4" height="22" fill="#263238"/><rect x="2" y="35" width="4" height="22" fill="#263238"/>` +
    `<rect x="-14" y="14" width="6" height="18" rx="3" fill="#455A64"/><rect x="9" y="14" width="6" height="18" rx="3" fill="#455A64"/>` +
    `<line x1="8" y1="20" x2="24" y2="10" stroke="#455A64" stroke-width="4"/>` +
    `<rect x="24" y="-24" width="3" height="44" fill="#CFD8DC"/>` +
    pathEl('M27 -24 l22 7 -22 7 Z', '#EF5350') +
    `</g>` +
    circle(180, 240, 8, '#616161') + circle(200, 255, 5, '#757575') +
    rect(0, 270, 800, 30, '#E0F2F1', 0, 'opacity=.5')
  ),
  'g-road': svgWrap(800, 300,
    `<defs>${gradDef('r_sky', [[0, '#FFE0B2'], [1, '#FFF8E1']])}${gradDef('r_road', [[0, '#607D8B'], [1, '#455A64']])}</defs>` +
    rect(0, 0, 800, 300, 'url(#r_sky)') +
    circle(650, 80, 48, '#FFB74D', 'opacity=.95') +
    `<path d="M60 60 h200 v130 h-200 Z" fill="#37474F"/>` +
    pathEl('M50 60 L160 15 L270 60 Z', '#263238') +
    pathEl('M130 190 q0 -50 30 -50 q30 0 30 50 Z', '#B0BEC5') +
    `<rect x="80" y="90" width="50" height="50" rx="4" fill="#FFE082"/><rect x="190" y="90" width="50" height="50" rx="4" fill="#FFE082"/>` +
    pathEl('M-20 190 L340 190 L420 130 L800 130 L800 300 L-20 300 Z', '#AED581') +
    pathEl('M0 210 L370 210 L450 150 L800 150 L800 300 L0 300 Z', 'url(#r_road)') +
    `<path d="M0 260 L380 260 L455 195 L800 195" stroke="#FFF" stroke-width="6" stroke-dasharray="36 28" fill="none"/>` +
    `<line x1="560" y1="130" x2="560" y2="70" stroke="#5D4037" stroke-width="5"/><line x1="540" y1="82" x2="580" y2="82" stroke="#5D4037" stroke-width="4"/>` +
    `<line x1="660" y1="140" x2="660" y2="85" stroke="#5D4037" stroke-width="5"/>` +
    `<path d="M600 60 q10 -12 20 0 q10 -12 20 0" stroke="#546E7A" stroke-width="4" fill="none"/>` +
    `<path d="M700 45 q8 -10 16 0 q8 -10 16 0" stroke="#546E7A" stroke-width="3.5" fill="none"/>` +
    `<rect x="100" y="230" width="120" height="10" rx="5" fill="#FFCA28" opacity=".7"/>`
  ),
  'g-jobs': svgWrap(800, 300,
    rect(0, 0, 800, 300, '#E8EAF6') +
    `<rect x="50" y="70" width="310" height="190" rx="14" fill="#fff"/>` +
    `<rect x="50" y="70" width="310" height="46" rx="14" fill="#3949AB"/><rect x="50" y="98" width="310" height="18" fill="#3949AB"/>` +
    circle(80, 93, 7, '#EF5350') + circle(104, 93, 7, '#FFCA28') + circle(128, 93, 7, '#66BB6A') +
    `<rect x="80" y="142" width="250" height="14" rx="7" fill="#C5CAE9"/><rect x="80" y="172" width="190" height="14" rx="7" fill="#E8EAF6"/><rect x="80" y="202" width="220" height="14" rx="7" fill="#E8EAF6"/>` +
    `<g transform="translate(440,60)"><rect width="260" height="180" rx="18" fill="#3949AB"/><circle cx="130" cy="100" r="52" fill="#283593"/><circle cx="130" cy="100" r="36" fill="#5C6BC0"/><circle cx="130" cy="100" r="20" fill="#9FA8DA"/><circle cx="130" cy="100" r="8" fill="#E8EAF6"/><rect x="40" y="8" width="60" height="14" rx="7" fill="#283593"/><rect x="140" y="8" width="70" height="14" rx="7" fill="#283593"/><rect x="106" y="-6" width="48" height="20" rx="8" fill="#FFCA28"/></g>` +
    `<g transform="translate(600,190)"><rect width="24" height="70" rx="12" fill="#455A64"/><circle cx="12" cy="-8" r="24" fill="#3949AB"/><circle cx="12" cy="-8" r="16" fill="#5C6BC0"/><circle cx="12" cy="-8" r="7" fill="#C5CAE9"/></g>` +
    `<g transform="translate(700,50)"><rect width="70" height="200" rx="6" fill="#C5CAE9"/><rect x="8" y="10" width="16" height="55" fill="#5C6BC0"/><rect x="28" y="5" width="14" height="60" fill="#EF5350"/><rect x="46" y="12" width="18" height="53" fill="#66BB6A"/><rect x="8" y="75" width="54" height="8" fill="#9FA8DA"/><rect x="8" y="88" width="18" height="52" fill="#FFCA28"/><rect x="30" y="82" width="16" height="58" fill="#4DB6AC"/></g>`
  ),
  'g-daily': svgWrap(800, 300,
    rect(0, 0, 800, 300, '#FFF8E1') + rect(0, 220, 800, 80, '#FFE082', 0, 'opacity=.6') +
    `<g transform="translate(140,60)"><path d="M20 20 q-50 -60 30 -48 q40 -52 88 -8 q66 -24 56 34 q42 16 4 44 l-10 6 -168 6 q-24 -6 -20 -34 Z" fill="#5C6BC0"/><path d="M30 26 q64 -18 122 -4 l-6 46 q-56 -12 -110 2 Z" fill="#7986CB"/><path d="M40 28 l-8 -30 q-18 -32 10 -30 q18 2 16 26 M280 22 l10 -28 q16 -32 -10 -30 q-18 2 -16 26" stroke="#5C6BC0" stroke-width="8" fill="none"/><rect x="30" y="24" width="120" height="14" rx="7" fill="#3F51B5"/><circle cx="90" cy="31" r="6" fill="#FFCA28"/></g>` +
    `<g transform="translate(400,80)"><rect width="170" height="110" rx="14" fill="#455A64"/><rect x="55" y="0" width="60" height="20" rx="8" fill="#455A64"/><circle cx="85" cy="70" r="42" fill="#263238"/><circle cx="85" cy="70" r="30" fill="#4FC3F7"/><circle cx="73" cy="58" r="10" fill="#B3E5FC"/><circle cx="97" cy="82" r="6" fill="#0288D1"/><circle cx="150" cy="36" r="8" fill="#EF5350"/><rect x="10" y="24" width="24" height="10" rx="5" fill="#FFCA28"/></g>` +
    `<g transform="translate(630,70)"><rect width="130" height="160" fill="#fff" stroke="#CFD8DC" stroke-width="2"/><circle cx="95" cy="30" r="18" fill="#FFAB91"/><rect x="10" y="14" width="60" height="9" rx="4" fill="#90A4AE"/><rect x="10" y="30" width="70" height="7" rx="3" fill="#CFD8DC"/><rect x="10" y="50" width="100" height="55" fill="#ECEFF1"/><path d="M20 95 l25 -20 30 25 -10 15 -40 0 Z" fill="#66BB6A"/><rect x="10" y="115" width="90" height="7" rx="3" fill="#CFD8DC"/></g>`
  ),
  'g-mood': svgWrap(800, 300,
    `<defs>${gradDef('md_sky', [[0, '#F3E5F5'], [1, '#EDE7F6']])}</defs>` +
    rect(0, 0, 800, 300, 'url(#md_sky)') +
    circle(130, 90, 48, '#FFD54F') +
    `<g stroke="#FFD54F" stroke-width="8" stroke-linecap="round"><path d="M130 20 v-16 M130 196 v-16 M200 90 h16 M44 90 h16 M179 41 l12 -12 M67 153 l-12 12 M179 139 l12 12 M67 27 l-12 -12"/></g>` +
    ellipse(420, 70, 68, 24, '#B39DDB') + ellipse(480, 58, 50, 20, '#D1C4E9') +
    `<path d="M100 240 Q220 160 340 226 Q460 292 580 200 Q660 148 740 180" stroke="#7E57C2" stroke-width="9" fill="none" stroke-linecap="round"/>` +
    circle(340, 226, 12, '#FFD54F') + circle(580, 200, 12, '#EF5350') +
    `<g transform="translate(680,70)"><circle r="36" fill="#B39DDB"/><circle cx="-12" cy="-7" r="5" fill="#4527A0"/><circle cx="12" cy="-7" r="5" fill="#4527A0"/><path d="M-15 8 q15 14 30 0" stroke="#4527A0" stroke-width="4.5" fill="none" stroke-linecap="round"/></g>` +
    `<g transform="translate(300,60)"><circle cx="0" cy="-20" r="14" fill="#FFCC80"/><rect x="-12" y="-6" width="24" height="36" rx="10" fill="#7E57C2"/><text x="24" y="-24" font-size="20" fill="#7E57C2">💡</text></g>`
  ),
  'g-talk': svgWrap(800, 300,
    rect(0, 0, 800, 300, '#E0F2E9') +
    pathEl('M110 60 h250 q28 0 28 26 v76 q0 28 -28 28 h-150 l-44 44 v-40 h-48 q-28 0 -28 -26 v-76 q0 -26 26 -26 Z', '#2E7D32') +
    `<rect x="150" y="94" width="160" height="14" rx="7" fill="#A5D6A7"/><rect x="150" y="126" width="200" height="14" rx="7" fill="#A5D6A7"/><rect x="150" y="158" width="110" height="14" rx="7" fill="#C8E6C9"/>` +
    pathEl('M640 108 h-180 q-24 0 -24 24 v62 q0 24 24 24 h130 l38 38 v-38 h22 q24 0 24 -24 v-62 q0 -24 -24 -24 Z', '#fff') +
    `<rect x="470" y="140" width="150" height="13" rx="6.5" fill="#C8E6C9"/><rect x="470" y="168" width="170" height="13" rx="6.5" fill="#E8F5E9"/>` +
    `<g transform="translate(690,170)"><circle r="28" fill="#A5D6A7"/><circle cx="-10" cy="-7" r="4.5" fill="#1B5E20"/><circle cx="10" cy="-7" r="4.5" fill="#1B5E20"/><path d="M-14 6 q14 12 28 0" stroke="#1B5E20" stroke-width="4" fill="none" stroke-linecap="round"/></g>` +
    pathEl('M480 50 l30 0 -12 30 22 0 -36 46 10 -32 -20 0 Z', '#FFD54F') +
    circle(220, 200, 6, '#C8E6C9') + circle(245, 200, 6, '#A5D6A7') + circle(270, 200, 6, '#81C784')
  ),
  'g-world': svgWrap(800, 300,
    `<defs>${gradDef('w_sky', [[0, '#D1C4E9'], [1, '#EDE7F6']])}</defs>` +
    rect(0, 0, 800, 300, 'url(#w_sky)') +
    circle(380, 150, 100, '#4FC3F7') +
    pathEl('M310 100 q45 -28 78 -6 q-16 30 -55 26 q-34 -8 -23 -20 Z', '#81C784') +
    pathEl('M415 145 q55 -16 72 20 q-33 28 -72 13 q-18 -18 0 -33 Z', '#81C784') +
    pathEl('M348 205 q33 26 76 13 q-11 28 -48 22 q-28 -9 -28 -35 Z', '#81C784') +
    `<path d="M400 52 a100 100 0 0 1 96 72" stroke="#A5D6A7" stroke-width="5" fill="none" opacity=".65"/>` +
    `<path d="M290 215 a100 100 0 0 1 -5 -115" stroke="#A5D6A7" stroke-width="5" fill="none" opacity=".65"/>` +
    `<g transform="translate(580,70) rotate(12)"><path d="M0 0 l80 -8 -14 12 30 4 -40 20 8 -18 -50 4 Z" fill="#FFCA28"/></g>` +
    pathEl('M640 160 l28 0 -12 30 24 0 -38 48 10 -34 -22 0 Z', '#FFD54F') +
    ellipse(150, 250, 60, 14, '#B39DDB', 'opacity=.5') + ellipse(650, 260, 78, 16, '#B39DDB', 'opacity=.5')
  )
};

/* ============================================================
 * B. 20 张 OPD 主题横幅
 * ============================================================ */
function opdBanner(emoji, c1, c2, label) {
  return svgWrap(800, 200,
    `<defs>${gradDef('bg', [[0, c1], [1, c2]], 1)}</defs>` +
    rect(0, 0, 800, 200, 'url(#bg)') +
    `<circle cx="700" cy="40" r="80" fill="#fff" opacity=".08"/><circle cx="100" cy="170" r="60" fill="#fff" opacity=".06"/>` +
    `<text x="60" y="130" font-size="80">${emoji}</text>` +
    `<text x="740" y="120" font-size="36" fill="rgba(255,255,255,.85)" text-anchor="end" font-family="Arial" font-weight="bold" letter-spacing="3">${label}</text>`
  );
}
const opdThemes = [
  ['smalltalk', '💬', '#F48FB1', '#FF8A65', 'SMALL TALK'],
  ['weather', '⛅', '#90CAF9', '#5C6BC0', 'WEATHER'],
  ['opposites', '🔀', '#CE93D8', '#4DB6AC', 'OPPOSITES'],
  ['family', '👨‍👩‍👧', '#FFCC80', '#FF8A65', 'FAMILY'],
  ['morning', '🌅', '#FFE082', '#FFAB40', 'MORNING'],
  ['evening', '🌙', '#7986CB', '#4527A0', 'EVENING'],
  ['feelings', '🩹', '#80CBC4', '#26A69A', 'HOW YOU FEEL'],
  ['emotions', '😄', '#FFF176', '#FF8A80', 'EMOTIONS'],
  ['kitchen', '🍳', '#FFCC80', '#D4A017', 'KITCHEN'],
  ['food', '🍎', '#EF9A9A', '#66BB6A', 'FOOD'],
  ['clothes', '👕', '#9FA8DA', '#3949AB', 'CLOTHES'],
  ['body', '💪', '#4DD0E1', '#0097A7', 'THE BODY'],
  ['aches', '🤒', '#FFAB91', '#E57373', 'ACHES'],
  ['places', '🏙️', '#90A4AE', '#455A64', 'PLACES'],
  ['transport', '🚌', '#81D4FA', '#0288D1', 'TRANSPORT'],
  ['airport', '✈️', '#B0BEC5', '#37474F', 'AIRPORT'],
  ['jobs', '💼', '#9FA8DA', '#283593', 'JOBS'],
  ['fun', '🎡', '#F48FB1', '#AB47BC', 'FUN PLACES'],
  ['outdoors', '🏕️', '#A5D6A7', '#33691E', 'OUTDOORS'],
  ['sports', '⚽', '#C5E1A5', '#558B2F', 'SPORTS'],
];

/* ============================================================
 * C. 8 枚成就徽章
 * ============================================================ */
function badge(inner, label) {
  return svgWrap(128, 128,
    `<defs>${gradDef('bg', [[0, '#66BB6A'], [1, '#2E7D32']], 1)}</defs>` +
    `<circle cx="64" cy="64" r="60" fill="url(#bg)" stroke="#1B5E20" stroke-width="3"/>` +
    `<circle cx="64" cy="64" r="52" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="2"/>` +
    `<g transform="translate(64,64)">${inner}</g>` +
    `<text x="64" y="118" font-size="9" fill="#A5D6A7" text-anchor="middle">${label}</text>`
  );
}
const badges = [
  ['badge-first-speak', `<rect x="-14" y="-20" width="12" height="30" rx="6" fill="#fff"/><path d="M2 -14 q14 4 14 14 q0 10 -14 14" stroke="#FFD54F" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M22 -8 q10 8 0 16" stroke="#FFD54F" stroke-width="4" fill="none" stroke-linecap="round"/>`, 'FIRST SPEAK'],
  ['badge-practice-10', `<text x="0" y="8" font-size="32" fill="#FFD54F" text-anchor="middle">10</text><path d="M-24 -20 a28 28 0 0 1 48 0" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M24 20 a28 28 0 0 1 -48 0" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>`, 'PRACTICE ×10'],
  ['badge-streak-7', `<path d="M0 -24 C12 -10 16 2 8 14 C4 20 -4 20 -8 14 C-16 2 -12 -10 0 -24 Z" fill="#FF7043"/><circle cx="0" cy="4" r="6" fill="#FFD54F"/><text x="0" y="36" font-size="16" fill="#FFD54F" text-anchor="middle">7</text>`, 'STREAK ×7'],
  ['badge-score-85', `<path d="M0 -24 L7 -7 L26 -7 L10 4 L16 22 L0 11 L-16 22 L-10 4 L-26 -7 L-7 -7 Z" fill="#FFD54F"/><text x="0" y="38" font-size="14" fill="#fff" text-anchor="middle">85+</text>`, 'SCORE 85+'],
  ['badge-score-95', `<path d="M0 -26 L8 -8 L28 -8 L11 5 L18 24 L0 12 L-18 24 L-11 5 L-28 -8 L-8 -8 Z" fill="#FFD54F" stroke="#F9A825" stroke-width="2"/><circle cx="0" cy="-2" r="5" fill="#fff"/><text x="0" y="38" font-size="14" fill="#FFD54F" text-anchor="middle">95+</text>`, 'SCORE 95+'],
  ['badge-speak-3', `<ellipse cx="-14" cy="0" rx="10" ry="14" fill="#fff"/><ellipse cx="0" cy="0" rx="10" ry="14" fill="#FFD54F"/><ellipse cx="14" cy="0" rx="10" ry="14" fill="#fff"/><text x="0" y="38" font-size="14" fill="#A5D6A7" text-anchor="middle">SPEAK ×3</text>`, 'SPEAK ×3'],
  ['badge-4-modes', `<rect x="-26" y="-26" width="24" height="24" rx="6" fill="#FFD54F"/><rect x="4" y="-26" width="24" height="24" rx="6" fill="#4FC3F7"/><rect x="-26" y="4" width="24" height="24" rx="6" fill="#FF8A80"/><rect x="4" y="4" width="24" height="24" rx="6" fill="#A5D6A7"/>`, '4 MODES'],
  ['badge-10-words', `<rect x="-20" y="-16" width="18" height="24" rx="3" fill="#fff"/><rect x="4" y="-16" width="18" height="24" rx="3" fill="#FFD54F"/><text x="0" y="30" font-size="14" fill="#fff" text-anchor="middle">10 WORDS</text>`, '10 WORDS']
];

/* ============================================================
 * D. 空状态 + 引导主视觉
 * ============================================================ */
const emptyReview = svgWrap(400, 240,
  rect(100, 70, 200, 120, '#E8F5E9', 10) +
  `<rect x="100" y="70" width="200" height="120" rx="10" fill="none" stroke="#A5D6A7" stroke-width="3"/>` +
  `<rect x="120" y="92" width="80" height="8" rx="4" fill="#C8E6C9"/><rect x="120" y="112" width="140" height="8" rx="4" fill="#E8F5E9"/>` +
  `<path d="M270 100 q20 -12 36 2 M280 84 q18 -14 36 -2" stroke="#A5D6A7" stroke-width="5" fill="none" stroke-linecap="round"/>`
);
const emptyWorkshop = svgWrap(400, 240,
  rect(110, 70, 180, 110, '#fff', 10) +
  `<rect x="110" y="70" width="180" height="110" rx="10" fill="none" stroke="#C5CAE9" stroke-width="3"/>` +
  `<rect x="128" y="90" width="100" height="9" rx="4.5" fill="#E8EAF6"/><rect x="128" y="112" width="140" height="9" rx="4.5" fill="#E8EAF6"/>` +
  pathEl('M230 130 l14 14 -28 30 -20 6 6 -20 Z', '#FFD54F') +
  `<path d="M226 134 l14 14" stroke="#F9A825" stroke-width="3.5"/>` +
  `<path d="M290 80 q18 -12 32 0 M300 66 q14 -10 28 0" stroke="#C5CAE9" stroke-width="4.5" fill="none" stroke-linecap="round"/>`
);
const emptyNew = svgWrap(400, 240,
  pathEl('M170 180 q-8 -50 30 -54 q38 -4 30 54 q-4 20 -30 20 q-26 0 -30 -20 Z', '#8D6E63') +
  pathEl('M180 182 q20 -40 40 -2 q-8 18 -20 18 q-12 0 -20 -16 Z', '#6D4C41') +
  `<path d="M200 130 q-6 -30 18 -38 q-4 28 -10 38 M206 130 q10 -24 34 -22 q-8 26 -28 30" stroke="#66BB6A" stroke-width="5" fill="none" stroke-linecap="round"/>` +
  `<path d="M200 128 q0 -18 4 -30" stroke="#43A047" stroke-width="5" fill="none" stroke-linecap="round"/>` +
  `<g transform="translate(280,120)"><rect width="40" height="36" rx="8" fill="#81D4FA"/><path d="M8 30 q14 -18 24 0 Z" fill="#0288D1"/></g>`
);
const onboardingHero = svgWrap(1080, 600,
  `<defs>${gradDef('ob', [[0, '#E8F5E9'], [1, '#C8E6C9']], 1)}${gradDef('ob_h', [[0, '#A5D6A7'], [1, '#66BB6A']], 1)}</defs>` +
  rect(0, 0, 1080, 600, 'url(#ob)') +
  pathEl('M0 480 Q270 380 540 460 Q810 540 1080 440 L1080 600 L0 600 Z', 'url(#ob_h)') +
  `<g transform="translate(540,380)">` +
  pathEl('M0 60 q-4 -80 30 -120 q10 -14 24 -20 l4 14 q-20 20 -28 48 q-14 40 -6 78 Z', '#43A047') +
  pathEl('M4 60 q4 -70 -30 -110 q-10 -12 -22 -18 l-6 14 q18 20 26 46 q14 40 6 68 Z', '#66BB6A') +
  ellipse(0, 70, 50, 10, '#33691E', 'opacity=.3') +
  `</g>` +
  `<g font-family="Arial" font-weight="bold">` +
  `<g transform="translate(120,100)"><rect width="160" height="44" rx="22" fill="#fff" opacity=".92"/><text x="80" y="30" font-size="24" fill="#2E7D32" text-anchor="middle">dolphin 🐬</text></g>` +
  `<g transform="translate(700,70)"><rect width="180" height="44" rx="22" fill="#fff" opacity=".92"/><text x="90" y="30" font-size="24" fill="#2E7D32" text-anchor="middle">explore 🧭</text></g>` +
  `<g transform="translate(200,280)"><rect width="190" height="44" rx="22" fill="#fff" opacity=".92"/><text x="95" y="30" font-size="24" fill="#2E7D32" text-anchor="middle">connect 🔗</text></g>` +
  `<g transform="translate(740,260)"><rect width="210" height="44" rx="22" fill="#fff" opacity=".92"/><text x="105" y="30" font-size="24" fill="#2E7D32" text-anchor="middle">treasure 💎</text></g>` +
  `<g transform="translate(440,50)"><rect width="200" height="44" rx="22" fill="#FFD54F" opacity=".92"/><text x="100" y="30" font-size="24" fill="#1B5E20" text-anchor="middle">speak up! 🎤</text></g>` +
  `</g>` +
  circle(80, 560, 6, '#66BB6A', 'opacity=.5') + circle(1000, 540, 8, '#A5D6A7', 'opacity=.4')
);

/* ============================================================
 * 写出全部文件
 * ============================================================ */
let count = 0;
function write(name, content) {
  fs.writeFileSync(path.join(OUT, name), content);
  count++;
}

/* A. 词群（覆盖旧版） */
Object.keys(groups).forEach(k => write(k + '.svg', groups[k]));

/* B. OPD */
opdThemes.forEach(([id, emoji, c1, c2, label]) => write('opd-' + id + '.svg', opdBanner(emoji, c1, c2, label)));

/* C. 徽章 */
badges.forEach(([id, inner, label]) => write('badge-' + id + '.svg', badge(inner, label)));

/* D. 空状态 */
write('g-empty-review.svg', emptyReview);
write('g-empty-workshop.svg', emptyWorkshop);
write('g-empty-new.svg', emptyNew);

/* E. 引导主视觉 */
write('onboarding-hero.svg', onboardingHero);

console.log('✅ 生成完成: ' + count + ' 件 SVG → ' + OUT);
