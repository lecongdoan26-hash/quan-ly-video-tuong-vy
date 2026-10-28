import PyInstaller.__main__
import sys
import os
import shutil

args = [
    'desktop_app.py',
    '--name=QuanLyVideo',
    '--onefile',
    '--noconsole',
    '--noconfirm',
    '--clean',
    '--icon=app_icon.ico',
    '--add-data=templates;templates',
    '--add-data=static;static',
    '--collect-all=webview',
    '--collect-all=pythonnet',
    '--collect-all=clr_loader',
    '--copy-metadata=uvicorn',
    '--copy-metadata=fastapi',
    '--hidden-import=uvicorn.logging',
    '--hidden-import=uvicorn.loops',
    '--hidden-import=uvicorn.loops.auto',
    '--hidden-import=uvicorn.protocols',
    '--hidden-import=uvicorn.protocols.http',
    '--hidden-import=uvicorn.protocols.http.auto',
    '--hidden-import=uvicorn.protocols.websockets',
    '--hidden-import=uvicorn.protocols.websockets.auto',
    '--hidden-import=uvicorn.lifespan',
    '--hidden-import=uvicorn.lifespan.on',
    '--hidden-import=engineio.async_drivers.asgi',
    '--hidden-import=clr',
]

print("Building QuanLyVideo.exe (Native Desktop App) with PyInstaller...")
PyInstaller.__main__.run(args)

# Copy dist/QuanLyVideo.exe ra thư mục gốc
dist_exe = os.path.join("dist", "QuanLyVideo.exe")
if os.path.exists(dist_exe):
    target_exe = "QuanLyVideo.exe"
    print(f"Copying {dist_exe} to {target_exe}...")
    shutil.copy2(dist_exe, target_exe)
    print("Done! QuanLyVideo.exe is ready to use.")
