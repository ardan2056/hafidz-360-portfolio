@echo off
title M. Hafidz Ardan - 360 Portfolio Server
cd /d "%~dp0"
echo ===================================================
echo Menjalankan Server Portfolio 360 M. Hafidz Ardan...
echo ===================================================
start http://localhost:3000
node server.js
pause

