"""英语开口练 · 图标候选生成器（Pillow 版）

旧 gen_icons.py 是逐像素手写光栅化，抗锯齿差 + 图标语义弱（就是个靶心）。
本脚本用 Pillow + 4x 超采样 + LANCZOS 缩回，边缘干净。

设计铁律（三候选共用）：
- 全出血方形底（Android/iOS 自动裁圆角，maskable 需要全出血）
- 图形控制在中心半径 170 内（512 画布），落在 maskable 安全区（中心 80%）内
- 语义 = 开口说话；高对比；小尺寸（48px）仍可辨
"""
import os
from PIL import Image, ImageDraw, ImageFont

S = 4                      # 超采样倍率
SIZE = 512
WHITE = (255, 255, 255)
AMBER_TOP = (248, 178, 58)    # #F8B23A
AMBER_BOT = (233, 136, 7)     # #EA8A07
FONT_BD = r"C:\Windows\Fonts\arialbd.ttf"

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "icons-candidates")


def s(v):
    return int(round(v * S))


def tile(w=SIZE):
    """全出血琥珀渐变底（轻微竖渐变，不喧宾夺主）"""
    W = s(w)
    img = Image.new("RGB", (W, W))
    d = ImageDraw.Draw(img)
    for y in range(W):
        t = y / (W - 1)
        col = tuple(int(AMBER_TOP[i] + (AMBER_BOT[i] - AMBER_TOP[i]) * t) for i in range(3))
        d.line([(0, y), (W, y)], fill=col)
    return img


def waves(d, cx, cy, radii, width, color=WHITE, span=52):
    """向右张开的同心声波弧"""
    for r in radii:
        d.arc([cx - s(r), cy - s(r), cx + s(r), cy + s(r)],
              start=-span, end=span, fill=color, width=s(width))


def icon_a():
    """A「声波气泡」—— 最稳：对话气泡 + 声波，通用可读"""
    img = tile()
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([s(118), s(186), s(322), s(322)], radius=s(34), fill=WHITE)
    d.polygon([(s(152), s(314)), (s(124), s(386)), (s(212), s(318))], fill=WHITE)
    waves(d, s(288), s(254), (40, 78, 116), 20)
    return img


def icon_b():
    """B「开口」—— 最贴品牌：口字形 + 声波外放"""
    img = tile()
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([s(158), s(188), s(302), s(332)], radius=s(20),
                        outline=WHITE, width=s(26))
    waves(d, s(296), s(260), (38, 74, 110), 20)
    return img


def icon_c():
    """C「气泡 A」—— 最“英语”：气泡里嵌字母 A"""
    img = tile()
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([s(118), s(172), s(330), s(338)], radius=s(40), fill=WHITE)
    d.polygon([(s(158), s(330)), (s(126), s(396)), (s(218), s(334))], fill=WHITE)
    f = ImageFont.truetype(FONT_BD, s(150))
    d.text((s(224), s(258)), "A", font=f, fill=AMBER_BOT, anchor="mm")
    return img


def save(img, name, out_dir=OUT_DIR):
    os.makedirs(out_dir, exist_ok=True)
    p512 = os.path.join(out_dir, f"{name}-512.png")
    p192 = os.path.join(out_dir, f"{name}-192.png")
    img.resize((512, 512), Image.LANCZOS).save(p512)
    img.resize((192, 192), Image.LANCZOS).save(p192)
    return p512


def legibility_check(img, name):
    """48/32px 可辨性自检：统计非底色像素占比"""
    for px in (48, 32):
        small = img.resize((px, px), Image.LANCZOS)
        pixels = list(small.getdata())
        corner = pixels[0]
        glyph = sum(1 for p in pixels if abs(p[0] - corner[0]) + abs(p[1] - corner[1]) > 90)
        print(f"  {name} @{px}px  图形像素占比 {glyph/(px*px)*100:5.1f}%")


if __name__ == "__main__":
    specs = [("A-声波气泡", icon_a), ("B-开口", icon_b), ("C-气泡A", icon_c)]
    for name, fn in specs:
        img = fn()
        legibility_check(img, name)
        print("  saved:", save(img, name))
