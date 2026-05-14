# 🪐 Orbital Simulator - Sonnensystem Explorer

Docker-basiertes Orbital-Simulationssystem für Synology DS918+ mit 12 GB RAM.
Visualisiert Planeten, Zwergplaneten, TNOs und die Planet-9-Hypothese auf Basis
heliozentrischer Kepler-Bahnen.

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![Docker](https://img.shields.io/badge/docker-ready-green)
![Tests](https://img.shields.io/badge/tests-117_passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-orange)

## ✨ Features

### 🌍 Himmelskörper-Datenbank
- **8 Planeten** + Sonne mit J2000-Bahnelementen
- **9 Zwergplaneten** (Pluto, Eris, Ceres, Makemake, Haumea, Gonggong, Quaoar, Orcus, Salacia)
- **12 TNOs** inkl. Sedna, 2012 VP113, 2023 KQ14 „Ammonite"
- **Planet-9-Vorhersage** mit Parametern nach Batygin & Brown (Stand 2025)
- Statische Daten aus NASA JPL Horizons / Minor Planet Center

### 🔬 Bahnmechanik
- Heliozentrische **Kepler-Bahnen** auf J2000.0-Epoche
- Newton-Raphson-Löser für die Kepler-Gleichung (Konvergenz bei e ≥ 0.9 getestet)
- Vis-viva-Geschwindigkeit, Synodische Perioden, Orbitalpfade, Ephemeriden
- ⚠️ **Keine N-Body-Perturbationen** — jeder Körper folgt seiner ungestörten Kepler-Bahn.
  Reale Jupiter/Saturn-Störungen auf TNO-Bahnen sind aktuell nicht abgebildet.

### 🎮 Frontend
- Canvas-2D mit Pseudo-3D-Achsenrotation (echtes 3D mit Tiefenstaffelung noch offen)
- Zeitsteuerung mit Animation, Zoom & Pan
- iPad-/Touch-optimiert (Bedienelemente ≥ 44 × 44 px)
- Production-Caching (1 Tag JS/CSS, 7 Tage Assets)

### 🧪 Test-Suite
- **117 pytest-Tests** über Physik, Endpoints, Datenintegrität
- Parametrize über alle 31 Himmelskörper für Strukturvalidierung
- Lokal-Run in < 1 s

---

## 📋 Systemanforderungen

| Komponente | Minimum | Empfohlen |
| ---------- | ------- | --------- |
| Synology   | DS918+  | DS918+    |
| RAM        | 8 GB    | 12 GB     |
| Docker     | 24.0+   | 27.0+     |
| Speicher   | 500 MB  | 1 GB      |

Hinweis: Multi-stage Build, das Backend-Image landet nach Build bei ~300 MB
(vorher ~600 MB durch Compile-Toolchain im Runtime-Image).

---

## 🚀 Installation auf Synology DS918+

```bash
ssh admin@deine-synology-ip
mkdir -p /volume1/docker/orbital-simulator
cd /volume1/docker/orbital-simulator
# Dateien per FileStation oder rsync hochladen, dann:
sudo docker compose up -d --build
```

Bei Code-Änderungen:

```bash
sudo docker compose down
sudo docker compose build --no-cache backend
sudo docker compose up -d
```

`--no-cache` ist auf DS918+ Pflicht bei Schema- oder Endpoint-Änderungen, sonst
zieht der Build den alten Layer.

---

## 🌐 Zugriff

| Dienst     | URL                          |
| ---------- | ---------------------------- |
| Frontend   | http://&lt;nas&gt;:5557      |
| Backend    | http://&lt;nas&gt;:5556      |
| API-Probe  | http://&lt;nas&gt;:5556/api/health |
| Bodies     | http://&lt;nas&gt;:5556/api/bodies |

---

## 🧪 Tests ausführen

Lokal:

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
pytest tests/ -v
```

Erwartung: **117 passed in < 1 s.**

Tests sind nicht im Production-Image. Wer sie im Container fahren will, ergänzt
`requirements-dev.txt` im Dockerfile (Stage 2) oder läuft sie als one-off:

```bash
docker compose run --rm backend sh -c \
  "pip install pytest==8.3.4 pytest-flask==1.3.0 && pytest tests/ -v"
```

---

## 📚 API-Endpunkte

| Endpoint                              | Methode | Beschreibung                                |
| ------------------------------------- | ------- | ------------------------------------------- |
| `/api/health`                         | GET     | Systemstatus                                |
| `/api/bodies`                         | GET     | Alle Himmelskörper                          |
| `/api/bodies?include_planet9=true`    | GET     | inkl. Planet-9-Vorhersage (neu in 1.1)      |
| `/api/bodies?category=planets`        | GET     | nur Planeten (oder `dwarf_planets`, `tnos`) |
| `/api/bodies/<id>`                    | GET     | Einzelner Körper (auch via deutschen Namen) |
| `/api/position/<id>/<timestamp>`      | GET     | Position berechnen (ISO 8601 oder `now`)    |
| `/api/orbit/<id>?points=N`            | GET     | Bahnpfad mit N Punkten                      |
| `/api/simulate`                       | POST    | Zeitreihen-Simulation (Kepler, kein N-Body) |
| `/api/planet9/search`                 | GET     | Planet-9-Suchzone + TNO-Clustering          |
| `/api/tno/discoveries`                | GET     | TNO-Entdeckungsgeschichte                   |
| `/api/categories`                     | GET     | Kategorien & Farben                         |
| `/api/time/convert`                   | GET     | Julian Date ↔ ISO 8601                      |
| `/api/ephemeris`                      | GET     | Ephemeriden-Tabelle                         |

### Beispiel: Position abfragen

```bash
curl "http://localhost:5556/api/position/earth/2026-04-06T12:00:00"
```

### Beispiel: Simulation starten

```bash
curl -X POST "http://localhost:5556/api/simulate" \
  -H "Content-Type: application/json" \
  -d '{"bodies":["earth","mars","jupiter"],"start_time":"2026-01-01","end_time":"2027-01-01","steps":100}'
```

---

## ⚠️ Bekannte Limitierungen

| # | Limitierung                                  | Auswirkung                                                                              | Plan                              |
| - | -------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------- |
| 1 | Keine N-Body-Sim                             | Jupiter/Saturn-Störung auf TNOs nicht modelliert                                        | RK4-Integration (Sprint A)        |
| 2 | Frontend rechnet doppelt                     | Kepler-Solver läuft im Backend UND im Frontend-JS                                       | Server-only nach Three.js-Umstieg |
| 3 | Pseudo-3D                                    | Achsenrotation ohne Tiefe/Perspektive                                                   | Three.js-Sprint (Sprint B)        |
| 4 | `key_prefix='all_bodies'` ignoriert Args     | Cache-Hit zwischen Query-Varianten — Tests kompensieren via `cache.clear()`-Fixture     | Endpoint-Refactor offen           |
| 5 | Statische Body-Daten                         | Neue TNO-Entdeckungen nur per Code-Edit                                                 | JPL-Horizons-Pipeline (Sprint C)  |
| 6 | Sortierung nur nach `a`                      | TNOs mit ähnlicher Halbachse aber stark unterschiedlicher Inklination clustern in UI    | UI-Filter offen                   |

---

## 🔬 Wissenschaftliche Daten

### Planet-9-Parameter (Batygin & Brown, Stand 2025)

| Parameter     | Wert            |
| ------------- | --------------- |
| Halbachse     | 400–800 AU      |
| Exzentrizität | 0.2–0.5         |
| Inklination   | 15–30°          |
| Masse         | 5–10 Erdmassen  |
| Umlaufzeit    | ~11 000 Jahre   |

### TNO-Klassifikation

| Typ          | Beschreibung                                |
| ------------ | ------------------------------------------- |
| Sednoid      | Extrem sonnenfern (a > 200 AU, q > 50 AU)   |
| Extreme TNO  | Sehr große Bahnen (a > 150 AU)              |
| Detached     | Gelöst von Neptun-Einfluss                  |
| Scattered    | Durch Neptun gestreut                       |

---

## 👨‍👩‍👧‍👦 Für Kinder

Der Simulator ist ab ca. 8 Jahren geeignet — Erklärungen sind kindgerecht in
deutscher Sprache, Tooltips zeigen „Wusstest du?"-Fakten.

### Aktivitäten

1. **Planetensafari** — alle 8 Planeten finden
2. **TNO-Jagd** — Sedna und andere ferne Objekte entdecken
3. **Zeitreise** — 100 Jahre in die Zukunft springen
4. **Planet-9-Suche** — wo könnte der mysteriöse Planet sein?

---

## 📝 Changelog

### v1.1.0 (Mai 2026) — Hausaufgaben-Sprint
- **E.1** Dependency-Konflikt aufgelöst (Flask 2/Werkzeug 3 → Flask 3.0.3 + Werkzeug 3.0.4)
- **E.1** Multi-stage Docker-Build, Image ~50 % kleiner
- **E.1** Dev-Volume-Mount aus `docker-compose.yml` entfernt (Source ist im Image)
- **E.1** `flask-restx`, `python-dateutil`, `pytz` als ungenutzt entfernt
- **E.1** `backend_fix_requirements.py` (tot nach Dep-Fix) gelöscht
- **E.2** `datetime.utcnow()` → `_now_utc()` (Python 3.12+ Kompatibilität)
- **E.2** `PLANET_9_PREDICTION` jetzt auch via `/api/bodies?include_planet9=true`
- **E.2** Toter `scipy.optimize.brentq`-Import aus beiden Modulen
- **E.3** nginx auf Production-Cache umgestellt (war versehentlich Debug-No-Cache)
- **E.3** pytest-Suite mit 117 Tests aufgesetzt (Physik, Endpoints, Datenintegrität)

### v1.0.0 (April 2026)
- Erste Version: Kepler-Bahnen, Canvas-Frontend, Planet-9-Hypothese

---

## 📄 Lizenz

MIT License — frei zur Nutzung und Modifikation.

---

## 🙏 Danksagung

- **NASA JPL Horizons** — Bahndaten
- **Minor Planet Center** — TNO-Datenbank
- **Batygin & Brown** — Planet-9-Forschung
- **Caltech** — wissenschaftliche Grundlagen
