import os
import shutil
import psutil

PATHS = {
    "config": "/config",
    "backup": "/backup",
    "media": "/media",
    "share": "/share",
    "addon_configs": "/addon_configs",
}

def disk_info(path):
    try:
        usage = shutil.disk_usage(path)
        return {
            "path": path,
            "total": usage.total,
            "used": usage.used,
            "free": usage.free,
            "percent": round((usage.used / usage.total) * 100, 1) if usage.total else 0,
        }
    except Exception as exc:
        return {"path": path, "error": str(exc)}

def get_system_info():
    vm = psutil.virtual_memory()
    sw = psutil.swap_memory()
    return {
        "cpu_percent": psutil.cpu_percent(interval=0.1),
        "memory": {
            "total": vm.total,
            "used": vm.used,
            "available": vm.available,
            "percent": vm.percent,
        },
        "swap": {
            "total": sw.total,
            "used": sw.used,
            "free": sw.free,
            "percent": sw.percent,
        },
        "disks": {name: disk_info(path) for name, path in PATHS.items() if os.path.exists(path)},
    }
