# -*- mode: python ; coding: utf-8 -*-
"""
NovaDo PyInstaller Spec File
Builds a single-folder Windows executable with all dependencies
"""

import sys
import os
from pathlib import Path

# Import for data collection
import certifi
import googleapiclient

block_cipher = None

# Get the directory containing the spec file
SPEC_DIR = Path(SPECPATH)

a = Analysis(
    ['launcher_gui.py', 'main.py'],
    pathex=[str(SPEC_DIR)],
    binaries=[],
    datas=[
        ('static', 'static'),
        ('app', 'app'),
        ('static/logo.png', '.'),
        ('static/logo.ico', '.'),
        # SSL certificates for HTTPS requests (Google API)
        (certifi.where(), 'certifi'),
        # Google API discovery documents
        (os.path.dirname(googleapiclient.__file__), 'googleapiclient'),
    ],
    hiddenimports=[
        # FastAPI and web framework
        'fastapi',
        'fastapi.middleware',
        'fastapi.middleware.cors',
        'fastapi.staticfiles',
        'fastapi.responses',
        'fastapi.templating',
        'starlette',
        'starlette.routing',
        'starlette.responses',
        'starlette.middleware',
        'starlette.middleware.cors',
        'starlette.staticfiles',
        'starlette.applications',
        
        # Uvicorn - ASGI server
        'uvicorn',
        'uvicorn.main',
        'uvicorn.config',
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.loops.asyncio',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.http.httptools_impl',
        'uvicorn.protocols.websockets',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.websockets_impl',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'uvicorn.lifespan.off',
        
        # Async support
        'anyio',
        'anyio._core',
        'anyio._backends',
        'anyio._backends._asyncio',
        'sniffio',
        
        # HTTP libraries
        'httptools',
        'h11',
        'httpx',
        'httpcore',
        
        # Database - Mongita
        'mongita',
        'mongita.collection',
        'mongita.database',
        'mongita.cursor',
        'mongita.errors',
        'mongita.command_cursor',
        'mongita.common',
        'mongita.mongita_client',
        'mongita.engines',
        'mongita.engines.disk_engine',
        'mongita.engines.memory_engine',
        'mongita.engines.engine_common',
        'mongita.results',
        'mongita.read_concern',
        'mongita.write_concern',
        'sortedcontainers',
        
        # BSON for ObjectId
        'bson',
        'bson.objectid',
        'bson.errors',
        
        # Auth and security
        'passlib',
        'passlib.context',
        'passlib.handlers',
        'passlib.handlers.bcrypt',
        'passlib.hash',
        'bcrypt',
        'jose',
        'jose.jwt',
        'jose.constants',
        'jose.exceptions',
        'jose.backends',
        'jose.backends.native',
        'cryptography',
        'cryptography.fernet',
        'cryptography.hazmat',
        'cryptography.hazmat.primitives',
        
        # Google APIs
        'google',
        'google.auth',
        'google.auth.transport',
        'google.auth.transport.requests',
        'google.auth._default',
        'google.auth.compute_engine',
        'google.auth.credentials',
        'google.auth.exceptions',
        'google.auth.external_account',
        'google.oauth2',
        'google.oauth2.credentials',
        'google_auth_oauthlib',
        'google_auth_oauthlib.flow',
        'googleapiclient',
        'googleapiclient.discovery',
        'googleapiclient.discovery_cache',
        'googleapiclient.discovery_cache.base',
        'googleapiclient.discovery_cache.file_cache',
        'googleapiclient._helpers',
        'googleapiclient.errors',
        'googleapiclient.model',
        'googleapiclient.schema',
        'googleapiclient.http',
        'httplib2',
        'certifi',
        'ssl',
        
        # Pydantic
        'pydantic',
        'pydantic.fields',
        'pydantic.main',
        'pydantic_settings',
        'pydantic_core',
        'annotated_types',
        
        # Other dependencies
        'aiofiles',
        'python_multipart',
        'multipart',
        'email_validator',
        'dotenv',
        'pytz',
        'openai',
        
        # PIL for images
        'PIL',
        'PIL.Image',
        'PIL.ImageTk',
        
        # App modules - explicitly include all
        'app',
        'app.auth',
        'app.database',
        'app.models',
        'app.scheduler',
        'app.routes',
        'app.routes.auth',
        'app.routes.tasks',
        'app.routes.lists',
        'app.routes.habits',
        'app.routes.calendar',
        'app.routes.llm',
        'app.routes.user',
        'app.routes.pomodoro',
        'app.routes.stats',
        'app.routes.uploads',
        'app.routes.notifications',
        'app.routes.focus',
        'app.routes.banner',
        'app.routes.tags',
        
        # Scheduler
        'apscheduler',
        'apscheduler.schedulers',
        'apscheduler.schedulers.asyncio',
        'apscheduler.schedulers.background',
        'apscheduler.triggers',
        'apscheduler.triggers.cron',
        'apscheduler.triggers.interval',
        'apscheduler.jobstores',
        'apscheduler.executors',
        
        # Standard library that might be missed
        'asyncio',
        'json',
        'logging',
        'threading',
        'socket',
        'webbrowser',
        'collections',
        're',
        'uuid',
        'base64',
        'hashlib',
        'psutil',
        
        # Websockets
        'websockets',
        'websockets.legacy',
        'websockets.legacy.server',
        'wsproto',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'matplotlib',
        'numpy',
        'pandas',
        'scipy',
        'pytest',
        'tkinter.test',
        'test',
        'tests',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='NovaDo',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,  # Windowed app (no console)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='static/logo.ico',
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='NovaDo',
)
