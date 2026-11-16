#!/usr/bin/env python3
"""WordPress プラグインの zip（dist/happy-densen-assess.zip）を作る。

wordpress-plugin/happy-densen-assess/ の PHP と、assess/ の embed.js / style.css / img/ を
1つのフォルダにまとめて zip にする。再生成: python3 build_wp_plugin.py
config.js は入れない（設定は WordPress の管理画面から渡す）。

画像はページを開くたびに全部読み込まれるので、ここで WebP に変換して軽くする
（2026-11-10 時点で約7.7MB → 約2.3MB）。embed.js の画像名も .webp に書き換える。
元の PNG/JPEG のまま入れたいときは  python3 build_wp_plugin.py --no-webp
"""
import pathlib, re, shutil, subprocess, sys, zipfile
from PIL import Image

USE_WEBP = "--no-webp" not in sys.argv

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "wordpress-plugin" / "happy-densen-assess"
ASSESS = ROOT / "assess"
OUT_DIR = ROOT / "dist" / "wp" / "happy-densen-assess"
OUT_ZIP = ROOT / "dist" / "happy-densen-assess.zip"
# 画面で使っていない旧画像は入れない
SKIP_IMAGES = {"happy-logo.png", "logo.png", "wire-product.jpg"}

if OUT_DIR.exists():
    shutil.rmtree(OUT_DIR)
(OUT_DIR / "assets" / "img").mkdir(parents=True)

for f in SRC.iterdir():
    if f.is_file():
        shutil.copy2(f, OUT_DIR / f.name)
for name in ("embed.js", "style.css"):
    shutil.copy2(ASSESS / name, OUT_DIR / "assets" / name)


def to_webp(src, dest):
    """透過のある画像は透過を保ったまま、写真は通常の画質で WebP にする。"""
    im = Image.open(src)
    if im.mode in ("RGBA", "LA", "P"):
        im.convert("RGBA").save(dest, "WEBP", quality=86, method=6, alpha_quality=90)
    else:
        im.convert("RGB").save(dest, "WEBP", quality=84, method=6)


# git で管理している画像だけを入れる（作業中の未追跡ファイルを混ぜない）
tracked = subprocess.run(["git", "-c", "core.quotepath=off", "ls-files", "assess/img"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split("\n")
count = 0
renamed = {}
for rel in filter(None, tracked):
    p = ROOT / rel
    sub = p.relative_to(ASSESS / "img")
    if sub.as_posix() in SKIP_IMAGES:
        continue
    dest = OUT_DIR / "assets" / "img" / sub
    dest.parent.mkdir(parents=True, exist_ok=True)
    if USE_WEBP:
        to_webp(p, dest.with_suffix(".webp"))
        renamed[sub.as_posix()] = sub.with_suffix(".webp").as_posix()
    else:
        shutil.copy2(p, dest)
    count += 1

if USE_WEBP:
    js_path = OUT_DIR / "assets" / "embed.js"
    js = js_path.read_text(encoding="utf-8")
    for old, new in renamed.items():
        js = js.replace(f'"{old}"', f'"{new}"')
    js = js.replace("`digits/${n}.png`", "`digits/${n}.webp`")
    left = re.findall(r'"[a-z0-9/_-]+\.(?:png|jpg)"|`digits/\$\{n\}\.png`', js)
    assert not left, f"WebP に置き換えられなかった画像参照: {left}"
    js_path.write_text(js, encoding="utf-8")

if OUT_ZIP.exists():
    OUT_ZIP.unlink()
with zipfile.ZipFile(OUT_ZIP, "w", zipfile.ZIP_DEFLATED) as z:
    for p in sorted(OUT_DIR.rglob("*")):
        if p.is_file() and p.name != ".DS_Store":
            z.write(p, pathlib.Path("happy-densen-assess") / p.relative_to(OUT_DIR))
print(f"images: {count}" + (" (WebP)" if USE_WEBP else ""))
size = sum(p.stat().st_size for p in (OUT_DIR / "assets" / "img").rglob("*") if p.is_file())
print(f"images total: {size / 1024 / 1024:.2f} MB")
print(f"wrote {OUT_ZIP.relative_to(ROOT)} ({OUT_ZIP.stat().st_size / 1024 / 1024:.1f} MB)")
