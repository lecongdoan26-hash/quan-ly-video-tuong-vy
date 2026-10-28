import sys
import os
import time
import threading
import socket

# Thiết lập DummyWriter / File Logger nếu chạy chế độ không có cửa sổ console (--noconsole)
class SafeStream:
    def __init__(self, log_path=None):
        self.log_path = log_path
        
    def write(self, s):
        if self.log_path and s and s.strip():
            try:
                with open(self.log_path, "a", encoding="utf-8") as f:
                    f.write(s)
            except Exception:
                pass
                
    def flush(self):
        pass
        
    def isatty(self):
        return False

# Xác định thư mục ứng dụng gốc
if getattr(sys, 'frozen', False):
    BASE_DIR = os.path.dirname(sys.executable)
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

os.chdir(BASE_DIR)

LOG_FILE = os.path.join(BASE_DIR, "app.log")
if sys.stdout is None:
    sys.stdout = SafeStream(LOG_FILE)
if sys.stderr is None:
    sys.stderr = SafeStream(LOG_FILE)

import uvicorn
import webview
from app import app, get_local_ip

PORT = int(os.environ.get("PORT", 8000))

def run_api_server():
    """Chạy máy chủ cục bộ ngầm phục vụ giao diện và kết nối mạng LAN cho Sếp & Nhân viên"""
    try:
        config = uvicorn.Config(
            app=app,
            host="0.0.0.0",
            port=PORT,
            log_level="warning",
            access_log=False
        )
        server = uvicorn.Server(config)
        server.run()
    except Exception as e:
        if sys.stderr:
            sys.stderr.write(f"Server error: {e}\n")

def wait_for_server(port, timeout=12):
    start = time.time()
    while time.time() - start < timeout:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.4)
            s.connect(("127.0.0.1", port))
            s.close()
            return True
        except Exception:
            time.sleep(0.15)
    return False

if __name__ == "__main__":
    # 1. Khởi động máy chủ cục bộ ngầm trong daemon thread
    server_thread = threading.Thread(target=run_api_server, daemon=True)
    server_thread.start()

    # 2. Đợi máy chủ sẵn sàng kết nối
    wait_for_server(PORT)

    # 3. Mở cửa sổ Ứng dụng Desktop Windows thuần túy (Không dùng trình duyệt, không có thanh URL)
    window = webview.create_window(
        title="Hệ Thống Kho & Quản Lý Video - Tường Vy Admin",
        url=f"http://127.0.0.1:{PORT}",
        width=1380,
        height=880,
        min_size=(960, 640),
        text_select=True,
        zoomable=True
    )

    # 4. Bắt đầu vòng đời ứng dụng Desktop (Đóng cửa sổ = Thoát sạch sẽ)
    webview.start(debug=False)
    
    # Thoát sạch toàn bộ tiến trình khi người dùng tắt cửa sổ
    os._exit(0)
