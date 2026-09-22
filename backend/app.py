"""
Orbital Simulation System - Flask Backend API
Complete implementation for Synology DS918+

Features:
- All planets and dwarf planets
- 15+ TNOs with real orbital data
- Planet-9 prediction parameters
- N-body simulation capability
- Position calculations using Kepler elements

Author: IQI Hub Code Engine
Date: 2026-04-06
"""

import json
import math
import os
from datetime import datetime, timedelta, timezone


def _now_utc() -> datetime:
    """Naive UTC now — replaces deprecated _now_utc() (Py 3.12+).
    Returns tz-naive to keep isoformat() output identical to the old behavior."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def parse_iso_utc(value: str) -> datetime:
    """Parse ISO-8601 inkl. 'Z'/Offsets und liefere tz-naive UTC.

    Die Physik rechnet tz-naiv in UTC (J2000_EPOCH ist naive) — ein aware
    Zeitstempel crasht dort mit TypeError (naive - aware) -> HTTP 500.
    Ausserdem: Offsets werden korrekt nach UTC umgerechnet statt nur
    abgeschnitten ('+02:00' -> -2h). ValueError propagiert -> Aufrufer
    antwortet 400.
    """
    # Explizites null im JSON (z.B. "start_time": null) landete sonst als
    # AttributeError im 500er — klar als ValueError melden -> HTTP 400.
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f'Ungültiger Zeitstempel: {value!r} (erwartet: ISO-8601-String)')
    dt = datetime.fromisoformat(value.strip().replace('Z', '+00:00'))
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt
from typing import Dict, List, Optional, Any, Tuple
from functools import wraps
import logging

from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from flask_caching import Cache
from werkzeug.exceptions import HTTPException
import numpy as np

# Import local modules
from orbital_data import (
    CELESTIAL_BODIES,
    TNO_BODIES,
    PLANET_9_PREDICTION,
    BODY_CATEGORIES
)
from physics import (
    calculate_position,
    calculate_orbit_path,
    calculate_planet9_search_zone,
    calculate_tno_clustering
)
# nbody-Import bewusst am Modulkopf: das Modul-Ende von nbody.py feuert
# _warmup_numba() — so kompiliert der JIT-Kernel beim gunicorn-Worker-Start
# (start_period des Healthchecks) statt beim ersten User-POST (3-5 s Cold-Start
# mitten im Request, Deep-Recon-Befund).
from nbody import simulate_nbody, MAX_NBODY_STEPS, MAX_NBODY_SAMPLES

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# CORS nur für explizit freigegebene Origins (Deep-Recon #1).
# Prod läuft same-origin über den nginx-Proxy (Port 5557) und braucht kein
# CORS; der Default deckt nur den lokalen Vite-Dev-Server ab. Weitere Origins
# per Env CORS_ORIGINS (Komma-getrennt) — niemals wieder "*".
_cors_origins = [o.strip() for o in os.environ.get(
    'CORS_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173'
).split(',') if o.strip()]
CORS(app, resources={
    r"/api/*": {
        "origins": _cors_origins,
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Configure caching (optimized for Synology)
cache = Cache(app, config={
    'CACHE_TYPE': 'SimpleCache',
    'CACHE_DEFAULT_TIMEOUT': 300,
    'CACHE_THRESHOLD': 100
})

# Constants
AU_TO_KM = 149597870.7  # 1 AU in km
G = 6.67430e-11  # Gravitational constant
SOLAR_MASS = 1.989e30  # kg



def handle_errors(f):
    """Decorator for consistent error handling across all endpoints."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValueError as e:
            logger.warning(f"Validation error in {f.__name__}: {str(e)}")
            return jsonify({
                'error': 'Validierungsfehler',
                'message': str(e),
                'endpoint': f.__name__
            }), 400
        except KeyError as e:
            logger.warning(f"Key error in {f.__name__}: {str(e)}")
            return jsonify({
                'error': 'Objekt nicht gefunden',
                'message': f'Das angeforderte Objekt "{str(e)}" existiert nicht.',
                'endpoint': f.__name__
            }), 404
        except HTTPException as e:
            # Werkzeug-HTTPExceptions (z.B. 415 von get_json bei falschem
            # Content-Type) nicht als 500 verkleiden — Status durchreichen.
            logger.warning(f"HTTP {e.code} in {f.__name__}: {e.description}")
            return jsonify({
                'error': e.name,
                'message': e.description,
                'endpoint': f.__name__
            }), e.code
        except Exception as e:
            logger.error(f"Unexpected error in {f.__name__}: {str(e)}", exc_info=True)
            return jsonify({
                'error': 'Interner Serverfehler',
                'message': 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es später erneut.',
                'endpoint': f.__name__
            }), 500
    return decorated_function


