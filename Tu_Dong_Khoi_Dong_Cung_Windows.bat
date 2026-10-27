@echo off
chcp 65001 >nul
title CÀI ĐẶT TỰ ĐỘNG CHẠY PHẦN MỀM KHI BẬT MÁY
cls

echo =====================================================================
echo    🚀 TỰ ĐỘNG KHỞI ĐỘNG PHẦN MỀM VIDEO CÙNG WINDOWS
echo =====================================================================
echo.

set SCRIPT_DIR=%~dp0
set BAT_FILE=%SCRIPT_DIR%Chay_Phan_Mem.bat
set SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\KhoVideo_TuDong.lnk

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%BAT_FILE%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Save()"

echo.
echo    ✅ ĐÃ CÀI ĐẶT THÀNH CÔNG!
echo    👉 Từ bây giờ, mỗi khi bạn bật máy tính, phần mềm sẽ tự động
echo       chạy ngầm để Sếp và Nhân viên luôn luôn có thể truy cập được!
echo.
echo    (Nếu muốn hủy, bạn chỉ cần xóa file shortcut trong thư mục Startup)
echo =====================================================================
echo.
pause
