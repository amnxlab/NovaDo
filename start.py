#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NovaDo - Complete Start Script
Handles installation, setup, and starting all services
"""
import os
import sys
import subprocess
import time
import socket
import platform
import webbrowser
from pathlib import Path

# Fix Windows console encoding
if platform.system() == 'Windows':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

# Colors for terminal output (use ASCII-safe characters on Windows)
if platform.system() == 'Windows':
    class Colors:
        CYAN = ''
        GREEN = ''
        YELLOW = ''
        RED = ''
        GRAY = ''
        RESET = ''
        BOLD = ''
    CHECK = '[OK]'
    CROSS = '[X]'
    WARN = '[!]'
    ARROW = '->'
else:
    class Colors:
        CYAN = '\033[96m'
        GREEN = '\033[92m'
        YELLOW = '\033[93m'
        RED = '\033[91m'
        GRAY = '\033[90m'
        RESET = '\033[0m'
        BOLD = '\033[1m'
    CHECK = '✓'
    CROSS = '✗'
    WARN = '⚠'
    ARROW = '→'

def print_header(text):
    """Print formatted header"""
    print(f"\n{'='*50}")
    print(f"{text:^50}")
    print(f"{'='*50}\n")

def print_success(text):
    """Print success message"""
    print(f"  {CHECK} {text}")

def print_error(text):
    """Print error message"""
    print(f"  {CROSS} {text}")

def print_warning(text):
    """Print warning message"""
    print(f"  {WARN} {text}")

def print_info(text):
    """Print info message"""
    print(f"  {ARROW} {text}")

def check_command(cmd, version_flag='--version'):
    """Check if a command exists and return its version"""
    try:
        result = subprocess.run(
            [cmd, version_flag],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            return result.stdout.strip()
        return None
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None

def check_port(port, timeout=1):
    """Check if a port is listening"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    result = sock.connect_ex(('localhost', port))
    sock.close()
    return result == 0

def wait_for_server(port, name, timeout=60):
    """Wait for a server to start on a port"""
    print(f"      Waiting for {name} (port {port})...", end='', flush=True)
    elapsed = 0
    while elapsed < timeout:
        if check_port(port):
            print(f" {CHECK}")
            return True
        time.sleep(0.5)
        elapsed += 0.5
        print(".", end='', flush=True)
    print(f" {CROSS}")
    return False

