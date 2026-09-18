#!/bin/bash
# ダブルクリックでローカル確認用サーバーを起動します（終了はこのウィンドウを閉じる／Ctrl+C）
cd "$(dirname "$0")"
echo "http://localhost:8765/widget.html を開いてください（Ctrl+C で終了）"
open "http://localhost:8765/widget.html"
python3 -m http.server 8765 --bind 127.0.0.1
