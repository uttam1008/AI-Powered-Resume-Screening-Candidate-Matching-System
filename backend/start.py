import ctypes
import platform
import uvicorn

def disable_quick_edit():
    """
    Disables the Windows 'QuickEdit Mode' for the console.
    QuickEdit Mode pauses the entire process whenever the user clicks inside the terminal window.
    Disabling this permanently fixes the server deadlock issue on Windows.
    """
    if platform.system() == "Windows":
        try:
            kernel32 = ctypes.windll.kernel32
            # STD_INPUT_HANDLE is -10
            handle = kernel32.GetStdHandle(-10)
            mode = ctypes.c_uint32()
            kernel32.GetConsoleMode(handle, ctypes.byref(mode))
            # ENABLE_QUICK_EDIT_MODE is 0x0040
            mode.value &= ~0x0040
            kernel32.SetConsoleMode(handle, mode)
            print("[INFO] Windows QuickEdit mode successfully disabled to prevent server freezing.")
        except Exception as e:
            print(f"[WARN] Failed to disable QuickEdit mode: {e}")

if __name__ == "__main__":
    disable_quick_edit()
    # Now start the server
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
