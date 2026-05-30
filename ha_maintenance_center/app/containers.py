import subprocess

def container_stats():
    try:
        out = subprocess.check_output([
            "docker", "stats", "--no-stream", "--format",
            "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}"
        ], text=True, stderr=subprocess.STDOUT, timeout=5)
        rows = []
        for line in out.splitlines():
            parts = line.split("|")
            if len(parts) == 4:
                rows.append({"name": parts[0], "cpu": parts[1], "memory": parts[2], "mem_percent": parts[3]})
        return {"available": True, "rows": rows}
    except Exception as exc:
        return {"available": False, "error": str(exc), "rows": []}
