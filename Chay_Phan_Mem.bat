@echo off
chcp 65001 >nul
title HỆ THỐNG QUẢN LÝ VÀ BÁO CÁO VIDEO HÀNG NGÀY
cls

echo =====================================================================
echo       🎬 HỆ THỐNG QUẢN LÝ VÀ BÁO CÁO VIDEO HÀNG NGÀY
echo =====================================================================
echo.
echo   [+] Dang khoi dong may chu...
echo.

start "" "http://localhost:8000"

python app.py

pause
