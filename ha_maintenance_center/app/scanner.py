import os
import stat

ROOTS = [
    ("Backup", "/backup"),
    ("Config", "/config"),
    ("Media", "/media"),
    ("Share", "/share"),
    ("Addon configs", "/addon_configs"),
]

MAX_FILES = int(os.environ.get("MAX_FILES", "30000"))
MAX_DEPTH = int(os.environ.get("SCAN_DEPTH", "6"))

SKIP_NAMES = {"proc", "sys", "dev", "run", "tmp", "__pycache__"}


def safe_stat(path):
    try:
        return os.lstat(path)
    except Exception:
        return None


def classify(path):
    p = str(path).lower()
    if p.endswith(".tar") or "/backup" in p:
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


def file_node(path, name, st):
    return {
        "name": name or os.path.basename(path),
        "path": path,
        "value": st.st_size,
        "type": classify(path),
        "mtime": int(st.st_mtime),
    }


def directory_fast_children(path, name, depth, counter):
    node = {
        "name": name or os.path.basename(path) or path,
        "path": path,
        "children": [],
        "type": "folder",
    }

    try:
        entries = list(os.scandir(path))
    except Exception:
        node["value"] = 0
        node["type"] = "error"
        return node

    total = 0

    for e in entries:
        if e.name in SKIP_NAMES:
            continue

        child = build_tree(e.path, e.name, depth + 1, counter)
        val = child.get("value", 0)
        total += val
        node["children"].append(child)

    node["value"] = total
    node["children"] = sorted(
        [c for c in node["children"] if c.get("value", 0) > 0],
        key=lambda c: c.get("value", 0),
        reverse=True
    )[:500]

    return node


def directory_total_size(path):
    total = 0
    try:
        for root, dirs, files in os.walk(path):
            dirs[:] = [d for d in dirs if d not in SKIP_NAMES]
            for f in files:
                fp = os.path.join(root, f)
                try:
                    total += os.path.getsize(fp)
                except Exception:
                    pass
    except Exception:
        pass
    return total


def build_tree(path, name=None, depth=0, counter=None):
    if counter is None:
        counter = {"count": 0}

    counter["count"] += 1
    if counter["count"] > MAX_FILES:
        return {
            "name": name or os.path.basename(path),
            "path": path,
            "value": directory_total_size(path) if os.path.isdir(path) else 0,
            "type": "limit",
        }

    st = safe_stat(path)
    if not st:
        return {
            "name": name or os.path.basename(path),
            "path": path,
            "value": 0,
            "type": "error",
        }

    if stat.S_ISLNK(st.st_mode):
        return {
            "name": name or os.path.basename(path),
            "path": path,
            "value": 0,
            "type": "symlink",
        }

    if stat.S_ISREG(st.st_mode):
        return file_node(path, name, st)

    if stat.S_ISDIR(st.st_mode):
        if depth >= MAX_DEPTH:
            return {
                "name": name or os.path.basename(path) or path,
                "path": path,
                "value": directory_total_size(path),
                "children": [],
                "type": "folder",
            }

        return directory_fast_children(path, name, depth, counter)

    return {
        "name": name or os.path.basename(path),
        "path": path,
        "value": 0,
        "type": "other",
    }


def scan_roots():
    children = []

    for label, path in ROOTS:
        if os.path.exists(path):
            counter = {"count": 0}
            children.append(build_tree(path, label, 0, counter))

    children = sorted(children, key=lambda c: c.get("value", 0), reverse=True)

    return {
        "name": "Home Assistant",
        "path": "/",
        "children": children,
        "value": sum(c.get("value", 0) for c in children),
        "type": "folder",
    }