def kill_process_on_port(port):
    """Kill process using a port"""
    if platform.system() == 'Windows':
        try:
            result = subprocess.run(
                ['netstat', '-ano'],
                capture_output=True,
                text=True,
                timeout=5
            )
            for line in result.stdout.split('\n'):
                if f':{port}' in line and 'LISTENING' in line:
                    parts = line.split()
                    if len(parts) > 4:
                        pid = parts[-1]
                        try:
                            subprocess.run(['taskkill', '/F', '/PID', pid], 
                                         capture_output=True, timeout=2)
                        except:
                            pass
        except:
            pass
    else:
        try:
            result = subprocess.run(['lsof', '-ti', f':{port}'],
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0 and result.stdout.strip():
                pids = result.stdout.strip().split('\n')
                for pid in pids:
                    subprocess.run(['kill', '-9', pid], capture_output=True)
        except:
            pass

def main():
    print_header("NovaDo - Starting All Services")
    
    errors = []
    
    # Check prerequisites
    print(f"Checking prerequisites...")
    
    python_version = check_command('python') or check_command('python3')
    if python_version:
        print_success(f"Python: {python_version}")
    else:
        print_error("Python not found!")
        print_info("Download from: https://www.python.org/downloads/")
        errors.append("Python")
    
    # Node.js is no longer required - pure HTML/CSS/JS frontend
    
    # Check MongoDB
    print_info("Checking MongoDB...")
    if check_port(27017, timeout=0.5):
        print_success("MongoDB is running locally")
    else:
        print_warning("MongoDB not running locally")
        print_info("Using MongoDB Atlas? Update MONGODB_URI in .env")
        print_info("Or install MongoDB: https://www.mongodb.com/try/download/community")
    
    if errors:
        print(f"\nMissing prerequisites: {', '.join(errors)}")
        print(f"Please install the missing software and try again.\n")
        if 'Python' in errors:
            webbrowser.open('https://www.python.org/downloads/')
        sys.exit(1)
    
    # Setup Python environment
    print(f"\nChecking Python environment...")
    venv_path = Path('venv')
    
    if not venv_path.exists():
        print_info("Creating virtual environment...")
        subprocess.run([sys.executable, '-m', 'venv', 'venv'], check=True)
        print_success("Virtual environment created")
    
    # Determine Python executable
    if platform.system() == 'Windows':
        python_exe = venv_path / 'Scripts' / 'python.exe'
        pip_exe = venv_path / 'Scripts' / 'pip.exe'
    else:
        python_exe = venv_path / 'bin' / 'python'
        pip_exe = venv_path / 'bin' / 'pip'
    
    # Check Python dependencies
    print_info("Checking Python dependencies...")
    key_packages = ['fastapi', 'uvicorn', 'motor', 'pymongo']
    missing_deps = False
    
    for package in key_packages:
        try:
            subprocess.run(
                [str(python_exe), '-c', f'import {package.replace("-", "_")}'],
                capture_output=True,
                check=True
            )
        except:
            missing_deps = True
            break
    
    if missing_deps:
        print_info("Installing Python dependencies (this may take a few minutes)...")
        subprocess.run([str(pip_exe), 'install', '--upgrade', 'pip', '-q'], check=True)
        result = subprocess.run([str(pip_exe), 'install', '-r', 'requirements.txt'])
        if result.returncode == 0:
            print_success("Python dependencies installed")
        else:
            print_error("Some dependencies may have failed to install")
            print_info("Try running 'pip install -r requirements.txt' manually")
    else:
        print_success("Python dependencies already installed")
    
    # Frontend is pure HTML/CSS/JS - no npm needed
    print(f"\nChecking frontend...")
    if Path('static/index.html').exists():
        print_success("Frontend files ready (pure HTML/CSS/JS)")
    else:
        print_error("Frontend files not found!")
        print_info("Make sure static/ folder exists with index.html")
        sys.exit(1)
    
    # Check configuration files
    print(f"\nChecking configuration...")
    env_file = Path('.env')
    env_example = Path('env.example')
    
    if not env_file.exists():
        print_info("Creating .env file...")
        if env_example.exists():
            import shutil
            shutil.copy(env_example, env_file)
            print_success(".env file created")
            print_warning("IMPORTANT: Update MONGODB_URI in .env file")
        else:
            # Create basic .env
            env_content = """PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ticktick-clone
JWT_SECRET=change-this-secret-key-in-production
ENCRYPTION_KEY=change-this-encryption-key-in-production
"""
            env_file.write_text(env_content)
            print_success("Basic .env file created")
    else:
        print_success("Configuration file exists")
    
    # Create uploads directory
    uploads_dir = Path('uploads')
    if not uploads_dir.exists():
        uploads_dir.mkdir()
        print_success("Created uploads directory")
    
    # Kill existing processes
    print(f"\nChecking for existing servers...")
    for port in [5000, 3000]:
        if check_port(port, timeout=0.1):
            print_info(f"Stopping process on port {port}...")
            kill_process_on_port(port)
            time.sleep(1)
    
    # Start servers
    print(f"\nStarting servers...\n")
    
    # Start backend
    print(f"  [1/2] Starting Python Backend...")
    
    if platform.system() == 'Windows':
        backend_script = f"""@echo off
cd /d "{os.getcwd()}"
set PYTHONUNBUFFERED=1
"{str(python_exe)}" main.py
pause
"""
        backend_script_path = Path.home() / 'taskflow_backend.bat'
        backend_script_path.write_text(backend_script, encoding='utf-8')
        subprocess.Popen(
            ['cmd', '/c', 'start', 'cmd', '/k', f'"{backend_script_path}"'],
            shell=False
        )
    else:
        backend_script = f"""#!/bin/bash
cd "{os.getcwd()}"
export PYTHONUNBUFFERED=1
"{str(python_exe)}" main.py
"""
        backend_script_path = Path.home() / 'taskflow_backend.sh'
        backend_script_path.write_text(backend_script, encoding='utf-8')
        os.chmod(backend_script_path, 0o755)
        subprocess.Popen(['gnome-terminal', '--', 'bash', '-c', f'{backend_script_path}; exec bash'])
    
    if wait_for_server(5000, "Server", timeout=30):
        pass
    else:
        print_error("Server failed to start. Check the server window for errors.")
        sys.exit(1)
    
    # Open browser
    print(f"\nOpening browser...")
    time.sleep(2)
    webbrowser.open('http://localhost:5000')
    
    # Final message
    print_header("NovaDo is Running!")
    print(f"App:       http://localhost:5000")
    print(f"API Docs:  http://localhost:5000/docs\n")
    print(f"A console window is running the server.")
    print(f"Close that window to stop the server.\n")
    
    try:
        input("Press Enter to exit (servers will keep running)...")
    except KeyboardInterrupt:
        print("\n")

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n\nInterrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

