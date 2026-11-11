@echo off
title Update Otomatis Portfolio M. Hafidz Ardan ke GitHub
echo ========================================================
echo   M. HAFIDZ ARDAN - 1-KLIK SINKRONISASI KE GITHUB
echo ========================================================
echo.
echo Sedang menyimpan database dan mengunggah foto terbaru...
git add .
git commit -m "update: sinkronisasi foto dan karya terbaru"
git push origin main
echo.
echo ========================================================
echo   BERHASIL! Website online Anda di GitHub Pages
echo   akan otomatis ter-update dalam 1 menit:
echo   https://ardan2056.github.io/hafidz-360-portfolio/
echo ========================================================
echo.
pause

