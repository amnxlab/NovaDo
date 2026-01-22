"""
NovaDo - Build Script
Creates a Windows executable using PyInstaller
"""
import os
import sys
import shutil
import subprocess
import zipfile
from pathlib import Path
from datetime import datetime

# Build configuration
APP_NAME = "NovaDo"
VERSION = "1.0.0"
BASE_DIR = Path(__file__).parent

# Required project files
REQUIRED_FILES = {
    "core": [
        "main.py",
        "launcher_gui.py",
        "requirements.txt",
        "env.example",
        "NovaDo.spec",
    ],
    "app": [
        "app/__init__.py",
        "app/auth.py",
        "app/database.py",
        "app/models.py",
        "app/scheduler.py",
    ],
    "routes": [
        "app/routes/__init__.py",
        "app/routes/auth.py",
        "app/routes/tasks.py",
        "app/routes/lists.py",
        "app/routes/habits.py",
        "app/routes/calendar.py",
        "app/routes/llm.py",
        "app/routes/user.py",
        "app/routes/pomodoro.py",
        "app/routes/stats.py",
        "app/routes/uploads.py",
        "app/routes/notifications.py",
        "app/routes/focus.py",
        "app/routes/banner.py",
        "app/routes/tags.py",
    ],
    "frontend": [
        "static/index.html",
        "static/sw.js",
        "static/css/style.css",
        "static/css/taskMatrix.css",
        "static/css/themes.css",
        "static/js/api.js",
        "static/js/app.js",
        "static/js/notifications.js",
        "static/js/statistics.js",
        "static/js/stats.js",
        "static/js/taskMatrix.js",
    ],
}


def print_header():
    """Print build script header"""
    print("\n" + "=" * 60)
    print(f"  {APP_NAME} Build Script v{VERSION}")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60 + "\n")


def print_step(step_num, total, message):
    """Print a build step"""
    print(f"  [{step_num}/{total}] {message}")


def print_success(message):
    """Print success message"""
    print(f"  ✅ {message}")


def print_error(message):
    """Print error message"""
    print(f"  ❌ {message}")


def print_warning(message):
    """Print warning message"""
    print(f"  ⚠️  {message}")


def kill_running_processes():
    """Kill any running NovaDo processes"""
    print("\n  🔪 Stopping running NovaDo processes...")
    try:
        # Kill processes on port 5000
        subprocess.run(
            'powershell -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | '
            'ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"',
            shell=True, capture_output=True
        )
        # Kill NovaDo.exe processes
        subprocess.run('taskkill /F /IM NovaDo.exe 2>nul', shell=True, capture_output=True)
        print_success("Processes stopped")
    except Exception as e:
        print_warning(f"Could not stop processes: {e}")


def verify_files():
    """Verify all required project files exist"""
    print("\n  📋 Verifying project files...")
    missing = []
    total = 0
    
    for category, files in REQUIRED_FILES.items():
        for file in files:
            total += 1
            if not (BASE_DIR / file).exists():
                missing.append(file)
    
    if missing:
        print_error(f"Missing {len(missing)} files:")
        for f in missing:
            print(f"      - {f}")
        return False
    
    print_success(f"All {total} required files present")
    return True


def check_pyinstaller():
    """Check if PyInstaller is installed"""
    print("\n  🔍 Checking PyInstaller...")
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'PyInstaller', '--version'],
            capture_output=True, text=True
        )
        if result.returncode == 0:
            version = result.stdout.strip()
            print_success(f"PyInstaller {version} found")
            return True
        else:
            print_error("PyInstaller not found")
            print("      Install with: pip install pyinstaller")
            return False
    except Exception as e:
        print_error(f"PyInstaller check failed: {e}")
        return False


def clean_build():
    """Clean old build artifacts"""
    print("\n  🧹 Cleaning old builds...")
    
    dirs_to_clean = ["build", "dist", "releases"]
    for dir_name in dirs_to_clean:
        dir_path = BASE_DIR / dir_name
        if dir_path.exists():
            shutil.rmtree(dir_path)
            print(f"      Removed {dir_name}/")
    
    print_success("Build directories cleaned")


def run_pyinstaller():
    """Run PyInstaller to create executable"""
    print("\n  🔨 Building executable with PyInstaller...")
    print("      This may take a few minutes...\n")
    
    spec_file = BASE_DIR / "NovaDo.spec"
    
    try:
        result = subprocess.run(
            [sys.executable, '-m', 'PyInstaller', '--noconfirm', str(spec_file)],
            cwd=str(BASE_DIR),
            capture_output=False  # Show output in real-time
        )
        
        if result.returncode != 0:
            print_error("PyInstaller build failed")
            return False
        
        # Verify output exists
        exe_path = BASE_DIR / "dist" / "NovaDo" / "NovaDo.exe"
        if not exe_path.exists():
            print_error("Executable not found after build")
            return False
        
        print_success("Executable built successfully")
        return True
        
    except Exception as e:
        print_error(f"Build failed: {e}")
        return False


