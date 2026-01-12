"""
NovaDo - Professional GUI Launcher
Dark mode modern design with server status
"""
import tkinter as tk
from tkinter import messagebox
import threading
import sys
import os
import socket
import time
import webbrowser
from pathlib import Path

# Handle PyInstaller temporary directory
if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys._MEIPASS)
    WORK_DIR = Path(os.path.dirname(sys.executable))
    
    # Fix for windowed mode: redirect stdout/stderr to devnull if None
    if sys.stdout is None:
        sys.stdout = open(os.devnull, 'w')
    if sys.stderr is None:
        sys.stderr = open(os.devnull, 'w')
else:
    BASE_DIR = Path(__file__).parent
    WORK_DIR = BASE_DIR

os.chdir(WORK_DIR)
sys.path.insert(0, str(BASE_DIR))


class NovaDoLauncher:
    # Dark theme colors
    BG_DARK = "#000000"
    BG_CARD = "#50545e"
    ACCENT = "#4f46e5"
    SUCCESS = "#10b981"
    ERROR = "#ef4444"
    WARNING = "#f59e0b"
    TEXT_PRIMARY = "#ffffff"
    TEXT_SECONDARY = "#94a3b8"
    
    def __init__(self, root):
        self.root = root
        self.root.title("NovaDo")
        self.root.geometry("450x460")
        self.root.resizable(False, False)
        self.root.configure(bg=self.BG_DARK)
        
        self.base_dir = BASE_DIR
        self.work_dir = WORK_DIR
        self.server_url = "http://localhost:5000"
        self.is_running = False
        self.logo_image = None
        
        # Set window icon first
        self.set_window_icon()
        
        self.center_window()
        self.build_ui()
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        self.root.after(100, self.start_server)
    
    def find_file(self, filename):
        """Find a file in multiple locations"""
        locations = [
            WORK_DIR / filename,
            BASE_DIR / filename,
            WORK_DIR / "_internal" / filename,
            BASE_DIR / "_internal" / filename,
        ]
        for path in locations:
            if path.exists():
                return path
        return None
    
    def set_window_icon(self):
        """Set window and taskbar icon"""
        try:
            ico_path = self.find_file("logo.ico")
            if ico_path:
                self.root.iconbitmap(str(ico_path))
        except:
            pass
    
    def center_window(self):
        self.root.update_idletasks()
        w, h = 450, 460
        x = (self.root.winfo_screenwidth() // 2) - (w // 2)
        y = (self.root.winfo_screenheight() // 2) - (h // 2)
        self.root.geometry(f'{w}x{h}+{x}+{y}')
    
    def load_logo(self, parent):
        """Load and return logo label"""
        png_path = self.find_file("logo.png")
        if png_path:
            try:
                from PIL import Image, ImageTk
                img = Image.open(png_path)
                img = img.resize((56, 56), Image.Resampling.LANCZOS)
                self.logo_image = ImageTk.PhotoImage(img)
                return tk.Label(parent, image=self.logo_image, bg=self.BG_DARK)
            except:
                pass
        # Fallback: emoji
        return tk.Label(parent, text="✨", font=("Segoe UI", 32), bg=self.BG_DARK, fg=self.ACCENT)
    
    def build_ui(self):
        main = tk.Frame(self.root, bg=self.BG_DARK, padx=35, pady=30)
        main.pack(fill=tk.BOTH, expand=True)
        
        # Header with logo and title side by side
        header = tk.Frame(main, bg=self.BG_DARK)
        header.pack(pady=(0, 25))
        
        logo_label = self.load_logo(header)
        logo_label.pack(side=tk.LEFT, padx=(0, 15))
        
        title_container = tk.Frame(header, bg=self.BG_DARK)
        title_container.pack(side=tk.LEFT)
        
        tk.Label(title_container, text="NovaDo", font=("Segoe UI", 26, "bold"),
                bg=self.BG_DARK, fg=self.TEXT_PRIMARY).pack(anchor=tk.W)
        tk.Label(title_container, text="Smart Task Management", font=("Segoe UI", 11),
                bg=self.BG_DARK, fg=self.TEXT_SECONDARY).pack(anchor=tk.W)
        
        # Status card
        status_card = tk.Frame(main, bg=self.BG_CARD, padx=16, pady=14)
        status_card.pack(fill=tk.X, pady=(0, 15))
        
        self.status_dot = tk.Label(status_card, text="●", font=("Segoe UI", 14),
                                   bg=self.BG_CARD, fg=self.WARNING)
        self.status_dot.pack(side=tk.LEFT)
        
        self.status_label = tk.Label(status_card, text="Starting server...",
                                     font=("Segoe UI", 11), bg=self.BG_CARD, fg=self.TEXT_SECONDARY)
        self.status_label.pack(side=tk.LEFT, padx=(10, 0))
        
        # URL card
        url_card = tk.Frame(main, bg=self.BG_CARD, padx=16, pady=14)
        url_card.pack(fill=tk.X, pady=(0, 20))
        
        tk.Label(url_card, text="Server URL", font=("Segoe UI", 9),
                bg=self.BG_CARD, fg=self.TEXT_SECONDARY).pack(anchor=tk.W)
        
        url_row = tk.Frame(url_card, bg=self.BG_CARD)
        url_row.pack(fill=tk.X, pady=(6, 0))
        
        self.url_label = tk.Label(url_row, text=self.server_url, font=("Consolas", 13),
                                  bg=self.BG_CARD, fg=self.ACCENT, cursor="hand2")
        self.url_label.pack(side=tk.LEFT)
        self.url_label.bind("<Button-1>", lambda e: self.open_browser())
        
        copy_btn = tk.Label(url_row, text="📋", font=("Segoe UI", 14),
                           bg=self.BG_CARD, fg=self.TEXT_SECONDARY, cursor="hand2")
        copy_btn.pack(side=tk.RIGHT)
        copy_btn.bind("<Button-1>", lambda e: self.copy_url())
        
        # Buttons
        self.open_btn = tk.Button(main, text="🌐  Open in Browser", font=("Segoe UI", 11, "bold"),
                                  bg=self.ACCENT, fg="white", relief=tk.FLAT, pady=11,
                                  cursor="hand2", command=self.open_browser,
                                  activebackground="#A020F0", activeforeground="white")
        self.open_btn.pack(fill=tk.X, pady=(0, 12))
        
        self.stop_btn = tk.Button(main, text="⏹  Stop Server", font=("Segoe UI", 11),
                                  bg=self.ERROR, fg="white", relief=tk.FLAT, pady=12,
                                  cursor="hand2", command=self.stop_server,
                                  activebackground="#B80F0A", activeforeground="white")
        self.stop_btn.pack(fill=tk.X)
        
        # Footer
        tk.Label(main, text="Keep this window open while using NovaDo",
                font=("Segoe UI", 9), bg=self.BG_DARK, fg=self.TEXT_SECONDARY).pack(pady=(20, 0))
    
    def check_port(self, port, timeout=1):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex(('127.0.0.1', port))
        sock.close()
        return result == 0
    
    def kill_port(self, port):
        """Kill any process using the specified port"""
        try:
            import subprocess
            # Find PID using port
            result = subprocess.run(
                f'netstat -ano | findstr :{port}',
                shell=True, capture_output=True, text=True
            )
            if result.stdout:
                for line in result.stdout.strip().split('\n'):
                    parts = line.split()
                    if len(parts) >= 5 and parts[-1].isdigit() and parts[-1] != '0':
                        pid = parts[-1]
                        subprocess.run(f'taskkill /PID {pid} /F', shell=True, capture_output=True)
        except:
            pass
    
    def start_server(self):
        def run_server():
            try:
                for d in ['uploads', 'data']:
                    (self.work_dir / d).mkdir(exist_ok=True)
                
                import uvicorn
                from main import app
                
                port = int(os.getenv("PORT", 5000))
                
                # Kill any existing process on this port
                self.kill_port(port)
                time.sleep(0.5)
                
                self.server_url = f"http://localhost:{port}"
                self.root.after(0, lambda: self.url_label.config(text=self.server_url))
                
                config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning")
                server = uvicorn.Server(config)
                
                def check_server():
                    for _ in range(30):
                        if self.check_port(port):
                            self.root.after(0, self.on_server_ready)
                            return
                        time.sleep(0.5)
                    self.root.after(0, lambda: self.on_server_error("Timeout"))
                
                threading.Thread(target=check_server, daemon=True).start()
                server.run()
            except Exception as e:
                self.root.after(0, lambda: self.on_server_error(str(e)))
        
        threading.Thread(target=run_server, daemon=True).start()
    
    def on_server_ready(self):
        self.is_running = True
        self.status_dot.config(fg=self.SUCCESS)
        self.status_label.config(text="Server is running", fg=self.SUCCESS)
        self.root.after(500, self.open_browser)
    
    def on_server_error(self, error=""):
        self.status_dot.config(fg=self.ERROR)
        self.status_label.config(text="Failed to start", fg=self.ERROR)
        if error:
            messagebox.showerror("Server Error", f"Failed:\n{error[:400]}")
    
    def open_browser(self):
        if self.is_running:
            webbrowser.open(self.server_url)
    
    def copy_url(self):
        self.root.clipboard_clear()
        self.root.clipboard_append(self.server_url)
        self.status_label.config(text="URL copied!", fg=self.ACCENT)
        self.root.after(2000, lambda: self.status_label.config(
            text="Server is running" if self.is_running else "Starting...",
            fg=self.SUCCESS if self.is_running else self.TEXT_SECONDARY))
    
    def stop_server(self):
        if messagebox.askyesno("Stop", "Stop the server and quit?"):
            os._exit(0)
    
    def on_closing(self):
        if self.is_running:
            if messagebox.askyesno("Quit", "Stop the server and quit?"):
                os._exit(0)
        else:
            os._exit(0)


def main():
    from dotenv import load_dotenv
    load_dotenv()
    root = tk.Tk()
    NovaDoLauncher(root)
    root.mainloop()


if __name__ == "__main__":
    main()
