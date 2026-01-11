"""
NovaDo Build Script
Builds the production release automatically
"""
import subprocess
import shutil
import sys
from pathlib import Path

# Paths
ROOT = Path(__file__).parent
DIST = ROOT / "dist" / "NovaDo"
RELEASE = ROOT / "app-release"

def main():
    print("🔨 NovaDo Build Script v0.5")
    print("=" * 40)
    
    # 1. Kill any running NovaDo processes
    print("\n📌 Stopping any running processes...")
    subprocess.run(
        'powershell -Command "Get-Process | Where-Object { $_.Name -like \'*NovaDo*\' } | Stop-Process -Force -ErrorAction SilentlyContinue"',
        shell=True, capture_output=True
    )
    
    # 2. Clean old build
    print("🧹 Cleaning old builds...")
    for folder in ["build", "dist"]:
        path = ROOT / folder
        if path.exists():
            shutil.rmtree(path, ignore_errors=True)
    
    # 3. Build with PyInstaller (use global python where PyInstaller is installed)
    print("📦 Building with PyInstaller...")
    result = subprocess.run(
        ["python", "-m", "PyInstaller", "--noconfirm", "NovaDo.spec"],
        cwd=ROOT,
        capture_output=False,
        shell=True
    )
    
    if result.returncode != 0:
        print("❌ Build failed!")
        return 1
    
    # 4. Create app-release folder
    print("\n📂 Creating release folder...")
    if RELEASE.exists():
        shutil.rmtree(RELEASE, ignore_errors=True)
    
    shutil.copytree(DIST, RELEASE)
    
    # 5. Copy additional files
    print("📋 Copying additional files...")
    shutil.copy(ROOT / "env.example", RELEASE / ".env")
    shutil.copy(ROOT / "logo.png", RELEASE / "logo.png")
    shutil.copy(ROOT / "logo.ico", RELEASE / "logo.ico")
    
    # Create directories
    (RELEASE / "uploads").mkdir(exist_ok=True)
    (RELEASE / "data").mkdir(exist_ok=True)
    
    # 6. Create README
    readme = """# NovaDo v0.5

## Quick Start
1. Double-click NovaDo.exe
2. App opens at http://localhost:5000

## Configuration
Edit .env for API keys (optional)

© 2026 Ahmed Amin
"""
    (RELEASE / "README.md").write_text(readme)
    
    # 7. Clean up
    print("🧹 Cleaning build artifacts...")
    shutil.rmtree(ROOT / "build", ignore_errors=True)
    shutil.rmtree(ROOT / "dist", ignore_errors=True)
    
    print("\n✅ Build complete!")
    print(f"   Output: {RELEASE}")
    print(f"   Size: {sum(f.stat().st_size for f in RELEASE.rglob('*') if f.is_file()) / 1024 / 1024:.1f} MB")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
