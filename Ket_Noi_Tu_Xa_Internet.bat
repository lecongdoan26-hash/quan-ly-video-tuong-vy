@echo off
chcp 65001 >nul
title KẾT NỐI TỪ XA QUA INTERNET (DÙNG CHO SẾP Ở NHÀ HOẶC NGOÀI ĐƯỜNG)
cls

echo =====================================================================
echo    🌐 TẠO ĐƯỜNG LINK ONLINE QUA INTERNET (MIỄN PHÍ - BẢO MẬT)
echo =====================================================================
echo.
echo   [!] Đang chuẩn bị đường hầm bảo mật Cloudflare Tunnel...
echo.

if not exist "%~dp0cloudflared.exe" (
    echo   [+] Đang tải công cụ Cloudflared (chỉ tải 1 lần duy nhất, khoảng 30MB)...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%~dp0cloudflared.exe'"
    if not exist "%~dp0cloudflared.exe" (
        echo   [x] Không thể tải tự động. Bạn vẫn có thể dùng mạng Wi-Fi/LAN nội bộ bình thường.
        pause
        exit /b
    )
)

echo.
echo   [+] Đang khởi tạo link Internet có HTTPS...
echo   👉 Vui lòng đợi trong giây lát...
echo.
echo =====================================================================
echo   (Hãy copy link https://...trycloudflare.com hiện ra bên dưới để gửi cho Sếp!)
echo =====================================================================
echo.

"%~dp0cloudflared.exe" tunnel --url http://localhost:8000

pause
