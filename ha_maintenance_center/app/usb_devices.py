import os
import subprocess
from pathlib import Path

def run(cmd):
    try:
        return subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL).strip()
    except Exception:
        return ""

def hidraw_devices():
    result = []
    for uevent in Path("/sys/class/hidraw").glob("hidraw*/device/uevent"):
        dev = "/dev/" + uevent.parent.parent.name
        data = {}
        try:
            for line in uevent.read_text(errors="ignore").splitlines():
                if "=" in line:
                    k, v = line.split("=", 1)
                    data[k] = v
        except Exception:
            continue
        hid_id = data.get("HID_ID", "")
        vid = pid = ""
        parts = hid_id.split(":")
        if len(parts) >= 3:
            vid = parts[1][-4:].lower()
            pid = parts[2][-4:].lower()
        result.append({
            "dev": dev,
            "name": data.get("HID_NAME", ""),
            "phys": data.get("HID_PHYS", ""),
            "vid": vid,
            "pid": pid,
            "is_busch_jaeger_knx": vid == "145c" and pid == "1330",
        })
    return result

def usb_ls():
    lines = run(["lsusb"]).splitlines()
    devices = []
    for line in lines:
        devices.append({"raw": line, "is_busch_jaeger_knx": "145c:1330" in line.lower(), "is_realtek_rtl2832u": "0bda:2832" in line.lower()})
    return devices

def bus_usb_paths():
    paths = []
    root = Path("/dev/bus/usb")
    if root.exists():
        for p in root.glob("*/*"):
            paths.append(str(p))
    return sorted(paths)

def usb_info():
    return {"lsusb": usb_ls(), "hidraw": hidraw_devices(), "bus_paths": bus_usb_paths()}
