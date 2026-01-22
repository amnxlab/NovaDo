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

# Handle PyInstaller frozen executable
if getattr(sys, 'frozen', False):
    # Running as compiled executable
    BASE_DIR = Path(sys._MEIPASS)
    WORK_DIR = Path(os.path.dirname(sys.executable))
    # Fix for windowed mode: redirect stdout/stderr if None
    if sys.stdout is None:
        sys.stdout = open(os.devnull, 'w')
    if sys.stderr is None:
        sys.stderr = open(os.devnull, 'w')
else:
    # Running as script
    BASE_DIR = Path(__file__).parent
    WORK_DIR = BASE_DIR

os.chdir(WORK_DIR)
sys.path.insert(0, str(BASE_DIR))


class NovaDoLauncher:
    # Dark theme colors
    BG_DARK = "#101014"
    BG_CARD = "#23232a"
    GLASS_BG = "#23232a"
    GLASS_ALPHA = 0.85
    ACCENT = "#00ffe7"
    ACCENT_HOVER = "#00b3ff"
    NEON = "#00ffe7"
    SUCCESS = "#00ff99"
    ERROR = "#ff3571"
    WARNING = "#ffe066"
    TEXT_PRIMARY = "#e0e7ef"
    TEXT_SECONDARY = "#7dd3fc"
    FONT_FAMILY = "Cascadia Mono"
    TITLE_FONT = ("Cascadia Mono", 28, "bold")
    SUB_FONT = ("Fira Mono", 12)
    TERMINAL_FONT = ("Cascadia Mono", 10)
    
    def __init__(self, root):
        self.root = root
        self.root.title("NovaDo")
        self.root.geometry("500x520")
        self.root.resizable(False, False)
        self.root.configure(bg=self.BG_DARK)
        # Do not set a global '*Font' option to avoid issues with multi-word font families
        self.bg_anim = None
        
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
            WORK_DIR / "static" / filename,
            BASE_DIR / "static" / filename,
            WORK_DIR / "_internal" / filename,
            BASE_DIR / "_internal" / filename,
            WORK_DIR / "_internal" / "static" / filename,
            BASE_DIR / "_internal" / "static" / filename,
        ]
        for path in locations:
            if path.exists():
                return path
        return None
    
    def set_window_icon(self):
        """Set window and taskbar icon using PNG converted to PhotoImage"""
        try:
            # First try .ico file
            ico_path = self.find_file("logo.ico")
            if ico_path:
                self.root.iconbitmap(str(ico_path))
                return
            
            # Fall back to PNG using PIL
            png_path = self.find_file("logo.png")
            if png_path:
                try:
                    from PIL import Image, ImageTk
                    img = Image.open(png_path)
                    # Create multiple sizes for taskbar
                    icon_photo = ImageTk.PhotoImage(img.resize((32, 32), Image.Resampling.LANCZOS))
                    self.root.iconphoto(True, icon_photo)
                    # Keep reference to prevent garbage collection
                    self._icon_photo = icon_photo
                except Exception:
                    pass
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
        # Fallback: emoji (use safe font fallback to avoid Tkinter font parsing issues)
        try:
            return tk.Label(parent, text="✨", font=("Segoe UI", 32), bg=self.BG_DARK, fg=self.ACCENT)
        except Exception:
            return tk.Label(parent, text="✨", bg=self.BG_DARK, fg=self.ACCENT)

    def build_ui(self):
        # Animated matrix background
        self.bg_canvas = tk.Canvas(self.root, width=500, height=520, bg=self.BG_DARK, highlightthickness=0, bd=0)
        self.bg_canvas.place(x=0, y=0, relwidth=1, relheight=1)
        self.matrix_drops = [0 for _ in range(50)]
        self.animate_matrix()

        main = tk.Frame(self.root, bg=self.BG_DARK, padx=35, pady=30)
        main.pack(fill=tk.BOTH, expand=True)

        # Header with logo and title side by side
        header = tk.Frame(main, bg=self.BG_DARK)
        header.pack(pady=(0, 25))

        logo_label = self.load_logo(header)
        logo_label.pack(side=tk.LEFT, padx=(0, 15))

        title_container = tk.Frame(header, bg=self.BG_DARK)
        title_container.pack(side=tk.LEFT)

        tk.Label(title_container, text="NovaDo", font=self.TITLE_FONT,
                bg=self.BG_DARK, fg=self.NEON).pack(anchor=tk.W)
        tk.Label(title_container, text="Smart Task Management", font=self.SUB_FONT if isinstance(self.SUB_FONT, tuple) else (self.SUB_FONT, 12),
                bg=self.BG_DARK, fg=self.TEXT_SECONDARY).pack(anchor=tk.W)
        # Status card (glassmorphism)
        status_card = tk.Frame(main, bg=self.GLASS_BG, padx=16, pady=14, bd=0, relief=tk.FLAT)
        status_card.pack(fill=tk.X, pady=(0, 15))
        status_card.configure(highlightbackground=self.NEON, highlightthickness=2)
        status_card.bind("<Enter>", lambda e: status_card.configure(bg="#23233a"))
        status_card.bind("<Leave>", lambda e: status_card.configure(bg=self.GLASS_BG))

        # Animated status dot
        self.status_dot = tk.Canvas(status_card, width=22, height=22, bg=self.GLASS_BG, highlightthickness=0, bd=0)
        self.status_dot.pack(side=tk.LEFT)
        self.status_dot_id = self.status_dot.create_oval(5, 5, 17, 17, fill=self.WARNING, outline=self.NEON, width=2)
        self.status_anim_phase = 0
        self.animate_status_dot()

        self.status_label = tk.Label(status_card, text="Starting server...",
                                     font=self.SUB_FONT, bg=self.GLASS_BG, fg=self.TEXT_SECONDARY)
        self.status_label.pack(side=tk.LEFT, padx=(10, 0))

        # URL card (glassmorphism)
        url_card = tk.Frame(main, bg=self.GLASS_BG, padx=16, pady=14, bd=0, relief=tk.FLAT)
        url_card.pack(fill=tk.X, pady=(0, 20))
        url_card.configure(highlightbackground=self.NEON, highlightthickness=2)

        tk.Label(url_card, text="Server URL", font=(self.FONT_FAMILY, 9),
            bg=self.GLASS_BG, fg=self.TEXT_SECONDARY).pack(anchor=tk.W)

        url_row = tk.Frame(url_card, bg=self.GLASS_BG)
        url_row.pack(fill=tk.X, pady=(6, 0))

        self.url_label = tk.Label(url_row, text=self.server_url, font=("Cascadia Mono", 13, "bold"),
                      bg=self.GLASS_BG, fg=self.ACCENT, cursor="hand2")
        self.url_label.pack(side=tk.LEFT)
        self.url_label.bind("<Button-1>", lambda e: self.open_browser())
        self.url_label.bind("<Enter>", lambda e: self.url_label.config(fg=self.ACCENT_HOVER, underline=True))
        self.url_label.bind("<Leave>", lambda e: self.url_label.config(fg=self.ACCENT, underline=False))

        copy_btn = tk.Label(url_row, text="🗒️", font=(self.FONT_FAMILY, 14),
                   bg=self.GLASS_BG, fg=self.TEXT_SECONDARY, cursor="hand2")
        copy_btn.pack(side=tk.RIGHT)
        copy_btn.bind("<Button-1>", lambda e: self.copy_url())
        copy_btn.bind("<Enter>", lambda e: copy_btn.config(fg=self.ACCENT_HOVER))
        copy_btn.bind("<Leave>", lambda e: copy_btn.config(fg=self.TEXT_SECONDARY))

        # Buttons with neon glow
        self.open_btn = tk.Button(main, text="🧑‍💻  Open in Browser", font=(self.FONT_FAMILY, 12, "bold"),
                      bg=self.ACCENT, fg="#101014", relief=tk.FLAT, pady=13,
                      cursor="hand2", command=self.open_browser,
                      activebackground=self.ACCENT_HOVER, activeforeground="#101014",
                      bd=0, highlightthickness=0)
        self.open_btn.pack(fill=tk.X, pady=(0, 12))
        self.open_btn.bind("<Enter>", lambda e: self.open_btn.config(bg=self.ACCENT_HOVER))
        self.open_btn.bind("<Leave>", lambda e: self.open_btn.config(bg=self.ACCENT))

        self.stop_btn = tk.Button(main, text="🛑  Stop Server", font=(self.FONT_FAMILY, 12),
                      bg=self.ERROR, fg="#101014", relief=tk.FLAT, pady=13,
                      cursor="hand2", command=self.stop_server,
                      activebackground="#b91c1c", activeforeground="#101014",
                      bd=0, highlightthickness=0)
        self.stop_btn.pack(fill=tk.X)
        self.stop_btn.bind("<Enter>", lambda e: self.stop_btn.config(bg="#b91c1c"))
        self.stop_btn.bind("<Leave>", lambda e: self.stop_btn.config(bg=self.ERROR))

        # Terminal-style footer
        self.terminal_footer = tk.Label(self.root, text="[NovaDo] :: Awaiting server...",
            font=self.TERMINAL_FONT, bg="#18181b", fg="#00ffe7", anchor="w")
        self.terminal_footer.place(relx=0, rely=1, anchor="sw", relwidth=1, y=-2)

    def animate_matrix(self):
        import random
        self.bg_canvas.delete("matrix")
        chars = "01"
        for i in range(len(self.matrix_drops)):
            x = i * 10
            y = self.matrix_drops[i] * 18
            color = "#00ffe7" if random.random() > 0.85 else "#00b3ff"
            self.bg_canvas.create_text(x+10, y, text=random.choice(chars), fill=color, font=("Cascadia Mono", 14), tags="matrix")
            if y > 520 and random.random() > 0.975:
                self.matrix_drops[i] = 0
            else:
                self.matrix_drops[i] += 1
        self.bg_anim = self.root.after(60, self.animate_matrix)

    def animate_status_dot(self):
        # Animate the status dot with a pulsing glow
        import math
        self.status_anim_phase = (self.status_anim_phase + 1) % 60
        glow = int(8 + 4 * math.sin(self.status_anim_phase * math.pi / 30))
        self.status_dot.coords(self.status_dot_id, 5-glow/8, 5-glow/8, 17+glow/8, 17+glow/8)
        self.status_dot.itemconfig(self.status_dot_id, outline=self.NEON, width=2+glow//6)
        self.root.after(60, self.animate_status_dot)
    
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
                
                # Log startup
                log_file = self.work_dir / "startup.log"
                with open(log_file, "w") as f:
                    f.write(f"Starting server...\n")
                    f.write(f"BASE_DIR: {BASE_DIR}\n")
                    f.write(f"WORK_DIR: {WORK_DIR}\n")
                
                try:
                    import uvicorn
                    import asyncio
                    with open(log_file, "a") as f:
                        f.write("uvicorn imported OK\n")
                except Exception as e:
                    with open(log_file, "a") as f:
                        f.write(f"uvicorn import failed: {e}\n")
                    raise
                
                try:
                    from main import app
                    with open(log_file, "a") as f:
                        f.write("main.app imported OK\n")
                except Exception as e:
                    with open(log_file, "a") as f:
                        f.write(f"main.app import failed: {e}\n")
                        import traceback
                        f.write(traceback.format_exc())
                    raise
                
                port = int(os.getenv("PORT", 5000))
                
                # Kill any existing process on this port
                self.kill_port(port)
                time.sleep(0.5)
                
                self.server_url = f"http://localhost:{port}"
                self.root.after(0, lambda: self.url_label.config(text=self.server_url))
                
                with open(log_file, "a") as f:
                    f.write(f"Starting uvicorn on port {port}...\n")
                
                def check_server():
                    # Increased timeout to 60 seconds (120 checks * 0.5s)
                    for i in range(120):
                        if self.check_port(port):
                            self.root.after(0, self.on_server_ready)
                            return
                        time.sleep(0.5)
                        if i % 10 == 0:
                            with open(log_file, "a") as f:
                                f.write(f"Waiting for server... check {i}\n")
                    self.root.after(0, lambda: self.on_server_error("Timeout - server didn't start within 60 seconds"))
                
                threading.Thread(target=check_server, daemon=True).start()
                
                try:
                    with open(log_file, "a") as f:
                        f.write("Creating new event loop for uvicorn...\n")
                    
                    # Create a new event loop for this thread
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    
                    config = uvicorn.Config(app, host="127.0.0.1", port=port, log_level="info", loop="asyncio")
                    server = uvicorn.Server(config)
                    
                    with open(log_file, "a") as f:
                        f.write("Running server with asyncio loop...\n")
                    
                    loop.run_until_complete(server.serve())
                    
                    with open(log_file, "a") as f:
                        f.write("server.serve() completed (server stopped)\n")
                except Exception as e:
                    with open(log_file, "a") as f:
                        import traceback
                        f.write(f"server.serve() failed: {e}\n{traceback.format_exc()}\n")
            except Exception as e:
                import traceback
                error_msg = f"{e}\n{traceback.format_exc()}"
                log_file = self.work_dir / "startup.log"
                with open(log_file, "a") as f:
                    f.write(f"Server error: {error_msg}\n")
                self.root.after(0, lambda: self.on_server_error(str(e)))
        
        threading.Thread(target=run_server, daemon=True).start()
    
    def on_server_ready(self):
        self.is_running = True
        self.status_dot.itemconfig(self.status_dot_id, fill=self.SUCCESS)
        self.status_label.config(text="Server is running", fg=self.SUCCESS)
        self.terminal_footer.config(text="[NovaDo] :: Server running at {}".format(self.server_url), fg=self.SUCCESS)
        self.root.after(500, self.open_browser)
    
    def on_server_error(self, error=""):
        self.status_dot.itemconfig(self.status_dot_id, fill=self.ERROR)
        self.status_label.config(text="Failed to start", fg=self.ERROR)
        self.terminal_footer.config(text="[NovaDo] :: Server failed to start", fg=self.ERROR)
        if error:
            messagebox.showerror("Server Error", f"Failed:\n{error[:400]}")
    
    def open_browser(self):
        if self.is_running:
            webbrowser.open(self.server_url)
    
    def copy_url(self):
        self.root.clipboard_clear()
        self.root.clipboard_append(self.server_url)
        self.status_label.config(text="URL copied!", fg=self.ACCENT)
        self.status_dot.itemconfig(self.status_dot_id, fill=self.ACCENT)
        self.terminal_footer.config(text="[NovaDo] :: URL copied to clipboard", fg=self.ACCENT)
        self.root.after(1200, lambda: [
            self.status_label.config(
                text="Server is running" if self.is_running else "Starting...",
                fg=self.SUCCESS if self.is_running else self.TEXT_SECONDARY),
            self.status_dot.itemconfig(self.status_dot_id, fill=self.SUCCESS if self.is_running else self.WARNING),
            self.terminal_footer.config(
                text="[NovaDo] :: Server running at {}".format(self.server_url) if self.is_running else "[NovaDo] :: Awaiting server...",
                fg=self.SUCCESS if self.is_running else self.ACCENT)
        ])
    
    def stop_server(self):
        if messagebox.askyesno("Stop", "Stop the server and quit?"):
            if self.bg_anim:
                self.root.after_cancel(self.bg_anim)
            os._exit(0)
    
    def on_closing(self):
        if self.is_running:
            if messagebox.askyesno("Quit", "Stop the server and quit?"):
                if self.bg_anim:
                    self.root.after_cancel(self.bg_anim)
                os._exit(0)
        else:
            if self.bg_anim:
                self.root.after_cancel(self.bg_anim)
            os._exit(0)


def main():
    from dotenv import load_dotenv
    load_dotenv()
    root = tk.Tk()
    NovaDoLauncher(root)
    root.mainloop()


if __name__ == "__main__":
    main()