@app.route('/api/health', methods=['GET'])
def health_check() -> Response:
    """
    Health check endpoint for Docker and monitoring.
    Returns system status and basic metrics.
    """
    return jsonify({
        'status': 'healthy',
        'timestamp': _now_utc().isoformat(),
        'service': 'orbital-backend',
        'version': '1.2.0',
        'bodies_count': len(CELESTIAL_BODIES) + len(TNO_BODIES),
        'cache_status': 'active'
    })


def _position_for(body_data: Dict[str, Any], dt: datetime) -> Dict[str, float]:
    """Heliozentrische Position eines Körpers.

    Körper mit parent_id (Mond) haben geozentrische Bahnelemente — ihr
    Relativorbit wird auf die heliozentrische Parent-Position aufgesetzt,
    damit ALLE API-Positionen im selben (heliozentrischen) Bezugssystem
    rausgehen.
    """
    pos = calculate_position(body_data['orbital_elements'], dt)
    parent_id = body_data.get('parent_id')
    if parent_id and parent_id in CELESTIAL_BODIES:
        parent_pos = calculate_position(CELESTIAL_BODIES[parent_id]['orbital_elements'], dt)
        pos['x'] += parent_pos['x']
        pos['y'] += parent_pos['y']
        pos['z'] += parent_pos['z']
        pos['r'] = math.sqrt(pos['x'] ** 2 + pos['y'] ** 2 + pos['z'] ** 2)
    return pos


@app.route('/api/bodies', methods=['GET'])
@handle_errors
@cache.cached(timeout=300, key_prefix=lambda: (
    f'bodies_{request.args.get("category", "all")}'
    f'_orbits={request.args.get("include_orbits", "false").lower()}'
    f'_p9={request.args.get("include_planet9", "false").lower()}'
))
def get_all_bodies() -> Response:
    """
    Get all celestial bodies with their orbital parameters.
    
    Query Parameters:
        category: Filter by category (planets, dwarf_planets, tnos, all)
        include_orbits: Include orbital paths (true/false)
    
    Returns:
        JSON array of celestial bodies with orbital data
    """
    category = request.args.get('category', 'all')
    include_orbits = request.args.get('include_orbits', 'false').lower() == 'true'
    
    bodies = []
    
    # Add planets and dwarf planets
    if category in ['all', 'planets', 'dwarf_planets']:
        for body_id, body_data in CELESTIAL_BODIES.items():
            if category != 'all':
                if category == 'planets' and body_data['category'] != 'planet':
                    continue
                if category == 'dwarf_planets' and body_data['category'] != 'dwarf_planet':
                    continue
            
            body_entry = {
                'id': body_id,
                'name': body_data['name'],
                'name_de': body_data['name_de'],
                'category': body_data['category'],
                'color': body_data['color'],
                'orbital_elements': body_data['orbital_elements'],
                'physical_data': body_data['physical_data'],
                'description_de': body_data['description_de'],
                'fun_fact_de': body_data.get('fun_fact_de', '')
            }

            # Körper mit Parent (Mond): geozentrische Elemente kennzeichnen —
            # orbit_path bleibt bewusst RELATIV zum Parent (Frontend hängt
            # die Linie an die Parent-Position).
            if body_data.get('parent_id'):
                body_entry['parent_id'] = body_data['parent_id']

            if include_orbits:
                body_entry['orbit_path'] = calculate_orbit_path(body_data['orbital_elements'])


            bodies.append(body_entry)
    
    
    # Add TNOs
    if category in ['all', 'tnos']:
        for body_id, body_data in TNO_BODIES.items():
            body_entry = {
                'id': body_id,
                'name': body_data['name'],
                'name_de': body_data['name_de'],
                'category': 'tno',
                # Sprint B: Untertyp mitliefern, damit der Extreme-Filter im
                # Frontend greifen kann (war im alten Frontend still leer).
                'tno_type': body_data.get('tno_type'),
                'color': body_data['color'],
                'orbital_elements': body_data['orbital_elements'],
                'physical_data': body_data['physical_data'],
                'discovery': body_data.get('discovery', {}),
                'description_de': body_data['description_de'],
                'significance_de': body_data.get('significance_de', '')
            }
            
            if include_orbits:
                body_entry['orbit_path'] = calculate_orbit_path(body_data['orbital_elements'])
            
            
            bodies.append(body_entry)
    
    
    # Add Planet-9 prediction (optional, hypothetical)
    if request.args.get('include_planet9', 'false').lower() == 'true':
        p9_entry = {
            'id': 'planet9',
            'name': PLANET_9_PREDICTION['name'],
            'name_de': PLANET_9_PREDICTION['name_de'],
            'category': 'planet9',
            'color': PLANET_9_PREDICTION['color'],
            'orbital_elements': PLANET_9_PREDICTION['orbital_elements'],
            'physical_data': PLANET_9_PREDICTION['physical_data'],
            'description_de': PLANET_9_PREDICTION['description_de'],
            'hypothetical': True,
            'confidence_level': PLANET_9_PREDICTION.get('confidence_level', '')
        }
        if include_orbits:
            p9_entry['orbit_path'] = calculate_orbit_path(PLANET_9_PREDICTION['orbital_elements'])
        bodies.append(p9_entry)
    
    # Sort by distance from sun (semi-major axis); Monde stehen direkt
    # hinter ihrem Planeten statt bei ihrer winzigen geozentrischen Achse.
    def _sort_key(entry: Dict[str, Any]) -> float:
        parent = entry.get('parent_id')
        if parent and parent in CELESTIAL_BODIES:
            return CELESTIAL_BODIES[parent]['orbital_elements']['semi_major_axis_au'] + 0.0001
        return entry['orbital_elements']['semi_major_axis_au']
    bodies.sort(key=_sort_key)
    
    return jsonify({
        'bodies': bodies,
        'count': len(bodies),
        'categories': BODY_CATEGORIES,
        'timestamp': _now_utc().isoformat()
    })


