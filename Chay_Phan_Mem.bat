@echo off
chcp 65001 >nul
title HỆ THỐNG KHO & QUẢN LÝ VIDEO - TƯỜNG VY ADMIN
cd /d "%~dp0"
cls

echo ===============================================================================
echo        👑 HỆ THỐNG KHO & QUẢN LÝ VIDEO - TƯỜNG VY ADMIN
echo ===============================================================================
echo.

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] CHƯA TÌM THẤY PYTHON TRÊN MÁY TÍNH NÀY!
    echo.
    echo Vui lòng cài đặt Python (tải miễn phí tại https://www.python.org/downloads/)
    echo * LƯU Ý KHI CÀI: Nhớ tích chọn ô "Add Python to PATH" ở bước đầu tiên!
    echo.
    pause
    exit /b
)

echo [+] Đang kiểm tra thư viện hệ thống...
python -c "import fastapi, uvicorn, jinja2, openpyxl, aiofiles" >nul 2>nul
if %errorlevel% neq 0 (
    echo [+] Đang tự động cài đặt thư viện cần thiết (chỉ chạy 1 lần đầu tiên)...
    pip install -r requirements.txt
    echo [+] Cài đặt hoàn tất!
    echo.
)

echo [+] Đang khởi động máy chủ...
echo.

start "" "http://localhost:8000"

python app.py

pause
