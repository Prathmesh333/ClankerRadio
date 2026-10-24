"""Frozen local API entry point. Also exits when its desktop parent closes."""

import ctypes
import os
import threading

import uvicorn
from clanker_api.main import app


def main():
    server = uvicorn.Server(
        uvicorn.Config(
            app,
            host="127.0.0.1",
            port=int(os.environ["CLANKER_API_PORT"]),
            log_level="info",
            loop="asyncio",
            http="h11",
        )
    )
    parent = int(os.environ.get("CLANKER_PARENT_PID", "0"))
    if os.name == "nt" and parent:

        def watch_parent():
            kernel = ctypes.WinDLL("kernel32", use_last_error=True)
            kernel.OpenProcess.restype = ctypes.c_void_p
            kernel.WaitForSingleObject.argtypes = [ctypes.c_void_p, ctypes.c_uint32]
            kernel.CloseHandle.argtypes = [ctypes.c_void_p]
            handle = kernel.OpenProcess(0x00100000, False, parent)
            if handle:
                kernel.WaitForSingleObject(handle, 0xFFFFFFFF)
                kernel.CloseHandle(handle)
            server.should_exit = True

        threading.Thread(target=watch_parent, daemon=True).start()
    server.run()


if __name__ == "__main__":
    main()