@app.route('/api/bodies/<body_id>', methods=['GET'])
@handle_errors
@cache.cached(timeout=300, key_prefix=lambda: f'body_{request.view_args["body_id"]}')
def get_body(body_id: str) -> Response:
    """
    Get detailed information about a specific celestial body.
    
    Args:
        body_id: Unique identifier of the celestial body
    
    Returns:
        JSON object with complete body data
    """
    body_id = body_id.lower().strip()
    
    # Search in planets first
    if body_id in CELESTIAL_BODIES:
        body_data = CELESTIAL_BODIES[body_id]
    elif body_id in TNO_BODIES:
        body_data = TNO_BODIES[body_id]
    else:
        # Try to find by name
        for bid, bdata in {**CELESTIAL_BODIES, **TNO_BODIES}.items():
            if body_id in [bid, bdata['name'].lower(), bdata['name_de'].lower()]:
                body_data = bdata
                body_id = bid
                break
        else:
            return jsonify({
                'error': 'Objekt nicht gefunden',
                'message': f'Kein Himmelskörper mit ID "{body_id}" gefunden.',
                'available_ids': list(CELESTIAL_BODIES.keys())[:10] + list(TNO_BODIES.keys())[:5]
            }), 404
    
    # Calculate current position (heliozentrisch; Mond: Erde + geozentrisch)
    current_time = _now_utc()
    position = _position_for(body_data, current_time)
    
    # Calculate orbital path
    orbit_path = calculate_orbit_path(body_data['orbital_elements'])
    
    return jsonify({
        'id': body_id,
        'name': body_data['name'],
        'name_de': body_data['name_de'],
        'category': body_data.get('category', 'tno'),
        'color': body_data['color'],
        'parent_id': body_data.get('parent_id'),
        'orbital_elements': body_data['orbital_elements'],
        'physical_data': body_data['physical_data'],
        'current_position': position,
        'orbit_path': orbit_path,
        'description_de': body_data['description_de'],
        'fun_fact_de': body_data.get('fun_fact_de', ''),
        'significance_de': body_data.get('significance_de', ''),
        'discovery': body_data.get('discovery', {}),
        'timestamp': current_time.isoformat()
    })


