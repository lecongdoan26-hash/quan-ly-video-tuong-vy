import PyInstaller.__main__
import sys

args = [
    'app.py',
    '--name=QuanLyVideo',
    '--onefile',
    '--noconfirm',
    '--clean',
    '--add-data=templates;templates',
    '--add-data=static;static',
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
]

print("Building QuanLyVideo.exe with PyInstaller...")
PyInstaller.__main__.run(args)
print("Build finished successfully!")
