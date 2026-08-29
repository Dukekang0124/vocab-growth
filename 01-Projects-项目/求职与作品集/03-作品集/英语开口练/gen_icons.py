import struct, zlib, os

BG     = (28, 27, 41, 255)      # #1c1b29 深底
BORDER = (245, 158, 11, 255)    # #f59e0b 橙描边
BUBBLE = (241, 245, 249, 255)   # #f1f5f9 白气泡
ACCENT = (245, 158, 11, 255)    # 橙点

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(4))

def make_icon(size):
    c = size / 2
    r_bubble = size * 0.285
    bx, by = c, size * 0.43
    tail_h = size * 0.12
    tail_w = size * 0.16
    border_w = max(2, int(size * 0.045))
    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            col = BG
            dx, dy = x - bx, y - by
            d = (dx * dx + dy * dy) ** 0.5
            # 气泡主体
            in_bubble = d <= r_bubble
            # 尾部小三角
            in_tail = (by + r_bubble * 0.55) <= y <= (by + r_bubble * 0.55 + tail_h)
            if in_tail:
                t = (y - (by + r_bubble * 0.55)) / tail_h
                hw = tail_w * (1 - t)
                if abs(x - (bx - r_bubble * 0.35)) <= hw:
                    in_tail = True
                else:
                    in_tail = False
            if in_bubble or in_tail:
                col = BUBBLE
                # 橙描边：气泡边缘一圈
                edge = (d >= r_bubble - border_w) and (d <= r_bubble + 1)
                if in_bubble and edge:
                    col = BORDER
            # 气泡内橙点（嘴/声）
            adx, ady = x - bx, y - (by - r_bubble * 0.05)
            if adx * adx + ady * ady <= (r_bubble * 0.26) ** 2:
                col = ACCENT
            row += bytes(col)
        rows.append(row)
    # 编码 PNG (RGBA)
    def chunk(typ, data):
        return (struct.pack(">I", len(data)) + typ + data +
                struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff))
    raw = b"".join(b"\x00" + r for r in rows)
    png = (b"\x89PNG\r\n\x1a\n" +
           chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)) +
           chunk(b"IDAT", zlib.compress(raw, 9)) +
           chunk(b"IEND", b""))
    return png

out = r"D:\写作工具\知识管理\01-Projects-项目\求职与作品集\03-作品集\英语开口练\english-speaking-app"
for s in (192, 512):
    p = os.path.join(out, f"icon-{s}.png")
    with open(p, "wb") as f:
        f.write(make_icon(s))
    print("wrote", p, os.path.getsize(p), "bytes")
