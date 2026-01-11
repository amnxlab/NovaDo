# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all, collect_data_files

# Collect data files - only include what exists
datas = [
    ('static', 'static'), 
    ('logo.png', '.'),
    ('logo.ico', '.'),
]

# Create uploads and data dirs if they don't exist (will be created at runtime)
binaries = []

# Hidden imports for FastAPI/Uvicorn
hiddenimports = [
    'uvicorn.lifespan.on', 
    'uvicorn.lifespan.off', 
    'uvicorn.protocols.http.auto', 
    'uvicorn.protocols.websockets.auto', 
    'uvicorn.loops.auto', 
    'uvicorn.logging',
    'passlib.handlers.bcrypt',
    'python_multipart',
    'email.mime.multipart',
    'email.mime.text',
    'email.mime.base',
]

# Collect all dependencies
for package in ['fastapi', 'uvicorn', 'mongita', 'passlib', 'starlette', 'pydantic', 'pydantic_core']:
    try:
        tmp_ret = collect_all(package)
        datas += tmp_ret[0]
        binaries += tmp_ret[1]
        hiddenimports += tmp_ret[2]
    except:
        pass

a = Analysis(
    ['launcher_gui.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['matplotlib', 'numpy', 'pandas', 'scipy', 'pytest', 'IPython'],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='NovaDo',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,  # Disable UPX compression to avoid issues
    console=False,  # No console window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='logo.ico',  # Application icon
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='NovaDo',
)
