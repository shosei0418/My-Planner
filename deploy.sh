#!/bin/bash
cp ~/Downloads/App.jsx ~/Desktop/my-planner/src/App.jsx
cd ~/Desktop/my-planner
git add .
git commit -m "update"
git push origin main
echo "✅ デプロイ完了！"
