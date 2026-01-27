"""
Deploy fixes to production
Copies the fixed files to the production deployment folder
"""
import os
import shutil
from pathlib import Path

def deploy_to_production():
    """Copy fixed files to production deployment"""
    
    # Source files (development)
    dev_root = Path(__file__).parent
    
    # Production folder (from logs)
    prod_root = Path(r"C:\Users\ahmedamin\Desktop\NovaDo")
    
    # Check if it's a PyInstaller build
    internal_folder = prod_root / "_internal"
    if internal_folder.exists():
        prod_app_root = internal_folder
        print(f"Detected PyInstaller build, using _internal folder")
    else:
        prod_app_root = prod_root
    
    if not prod_root.exists():
        print(f"❌ Production folder not found: {prod_root}")
        return False
    
    print(f"\n=== Deploying Fixes to Production ===\n")
    print(f"Source: {dev_root}")
    print(f"Target: {prod_root}\n")
    
    # Files to copy
    files_to_deploy = [
        "app/database.py",
        "app/scheduler.py",
        "app/routes/calendar.py"
    ]
    
    # Backup and copy each file
    for file_path in files_to_deploy:
        src = dev_root / file_path
        dst = prod_app_root / file_path
        
        if not src.exists():
            print(f"⚠️  Source file not found: {src}")
            continue
        
        if not dst.parent.exists():
            dst.parent.mkdir(parents=True, exist_ok=True)
        
        # Create backup
        if dst.exists():
            backup = dst.with_suffix(dst.suffix + ".backup")
            shutil.copy2(dst, backup)
            print(f"📋 Backed up: {file_path} -> {backup.name}")
        
        # Copy new file
        shutil.copy2(src, dst)
        print(f"✅ Deployed: {file_path}")
    
    # Copy cleanup script
    cleanup_src = dev_root / "cleanup_imported_calendars.py"
    cleanup_dst = prod_root / "cleanup_imported_calendars.py"
    shutil.copy2(cleanup_src, cleanup_dst)
    print(f"✅ Deployed: cleanup_imported_calendars.py")
    
    print(f"\n✨ Deployment complete!\n")
    print("Next steps:")
    print("1. Stop the production application")
    print("2. Run: python cleanup_imported_calendars.py")
    print("3. Restart the application")
    print("4. Monitor logs for errors")
    
    return True

if __name__ == "__main__":
    success = deploy_to_production()
    if not success:
        exit(1)
