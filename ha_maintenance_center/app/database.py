import os
from pathlib import Path

DBS = [Path("/config/home-assistant_v2.db"), Path("/config/backup.db")]

def database_info():
    out = []
    for db in DBS:
        if db.exists():
            st = db.stat()
            out.append({"name": db.name, "path": str(db), "size": st.st_size, "mtime": int(st.st_mtime)})
    return out