@app.route('/api/position/<body_id>/<timestamp>', methods=['GET'])
@handle_errors
def get_position(body_id: str, timestamp: str) -> Response:
    """
    Calculate the position of a celestial body at a specific time.
    
    Args:
        body_id: Unique identifier of the celestial body
        timestamp: ISO 8601 timestamp or 'now' for current time
    
    Query Parameters:
        format: Output format ('xyz' or 'spherical')
    
    Returns:
        JSON object with position coordinates
    """
    body_id = body_id.lower().strip()
    
    # Parse timestamp
    if timestamp.lower() == 'now':
        dt = _now_utc()
    else:
        try:
            dt = parse_iso_utc(timestamp)
        except ValueError:
            return jsonify({
                'error': 'Ungültiges Zeitformat',
                'message': 'Bitte verwende ISO 8601 Format (z.B. 2026-04-06T12:00:00) oder "now".'
            }), 400
    
    # Find body
    if body_id in CELESTIAL_BODIES:
        body_data = CELESTIAL_BODIES[body_id]
    elif body_id in TNO_BODIES:
        body_data = TNO_BODIES[body_id]
    else:
        return jsonify({
            'error': 'Objekt nicht gefunden',
            'message': f'Kein Himmelskörper mit ID "{body_id}" gefunden.'
        }), 404
    
    # Calculate position (heliozentrisch; Mond: Erde + geozentrisch)
    position = _position_for(body_data, dt)
    
    # Format output
    output_format = request.args.get('format', 'xyz')
    
    if output_format == 'spherical':
        r = math.sqrt(position['x']**2 + position['y']**2 + position['z']**2)
        theta = math.degrees(math.acos(position['z'] / r)) if r > 0 else 0
        phi = math.degrees(math.atan2(position['y'], position['x']))
        
        position['spherical'] = {
            'r_au': r,
            'theta_deg': theta,
            'phi_deg': phi
        }
    
    
    return jsonify({
        'body_id': body_id,
        'body_name': body_data['name_de'],
        'timestamp': dt.isoformat(),
        'position': position,
        'orbital_elements': body_data['orbital_elements']
    })


@app.route('/api/orbit/<body_id>', methods=['GET'])
@handle_errors
@cache.cached(timeout=600, key_prefix=lambda: (
    f'orbit_{request.view_args["body_id"]}'
    f'_pts={request.args.get("points", "360")}'
    f'_elem={request.args.get("include_elements", "false").lower()}'
))
def get_orbit(body_id: str) -> Response:
    """
    Get the orbital path for a celestial body.
    
    Args:
        body_id: Unique identifier of the celestial body
    
    Query Parameters:
        points: Number of points to calculate (default: 360)
        include_elements: Include orbital elements in response
    
    Returns:
        JSON object with orbital path coordinates
    """
    body_id = body_id.lower().strip()
    
    # Find body
    if body_id in CELESTIAL_BODIES:
        body_data = CELESTIAL_BODIES[body_id]
    elif body_id in TNO_BODIES:
        body_data = TNO_BODIES[body_id]
    else:
        return jsonify({
            'error': 'Objekt nicht gefunden',
            'message': f'Kein Himmelskörper mit ID "{body_id}" gefunden.'
        }), 404
    
    # Get number of points
    try:
        num_points = int(request.args.get('points', 360))
        num_points = min(max(num_points, 36), 720)  # Limit between 36 and 720
    except ValueError:
        num_points = 360
    
    # Calculate orbit path
    orbit_path = calculate_orbit_path(body_data['orbital_elements'], num_points)
    
    response = {
        'body_id': body_id,
        'body_name': body_data['name_de'],
        'orbit_path': orbit_path,
        'points_count': len(orbit_path['x'])
    }
    
    if request.args.get('include_elements', 'false').lower() == 'true':
        response['orbital_elements'] = body_data['orbital_elements']
    
    return jsonify(response)



