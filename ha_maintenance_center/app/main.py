from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from system_info import get_system_info
from scanner import scan_roots
from backups import list_backups
from database import database_info
from usb_devices import usb_info
from containers import container_stats

app = FastAPI(title="HA Maintenance Center")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/summary")
def api_summary():
    return {
        "system": get_system_info(),
        "backups": list_backups(),
        "database": database_info(),
        "usb": usb_info(),
        "containers": container_stats(),
    }

@app.get("/api/treemap")
def api_treemap():
    return scan_roots()
