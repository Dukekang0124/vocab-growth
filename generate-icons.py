#!/usr/bin/env python3
"""
生成Android自适应图标
从512x512源图标生成：
1. 传统launcher图标（mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi）
2. 自适应图标foreground（圆角裁剪）
3. adaptive icon XML配置
"""

from PIL import Image, ImageDraw, ImageFont
import os

# 配置
SOURCE_ICON = "resources/icon-512.png"
OUTPUT_DIR = "resources"
ANDROID_RES_DIR = "../../../英语开口练/capacitor-kaikou/android/app/src/main/res"

# Android图标尺寸配置（传统launcher图标）
DENSITY_SIZES = {
    "mdpi": 48,      # 1x
    "hdpi": 72,      # 1.5x
    "xhdpi": 96,     # 2x
    "xxhdpi": 144,   # 3x
    "xxxhdpi": 192,  # 4x
}

# 自适应图标配置
ADAPTIVE_SIZE = 108  # 108x108（Android 8.0+）
CORNER_RADIUS = 16   # 圆角半径

def create_rounded_launcher_icon(src_path, output_path, size):
    """创建传统圆角launcher图标"""
    with Image.open(src_path) as img:
        # 保持纵横比，居中裁剪
        img = img.resize((size, size), Image.Resampling.LANCZOS)

        # 创建白色背景
        bg = Image.new('RGBA', (size, size), (255, 255, 255, 255))
        bg.paste(img, (0, 0))

        # 绘制圆角
        draw = ImageDraw.Draw(bg)
        draw.rounded_rectangle(
            [0, 0, size - 1, size - 1],
            radius=size // 6,
            fill=(255, 255, 255, 255)
        )

        bg.save(output_path, 'PNG', optimize=True)

def create_adaptive_foreground(src_path, output_path):
    """创建自适应图标foreground（圆角裁剪）"""
    with Image.open(src_path) as img:
        # 裁剪为正方形（中心裁剪）
        w, h = img.size
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        img = img.crop((left, top, left + side, top + side))

        # 调整大小为自适应图标尺寸
        img = img.resize((ADAPTIVE_SIZE, ADAPTIVE_SIZE), Image.Resampling.LANCZOS)

        # 创建圆角矩形（白色背景 + 圆角裁剪）
        bg = Image.new('RGBA', (ADAPTIVE_SIZE, ADAPTIVE_SIZE), (255, 255, 255, 255))

        # 绘制圆角矩形
        draw = ImageDraw.Draw(bg)
        draw.rounded_rectangle(
            [0, 0, ADAPTIVE_SIZE - 1, ADAPTIVE_SIZE - 1],
            radius=CORNER_RADIUS,
            fill=(255, 255, 255, 255)
        )

        # 裁剪圆形区域
        mask = Image.new('L', (ADAPTIVE_SIZE, ADAPTIVE_SIZE), 0)
        mask_draw = ImageDraw.Draw(mask)
        mask_draw.rounded_rectangle(
            [0, 0, ADAPTIVE_SIZE - 1, ADAPTIVE_SIZE - 1],
            radius=ADAPTIVE_SIZE // 2,
            fill=255
        )

        # 应用蒙版
        output = Image.new('RGBA', (ADAPTIVE_SIZE, ADAPTIVE_SIZE), (0, 0, 0, 0))
        output.paste(img, (0, 0), mask)
        output.save(output_path, 'PNG', optimize=True)

def create_adaptive_icon_xml(output_path):
    """创建adaptive icon XML配置"""
    xml_content = f"""<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>"""

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(xml_content)

def main():
    print("开始生成Android自适应图标...")

    # 创建输出目录
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 1. 生成传统launcher图标
    print("\n[1/3] 生成传统launcher图标...")
    for density, size in DENSITY_SIZES.items():
        output_path = os.path.join(OUTPUT_DIR, f"ic_launcher-{density}.png")
        create_rounded_launcher_icon(SOURCE_ICON, output_path, size)
        print(f"  ✓ {density}: {size}x{size}")

    # 2. 生成自适应图标foreground
    print("\n[2/3] 生成自适应图标foreground...")
    adaptive_fg = os.path.join(OUTPUT_DIR, "ic_launcher_foreground.png")
    create_adaptive_foreground(SOURCE_ICON, adaptive_fg)
    print(f"  ✓ 生成: {adaptive_fg}")

    # 3. 创建adaptive icon XML
    print("\n[3/3] 创建adaptive icon XML...")
    xml_path = os.path.join(OUTPUT_DIR, "ic_launcher.xml")
    create_adaptive_icon_xml(xml_path)
    print(f"  ✓ 生成: {xml_path}")

    # 4. 复制到Android资源目录
    print("\n[4/4] 复制到Android资源目录...")
    android_res_dirs = [
        f"{ANDROID_RES_DIR}/mipmap-mdpi",
        f"{ANDROID_RES_DIR}/mipmap-hdpi",
        f"{ANDROID_RES_DIR}/mipmap-xhdpi",
        f"{ANDROID_RES_DIR}/mipmap-xxhdpi",
        f"{ANDROID_RES_DIR}/mipmap-xxxhdpi",
    ]

    for density, size in DENSITY_SIZES.items():
        # 复制launcher图标
        src_launcher = os.path.join(OUTPUT_DIR, f"ic_launcher-{density}.png")
        dst_launcher = os.path.join(android_res_dirs[["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"].index(density)], "ic_launcher.png")
        os.makedirs(os.path.dirname(dst_launcher), exist_ok=True)
        import shutil
        shutil.copy2(src_launcher, dst_launcher)
        print(f"  ✓ {density}: {dst_launcher}")

    # 复制adaptive foreground
    src_adaptive_fg = os.path.join(OUTPUT_DIR, "ic_launcher_foreground.png")
    dst_adaptive_fg = os.path.join(android_res_dirs[2], "ic_launcher_foreground.png")  # xxhdpi
    shutil.copy2(src_adaptive_fg, dst_adaptive_fg)
    print(f"  ✓ adaptive_fg: {dst_adaptive_fg}")

    # 复制adaptive icon XML
    src_xml = os.path.join(OUTPUT_DIR, "ic_launcher.xml")
    dst_xml = os.path.join(android_res_dirs[2], "ic_launcher.xml")  # xxhdpi
    shutil.copy2(src_xml, dst_xml)
    print(f"  ✓ adaptive_xml: {dst_xml}")

    print("\n✅ 所有图标生成完成！")
    print(f"\n注意：还需要创建颜色资源文件 {ANDROID_RES_DIR}/values/colors.xml")
    print("添加内容：")
    print('  <color name="ic_launcher_background">#FFFFFF</color>')

if __name__ == "__main__":
    main()