@app.route('/api/simulate/nbody', methods=['POST'])
@handle_errors
def run_nbody_simulation() -> Response:
    """Echte N-Body-Simulation via RK4 im baryzentrischen Koordinatensystem.

    Request-JSON:
        bodies: List[str]  (default: ['sun','jupiter','saturn','earth'])
        start_time: ISO 8601
        end_time: ISO 8601
        step_days: float (0.01-365, default 1.0)
        sample_every: int (1-1000, default 1)
    """
    # silent=True wie in run_simulation (Deep-Recon #3).
    data = request.get_json(silent=True)
    if not data:
        return jsonify({
            'error': 'Keine Daten erhalten',
            'message': 'Bitte sende JSON-Daten im Request-Body.'
        }), 400

    body_ids = data.get('bodies', ['sun', 'jupiter', 'saturn', 'earth'])
    if not body_ids:
        return jsonify({'error': 'Keine Koerper angegeben'}), 400

    try:
        start_time = parse_iso_utc(data.get('start_time', _now_utc().isoformat()))
    except ValueError as e:
        return jsonify({'error': 'Ungueltiges start_time-Format', 'message': str(e)}), 400

    # Sprint A.3: duration_days hat Vorrang. Long-term Sims (>7000 Jahre)
    # wuerden mit end_time Python datetime-Limit (year < 10000) ueberschreiten.
    duration_days = None
    end_time = None
    if 'duration_days' in data and data['duration_days'] is not None:
        try:
            duration_days = float(data['duration_days'])
        except (ValueError, TypeError):
            return jsonify({'error': 'Ungueltiges duration_days-Format'}), 400
        if duration_days <= 0:
            return jsonify({'error': 'duration_days muss > 0 sein'}), 400
        if duration_days > 365.25 * 1_000_000:
            return jsonify({'error': 'duration_days zu gross (max 1M Jahre)'}), 400
    else:
        try:
            end_time = parse_iso_utc(data.get('end_time', (_now_utc() + timedelta(days=365)).isoformat()))
        except ValueError as e:
            return jsonify({'error': 'Ungueltiges end_time-Format', 'message': str(e)}), 400

    try:
        step_days = float(data.get('step_days', 1.0))
        step_days = min(max(step_days, 0.01), 365.0)
    except (ValueError, TypeError):
        step_days = 1.0

    try:
        sample_every = int(data.get('sample_every', 1))
        sample_every = min(max(sample_every, 1), 1000)
    except (ValueError, TypeError):
        sample_every = 1

    # OOM-Schutz: Schritt- und Snapshot-Zahl pruefen BEVOR simulate_nbody
    # Arrays allokiert. Ohne Cap reicht ein POST (1 Mio Jahre @ 0.01 d)
    # fuer Arrays im GB-Bereich -> OOM im 2G-Container.
    actual_days = duration_days if duration_days is not None else \
                  (end_time - start_time).total_seconds() / 86400.0
    n_steps_est = max(1, int(round(actual_days / step_days)))
    if n_steps_est > MAX_NBODY_STEPS:
        return jsonify({
            'error': 'Simulationsumfang zu gross',
            'message': f'{n_steps_est:,} Schritte uebersteigen das Limit von '
                       f'{MAX_NBODY_STEPS:,}. Erhoehe step_days oder reduziere die Dauer.',
            'n_steps_required': n_steps_est,
            'max_steps': MAX_NBODY_STEPS
        }), 400
    n_samples_est = n_steps_est // sample_every + 2
    if n_samples_est > MAX_NBODY_SAMPLES:
        return jsonify({
            'error': 'Zu viele Snapshots',
            'message': f'{n_samples_est:,} Snapshots uebersteigen das Limit von '
                       f'{MAX_NBODY_SAMPLES:,}. Erhoehe sample_every.',
            'n_samples_required': n_samples_est,
            'max_samples': MAX_NBODY_SAMPLES
        }), 400

    bodies_data = []
    for bid in body_ids:
        if bid in CELESTIAL_BODIES:
            if CELESTIAL_BODIES[bid].get('parent_id'):
                return jsonify({
                    'error': 'Mond im N-Body nicht unterstützt',
                    'message': f'"{bid}" umkreist einen Planeten (geozentrisch) und kann '
                               'nicht heliozentrisch im N-Body-Verfahren gerechnet werden.'
                }), 400
            bodies_data.append({'id': bid, **CELESTIAL_BODIES[bid]})
        elif bid in TNO_BODIES:
            bodies_data.append({'id': bid, **TNO_BODIES[bid]})
        else:
            return jsonify({
                'error': 'Objekt nicht gefunden',
                'message': f'Body "{bid}" existiert nicht'
            }), 404

    # Sprint A.3: optional Planet-9 in den N-Body-Pool aufnehmen
    if data.get('include_planet9'):
        bodies_data.append({'id': 'planet9', **PLANET_9_PREDICTION})

    # Sprint A.3.2: integrator-auto-switch fuer Langzeit-Sims.
    # RK4 ist nicht-symplektisch und driftet linear bei >paar 1000 Jahren.
    # Velocity-Verlet ist symplektisch (Energie oszilliert beschraenkt) und
    # nur halb so teuer pro Schritt.
    integrator = data.get('integrator', 'auto')
    if integrator == 'auto':
        integrator = 'verlet' if actual_days > 365.25 * 5000 else 'rk4'
    if integrator not in ('rk4', 'verlet'):
        return jsonify({'error': f'Ungueltiger integrator: {integrator!r}'}), 400

    result = simulate_nbody(bodies_data, start_time, end_time=end_time, duration_days=duration_days, step_days=step_days, sample_every=sample_every, integrator=integrator)

    return jsonify({
        'simulation': result,
        'method': 'RK4 N-body integration in barycentric frame',
        'units': {'length': 'AU', 'time': 'days', 'mass': 'M_sun'},
    })


