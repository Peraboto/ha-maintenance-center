import os
import stat
from pathlib import Path

ROOTS = [
    ("Config", "/config"),
    ("Backup", "/backup"),
    ("Media", "/media"),
    ("Share", "/share"),
    ("Addon configs", "/addon_configs"),
]
MAX_FILES = int(os.environ.get("MAX_FILES", "8000"))
MAX_DEPTH = int(os.environ.get("SCAN_DEPTH", "5"))

SKIP_NAMES = {"proc", "sys", "dev", "run", "tmp"}

def safe_stat(path):
    try:
        return os.lstat(path)
    except Exception:
        return None

def classify(path):
    p = str(path).lower()
    if p.endswith(".tar") or "backup" in p:
        return "backup"
    if p.endswith(".db") or p.endswith(".sqlite"):
        return "database"
    if p.endswith(".log"):
        return "log"
    if "custom_components" in p or "hacs" in p:
        return "hacs"
    if any(p.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".mp4", ".mkv", ".webm"]):
        return "media"
    return "other"

def build_tree(path, name=None, depth=0, counter=None):
    if counter is None:
        counter = {"count": 0}
    counter["count"] += 1
    if counter["count"] > MAX_FILES:
        return {"name": name or os.path.basename(path), "path": path, "value": 0, "type": "limit"}

    st = safe_stat(path)
    if not st:
        return {"name": name or os.path.basename(path), "path": path, "value": 0, "type": "error"}

    if stat.S_ISLNK(st.st_mode):
        return {"name": name or os.path.basename(path), "path": path, "value": 0, "type": "symlink"}

    if stat.S_ISDIR(st.st_mode):
        node = {"name": name or os.path.basename(path) or path, "path": path, "children": [], "type": "folder"}
        if depth >= MAX_DEPTH:
            node["value"] = directory_size(path)
            return node
        try:
            entries = sorted(os.scandir(path), key=lambda e: e.name.lower())
        except Exception:
            node["value"] = 0
            node["type"] = "error"
            return node
        total = 0
        for e in entries:
            if e.name in SKIP_NAMES:
                continue
            child = build_tree(e.path, e.name, depth + 1, counter)
            val = child.get("value", 0) or sum(c.get("value", 0) for c in child.get("children", []))
            total += val
            node["children"].append(child)
        node["value"] = total
        node["children"] = sorted(node["children"], key=lambda c: c.get("value", 0), reverse=True)[:200]
        return node

    return {
        "name": name or os.path.basename(path),
        "path": path,
        "value": st.st_size,
        "type": classify(path),
        "mtime": int(st.st_mtime),
    }

def directory_size(path):
    total = 0
    for root, dirs, files in os.walk(path):
        for f in files:
            try:
                total += os.path.getsize(os.path.join(root, f))
            except Exception:
                pass
    return total

def scan_roots():
    children = []
    counter = {"count": 0}
    for label, path in ROOTS:
        if os.path.exists(path):
            children.append(build_tree(path, label, 0, counter))
    return {"name": "Home Assistant", "path": "/", "children": children}
