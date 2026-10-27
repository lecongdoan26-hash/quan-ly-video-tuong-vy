@echo off
chcp 65001 >nul
title MỞ TƯỜNG LỬA WINDOWS ĐỂ KẾT NỐI MẠNG LAN
cls

:: Kiểm tra quyền Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Dang yeu cau quyen Administrator...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~fn0\"' -Verb RunAs"
    exit /b
)

echo =====================================================================
echo    🔓 ĐANG MỞ CỔNG TƯỜNG LỬA (PORT 8000) CHO MẠNG LAN / WIFI
echo =====================================================================
echo.
netsh advfirewall firewall delete rule name="PhanMemVideo" >nul 2>&1
netsh advfirewall firewall add rule name="PhanMemVideo" dir=in action=allow protocol=TCP localport=8000

echo.
echo =====================================================================
echo    ✅ THÀNH CÔNG! ĐÃ MỞ TƯỜNG LỬA CHO CỔNG 8000
echo    👉 Bây giờ Sếp và Nhân viên trên cùng mạng Wi-Fi có thể kết nối
echo       vào phần mềm mượt mà mà không bị Windows chặn lại!
echo =====================================================================
echo.
pause
