# HA Maintenance Center

Home Assistant Add-on zur Analyse von Speicher, Backups, Datenbank, RAM/SWAP und USB/HID-Geräten.

## Installation über GitHub

1. Dieses Repository bei GitHub hochladen.
2. In Home Assistant öffnen: **Einstellungen → Add-ons → Add-on Store → ⋮ → Repositories**.
3. Repository-URL einfügen, z. B.:

```text
https://github.com/Peraboto/ha-maintenance-center
```

4. Add-on Store neu laden.
5. **HA Maintenance Center** installieren und starten.

## Funktionen Version 1

- Systemübersicht RAM/SWAP/Disk
- Speicher-Treemap für `/config`, `/backup`, `/media`, `/share`, `/addon_configs`
- größte Dateien und Ordner
- Backup-Liste
- Datenbankgröße
- USB-/HID-Geräte inkl. Busch-Jaeger KNX USB und Realtek RTL2832U
- Containerübersicht, wenn Docker-Socket verfügbar ist

## Sicherheit

Version 1 löscht keine Dateien. Das Add-on analysiert nur.
