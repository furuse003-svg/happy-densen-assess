"""裏画像（電線以外／ハゲ頭リアクション）の素材を透過PNG化する
  python3 tools/make_reaction_assets.py
  - 人物（グリーンバック）: クロマキーで透過 → assess/img/nakamura-shock.png / nakamura-self.png（高さ1000）
  - ネオンキャッチ（紺背景）: 枠の外側だけを透過 → assess/img/neon-wrong.png / neon-nakamura.png / neon-happy.png
"""
import os, sys
import numpy as np
from PIL import Image
from collections import deque

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "画像", "裏画像")
OUT = os.path.join(ROOT, "assess", "img")

def chroma_key(path, out, height=1000):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    greenness = g - np.maximum(r, b)            # 純グリーンほど大きい
    lo, hi = 40.0, 110.0                         # lo以下: 不透明 / hi以上: 透明
    alpha = np.clip(1 - (greenness - lo) / (hi - lo), 0, 1)
    alpha[g < 120] = 1                           # 暗い部分はキーしない（黒手袋・ブーツ）
    # スピル除去: 半透明〜縁の緑かぶりを抑える
    spill = np.clip((greenness - 10) / 60, 0, 1) * (alpha < 1)
    g2 = g - spill * (g - np.maximum(r, b))
    rgba = np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)
    res = Image.fromarray(rgba, "RGBA")
    # 透明部分をトリミングして高さを揃える
    bbox = res.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    res = res.crop(bbox)
    w = round(res.width * height / res.height)
    res = res.resize((w, height), Image.LANCZOS)
    res.save(out, optimize=True)
    print(out, res.size)

def neon_cut(path, out, size=None):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.float32)
    H, W = a.shape[:2]
    # 背景色は四隅の平均
    corners = np.concatenate([a[:8, :8].reshape(-1, 3), a[:8, -8:].reshape(-1, 3), a[-8:, :8].reshape(-1, 3), a[-8:, -8:].reshape(-1, 3)])
    bg = corners.mean(0)
    dist = np.sqrt(((a - bg) ** 2).sum(-1))
    T1, T2 = 28.0, 90.0
    cand = dist < T2                              # 背景〜グローの裾野
    # 端から到達できる領域だけ（枠の内側の黒は残す）
    reach = np.zeros((H, W), bool)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if cand[y, x] and not reach[y, x]: reach[y, x] = True; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if cand[y, x] and not reach[y, x]: reach[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y-1, x), (y+1, x), (y, x-1), (y, x+1)):
            if 0 <= ny < H and 0 <= nx < W and cand[ny, nx] and not reach[ny, nx]:
                reach[ny, nx] = True; q.append((ny, nx))
    alpha = np.ones((H, W), np.float32)
    soft = np.clip((dist - T1) / (T2 - T1), 0, 1)
    alpha[reach] = soft[reach]
    # 半透明部分は背景色を差し引いて発光色を取り出す（un-premultiply）
    al = alpha[..., None]
    rgb = np.where(al > 0.02, (a - bg * (1 - al)) / np.maximum(al, 1e-3), a)
    rgba = np.dstack([rgb.clip(0, 255), alpha * 255]).astype(np.uint8)
    res = Image.fromarray(rgba, "RGBA")
    if size: res = res.resize(size, Image.LANCZOS)
    res.save(out, optimize=True)
    print(out, res.size)

if __name__ == "__main__":
    chroma_key(os.path.join(SRC, "ChatGPT Image 2026年9月21日 21_47_48.png"), os.path.join(OUT, "nakamura-shock.png"))
    chroma_key(os.path.join(SRC, "ChatGPT Image 2026年9月21日 21_48_19.png"), os.path.join(OUT, "nakamura-self.png"))
    neon_cut(os.path.join(SRC, "ChatGPT Image 2026年9月21日 21_47_57.png"), os.path.join(OUT, "neon-wrong.png"), (720, 600))
    neon_cut(os.path.join(SRC, "ChatGPT Image 2026年9月21日 21_48_01.png"), os.path.join(OUT, "neon-nakamura.png"), (720, 600))
    neon_cut(os.path.join(ROOT, "画像", "ダウンロード (1).jpeg"), os.path.join(OUT, "neon-happy.png"))
