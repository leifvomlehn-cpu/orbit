# 🪐 Orbital Simulator - Sonnensystem Explorer

Docker-basiertes Orbital-Simulationssystem für Synology DS918+ mit 12 GB RAM.
Visualisiert Planeten, Zwergplaneten, TNOs und die Planet-9-Hypothese auf Basis
heliozentrischer Kepler-Bahnen.

![Version](https://img.shields.io/badge/version-1.2.0-blue)
![Docker](https://img.shields.io/badge/docker-ready-green)
![Tests](https://img.shields.io/badge/tests-196_passing-brightgreen)
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
- Vis-viva-Geschwindigkeit, Synodische Perioden, Orbitalpfade
- **N-Body-Simulation** via `/api/simulate/nbody` (RK4 / symplektischer Verlet,
  baryzentrisch, numba-beschleunigt) inkl. Planet-9-Testläufen

### 🎮 Frontend
- React + TypeScript + three.js (react-three-fiber): orthografische 2D-Draufsicht
  und frei drehbare 3D-Ansicht
- **Zwei Maßstäbe**: Planetarium (lesbar übertrieben) ↔ Echtmaßstab 1:1
- Erdmond mit echten geozentrischen Bahnelementen, Texturen (CC BY 4.0),
  Achsneigungen, datengetriebene Ringe, Auto-Hide der UI
- Zeitsteuerung mit Animation, Zoom & Pan, Fokus-Flüge
- iPad-/Touch-optimiert (Bedienelemente ≥ 44 × 44 px)
- Production-Caching (1 Tag JS/CSS, 7 Tage Assets)

### 🧪 Test-Suite
- **196 pytest-Tests** über Physik, Endpoints, Datenintegrität, Mond, N-Body
- Parametrize über alle Himmelskörper für Strukturvalidierung
- Frontend: Vitest für Skalierung, Sichtbarkeit, Kepler, Reducer

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

**Einmalig bei der Umstellung auf non-root (Härtungs-Paket v1.2.x):** das Volume
`orbital-data` stammt aus dem Root-Betrieb und gehört UID 0 — das Backend läuft
jetzt als User `orbit` und bekäme auf dem alten Volume keine Schreibrechte. Es
wird aktuell nicht beschrieben (Cache ist In-Memory), also einfach einmalig neu
anlegen lassen — Docker initialisiert ein frisches Volume mit der
Image-Ownership (`orbit:orbit`):

```bash
sudo docker compose down
sudo docker volume rm orbital-simulator_orbital-data
sudo docker compose build --no-cache
sudo docker compose up -d
```

---

## 🌐 Zugriff

| Dienst     | URL                          |
| ---------- | ---------------------------- |
| Frontend   | http://&lt;nas&gt;:5557      |
| API-Probe  | http://&lt;nas&gt;:5557/api/health (via nginx-Proxy) |

Das Backend ist **nicht** im LAN erreichbar — Port 5556 bindet an localhost
(SSH-Tunnel: `ssh -L 5556:localhost:5556 &lt;nas&gt;`); das Frontend proxied `/api/`
intern per Docker-Netz.

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

| Endpoint                              | Methode | Beschreibung                                  |
| ------------------------------------- | ------- | --------------------------------------------- |
| `/api/health`                         | GET     | Systemstatus                                  |
| `/api/bodies`                         | GET     | Alle Himmelskörper                            |
| `/api/bodies?include_planet9=true`    | GET     | inkl. Planet-9-Vorhersage                     |
| `/api/bodies?category=planets`        | GET     | nur Planeten (oder `dwarf_planets`, `tnos`)   |
| `/api/bodies/<id>`                    | GET     | Einzelner Körper (auch via deutschen Namen)   |
| `/api/position/<id>/<timestamp>`      | GET     | Position berechnen (ISO 8601 oder `now`)      |
| `/api/orbit/<id>?points=N`            | GET     | Bahnpfad mit N Punkten                        |
| `/api/simulate/nbody`                 | POST    | N-Body-Simulation (RK4/Verlet, baryzentrisch) |
| `/api/planet9/search`                 | GET     | Planet-9-Suchzone + TNO-Clustering            |

(API-Leichen-Paket 21.09.2026: die ungenutzten Endpunkte `/api/simulate`,
`/api/tno/discoveries`, `/api/categories`, `/api/time/convert` und
`/api/ephemeris` wurden entfernt — das Frontend nutzt sie nicht.)

### Beispiel: Position abfragen

```bash
curl "http://localhost:5556/api/position/earth/2026-04-06T12:00:00"
```

### Beispiel: N-Body-Simulation starten

```bash
curl -X POST "http://localhost:5556/api/simulate/nbody" \
  -H "Content-Type: application/json" \
  -d '{"bodies":["sun","earth","jupiter"],"start_time":"2026-01-01","duration_days":365,"step_days":1.0}'
```

---

## ⚠️ Bekannte Limitierungen

| # | Limitierung                                  | Auswirkung                                                                              | Plan                              |
| - | -------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------- |
| 1 | Statische Body-Daten                         | Neue TNO-Entdeckungen nur per Code-Edit                                                 | JPL-Horizons-Pipeline (Sprint C)  |
| 2 | Sortierung nur nach `a`                      | TNOs mit ähnlicher Halbachse aber stark unterschiedlicher Inklination clustern in UI    | UI-Filter offen                   |
| 3 | Echtmaßstab: float32-Vertex-Präzision        | Ferne Kleinkörper (Radius ~8e-6 AU) degenerieren beim Anflug ab ~500 AU Bahnradius      | Kamerarelative Koordinaten offen  |

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

### v1.2.0 (September 2026) — React-Rewrite, Mond, Echtmaßstab, API-Leichen
- **Sprint B:** Frontend komplett React + TS + react-three-fiber (2D-Ortho + 3D)
- **Mond:** echte geozentrische J2000-Elemente, klickbar, Planetarium ×75
- **Echtmaßstab-Modus 1:1:** Toggle Planetarium ↔ real (echte Radien in AU,
  echte Mondbahn, adaptive near/far-Kamera, Labels als Marker)
- **Auto-Hide:** Steuer-UI fadet nach 3 s ohne Eingabe weg
- **API-Leichen-Paket:** 5 ungenutzte Endpunkte entfernt (simulate-Kepler,
  tno/discoveries, categories, time/convert, ephemeris), tote
  physics-Funktionen + scipy entfernt, falsche TNO-IDs korrigiert
  (`2004_vn112`, `2005_rm43`), 196 Tests grün
- Backend: CORS-Whitelist, Port 5556 nur localhost, gunicorn 1w/8t,
  fail-fast bei e ≥ 1, zirkuläre TNO-Statistik

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
