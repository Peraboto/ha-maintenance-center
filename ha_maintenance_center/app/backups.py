import os
import time
from pathlib import Path

BACKUP_DIR = Path("/backup")

def list_backups():
    result = []
    if not BACKUP_DIR.exists():
        return result
    for p in BACKUP_DIR.glob("*.tar"):
        try:
            st = p.stat()
            result.append({
                "name": p.name,
                "path": str(p),
                "size": st.st_size,
                "mtime": int(st.st_mtime),
                "age_days": int((time.time() - st.st_mtime) / 86400),
            })
        except Exception:
            pass
    return sorted(result, key=lambda x: x["size"], reverse=True)