def create_release():
    """Create release folder with all necessary files"""
    print("\n  📦 Creating release package...")
    
    dist_dir = BASE_DIR / "dist" / "NovaDo"
    release_dir = BASE_DIR / "releases" / "NovaDo"
    
    # Copy dist folder to releases
    if release_dir.exists():
        shutil.rmtree(release_dir)
    shutil.copytree(dist_dir, release_dir)
    print(f"      Copied build to releases/NovaDo/")
    
    # Copy .env file (prioritize actual .env with credentials over template)
    env_file = BASE_DIR / ".env"
    env_example = BASE_DIR / "env.example"
    
    if env_file.exists():
        shutil.copy2(env_file, release_dir / ".env")
        print("      Copied .env (with your credentials)")
    elif env_example.exists():
        shutil.copy2(env_example, release_dir / ".env")
        print("      Created .env from env.example (needs configuration)")
    
    # Copy logo files to root (for easy access)
    logo_png = BASE_DIR / "static" / "logo.png"
    if logo_png.exists():
        shutil.copy2(logo_png, release_dir / "logo.png")
        print("      Copied logo.png")
    
    # Create empty directories
    (release_dir / "uploads" / "banners").mkdir(parents=True, exist_ok=True)
    (release_dir / "data").mkdir(parents=True, exist_ok=True)
    (release_dir / "logs").mkdir(parents=True, exist_ok=True)
    print("      Created uploads/, data/, and logs/ directories")
    
    # Copy README
    readme = BASE_DIR / "README.md"
    if readme.exists():
        shutil.copy2(readme, release_dir / "README.md")
        print("      Copied README.md")
    
    print_success(f"Release created at releases/NovaDo/")
    return release_dir


def clean_build_artifacts():
    """Clean intermediate build artifacts"""
    print("\n  🧹 Cleaning build artifacts...")
    
    for dir_name in ["build", "dist"]:
        dir_path = BASE_DIR / dir_name
        if dir_path.exists():
            shutil.rmtree(dir_path)
            print(f"      Removed {dir_name}/")
    
    print_success("Build artifacts cleaned")


def verify_release(release_dir):
    """Verify the release package"""
    print("\n  🔍 Verifying release...")
    
    # Check in both root and _internal for PyInstaller builds
    required = [
        ("NovaDo.exe", None),
        (".env", None),
        ("static/index.html", "_internal/static/index.html"),
        ("static/js/app.js", "_internal/static/js/app.js"),
        ("static/css/style.css", "_internal/static/css/style.css"),
    ]
    
    missing = []
    for primary, fallback in required:
        found = (release_dir / primary).exists()
        if not found and fallback:
            found = (release_dir / fallback).exists()
        if not found:
            missing.append(primary)
    
    if missing:
        print_error(f"Missing {len(missing)} files in release:")
        for f in missing:
            print(f"      - {f}")
        return False
    
    # Get exe size
    exe_path = release_dir / "NovaDo.exe"
    size_mb = exe_path.stat().st_size / (1024 * 1024)
    print(f"      Executable size: {size_mb:.1f} MB")
    
    print_success("Release package verified")
    return True


def create_zip():
    """Create ZIP archive of the release"""
    print("\n  🗜️  Creating ZIP archive...")
    
    release_dir = BASE_DIR / "releases" / "NovaDo"
    zip_path = BASE_DIR / "releases" / f"{APP_NAME}-v{VERSION}.zip"
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file in release_dir.rglob('*'):
            if file.is_file():
                arcname = file.relative_to(release_dir.parent)
                zipf.write(file, arcname)
    
    # Get file size
    size_mb = zip_path.stat().st_size / (1024 * 1024)
    print_success(f"Created {zip_path.name} ({size_mb:.1f} MB)")
    return zip_path


def main():
    """Main build process"""
    print_header()
    
    total_steps = 9
    
    # Step 1: Kill running processes
    print_step(1, total_steps, "Stopping running processes")
    kill_running_processes()
    
    # Step 2: Verify files
    print_step(2, total_steps, "Verifying project files")
    if not verify_files():
        print_error("Build failed: Missing required files")
        return 1
    
    # Step 3: Check PyInstaller
    print_step(3, total_steps, "Checking PyInstaller")
    if not check_pyinstaller():
        print_error("Build failed: PyInstaller not available")
        return 1
    
    # Step 4: Clean old builds
    print_step(4, total_steps, "Cleaning old builds")
    clean_build()
    
    # Step 5: Run PyInstaller
    print_step(5, total_steps, "Building executable")
    if not run_pyinstaller():
        print_error("Build failed: PyInstaller error")
        return 1
    
    # Step 6: Create release
    print_step(6, total_steps, "Creating release package")
    release_dir = create_release()
    
    # Step 7: Clean build artifacts
    print_step(7, total_steps, "Cleaning build artifacts")
    clean_build_artifacts()
    
    # Step 8: Verify release
    print_step(8, total_steps, "Verifying release")
    if not verify_release(release_dir):
        print_error("Build failed: Release verification failed")
        return 1
    
    # Step 9: Create ZIP
    print_step(9, total_steps, "Creating ZIP archive")
    zip_path = create_zip()
    
    # Done!
    print("\n" + "=" * 60)
    print("  ✅ BUILD SUCCESSFUL!")
    print("=" * 60)
    print(f"\n  📁 Release folder: releases/NovaDo/")
    print(f"  📦 ZIP archive:    releases/{APP_NAME}-v{VERSION}.zip")
    print(f"\n  🚀 To run: Double-click NovaDo.exe")
    print(f"  🌐 App opens at: http://localhost:5000")
    print("")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