@app.route('/api/planet9/search', methods=['GET'])
@handle_errors
@cache.cached(timeout=3600, key_prefix=lambda: (
    f'p9search_{request.args.get("confidence", "moderate")}'
))
def get_planet9_search_zone() -> Response:
    """
    Get the predicted search zone for Planet-9.
    Based on Batygin & Brown 2025 theoretical parameters.
    
    Query Parameters:
        confidence: Confidence level ('conservative', 'moderate', 'optimistic')
    
    Returns:
        JSON object with search zone parameters and probability map
    """
    confidence = request.args.get('confidence', 'moderate')
    
    # Calculate search zone based on TNO clustering
    search_zone = calculate_planet9_search_zone(confidence)
    
    # Get TNO clustering data
    tno_clustering = calculate_tno_clustering()
    
    return jsonify({
        'planet9_prediction': PLANET_9_PREDICTION,
        'search_zone': search_zone,
        'tno_clustering': tno_clustering,
        'theory_summary_de': {
            'title': 'Die Planet-9-Hypothese',
            'description': 'Im Jahr 2016 schlugen Konstantin Batygin und Michael Brown der Caltech vor, dass ein großer, bisher unentdeckter Planet am Rand unseres Sonnensystems existieren könnte. Seine Anwesenheit würde die seltsamen Umlaufbahnen vieler transneptischer Objekte (TNOs) erklären.',
            'evidence': [
                'Orbitale Ausrichtung von Sedna und anderen TNOs',
                'Sonnenferne Objekte mit senkrechten Umlaufbahnen',
                'Hohe Inklinationen einiger TNOs',
                'Antikorrelierte Argumente der Perihelia'
            ],
            'predicted_mass': '5-10 Erdmassen',
            'predicted_distance': '400-800 AU von der Sonne',
            'predicted_orbit': 'Elliptisch mit 0.2-0.5 Exzentrizität',
            'search_status': 'Aktive Suche mit Teleskopen wie Subaru und Vera C. Rubin Observatory'
        },
        'latest_research_2025': {
            'brouwer_2025': 'Neue Analyse bestätigt orbitale Konfinement-Signatur',
            'batygin_2025': 'Verfeinerte Parameter durch Monte-Carlo-Simulationen',
            'rubin_observatory': 'Vollständige Himmelsdurchmusterung erwartet 2025-2026',
            'confidence': 'Die Wahrscheinlichkeit für die Existenz von Planet-9 wird auf über 90% geschätzt'
        }
    })


@app.errorhandler(404)
def not_found(error) -> Response:
    """Handle 404 errors with user-friendly message."""
    return jsonify({
        'error': 'Endpunkt nicht gefunden',
        'message': 'Der angeforderte API-Endpunkt existiert nicht.',
        'available_endpoints': [
            '/api/health',
            '/api/bodies',
            '/api/bodies/<id>',
            '/api/position/<id>/<timestamp>',
            '/api/orbit/<id>',
            '/api/simulate/nbody',
            '/api/planet9/search'
        ]
    }), 404

@app.errorhandler(500)
def internal_error(error) -> Response:
    """Handle 500 errors with user-friendly message."""
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({
        'error': 'Interner Serverfehler',
        'message': 'Etwas ist schiefgelaufen. Bitte versuche es später erneut.'
    }), 500


if __name__ == '__main__':
    # Development server
    app.run(host='0.0.0.0', port=5000, debug=True)
