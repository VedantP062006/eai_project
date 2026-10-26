"""
Launcher Script for AI Gesture-Controlled Smart Vehicle System.
Starts the FastAPI Backend and the React Frontend concurrently.
"""

import sys
import time
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / "frontend"


def main():
    print("=" * 70)
    print("   AI GESTURE-CONTROLLED SMART VEHICLE SYSTEM (AURA AI)")
    print("=" * 70)
    print("Starting FastAPI Backend on http://localhost:8000 ...")

    # Start FastAPI backend
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=str(ROOT_DIR)
    )

    # Allow backend 1.5 seconds to bind
    time.sleep(1.5)

    print("Starting Vite React Frontend on http://localhost:5173 ...")
    # Start frontend
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev", "--", "--host"],
        cwd=str(FRONTEND_DIR)
    )

    print("\n" + "=" * 70)
    print("   SYSTEM RUNNING AND READY!")
    print("   - Dashboard:        http://localhost:5173")
    print("   - API & Telemetry:  http://localhost:8000")
    print("   - Swagger Docs:     http://localhost:8000/docs")
    print("   - Live Video Stream: http://localhost:8000/api/video_feed")
    print("   Press Ctrl+C to terminate both servers.")
    print("=" * 70 + "\n")

    try:
        while True:
            time.sleep(1)
            if backend_proc.poll() is not None:
                print("Backend terminated unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print("Frontend terminated unexpectedly.")
                break
    except KeyboardInterrupt:
        print("\nShutting down servers...")
    finally:
        try:
            backend_proc.terminate()
            frontend_proc.terminate()
            backend_proc.wait(timeout=3)
            frontend_proc.wait(timeout=3)
        except Exception:
            pass
        print("Servers stopped cleanly.")


if __name__ == "__main__":
    main()
