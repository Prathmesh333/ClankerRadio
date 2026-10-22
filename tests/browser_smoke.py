"""Compatibility entry point for the current live-performance browser check."""

import runpy
from pathlib import Path

runpy.run_path(str(Path(__file__).with_name("browser_performance.py")), run_name="__main__")
