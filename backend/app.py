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
from datetime import datetime, timedelta, timezone


def _now_utc() -> datetime:
    """Naive UTC now — replaces deprecated _now_utc() (Py 3.12+).
    Returns tz-naive to keep isoformat() output identical to the old behavior."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
from typing import Dict, List, Optional, Any, Tuple
from functools import wraps
import logging

from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from flask_caching import Cache
import numpy as np

# Import local modules
from orbital_data import (
    CELESTIAL_BODIES,
    TNO_BODIES,
    PLANET_9_PREDICTION,
    TNO_DISCOVERIES,
    BODY_CATEGORIES,
    BODY_COLORS
)
from physics import (
    calculate_position,
    calculate_orbit_path,
    calculate_all_positions,
    calculate_planet9_search_zone,
    calculate_tno_clustering,
    kepler_equation
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

# Configure CORS for frontend access
CORS(app, resources={
    r"/api/*": {
        "origins": ["*"],
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
        'version': '1.1.0',
        'bodies_count': len(CELESTIAL_BODIES) + len(TNO_BODIES),
        'cache_status': 'active'
    })


@app.route('/api/bodies', methods=['GET'])
@handle_errors
@cache.cached(timeout=300, key_prefix='all_bodies')
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
    
    # Sort by distance from sun (semi-major axis)
    bodies.sort(key=lambda x: x['orbital_elements']['semi_major_axis_au'])
    
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
    
    # Calculate current position
    current_time = _now_utc()
    position = calculate_position(body_data['orbital_elements'], current_time)
    
    # Calculate orbital path
    orbit_path = calculate_orbit_path(body_data['orbital_elements'])
    
    return jsonify({
        'id': body_id,
        'name': body_data['name'],
        'name_de': body_data['name_de'],
        'category': body_data.get('category', 'tno'),
        'color': body_data['color'],
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
            # Handle various ISO formats
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
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
    
    # Calculate position
    position = calculate_position(body_data['orbital_elements'], dt)
    
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
@cache.cached(timeout=600, key_prefix=lambda: f'orbit_{request.view_args["body_id"]}')
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


@app.route('/api/simulate', methods=['POST'])
@handle_errors
def run_simulation() -> Response:
    """
    Run an N-body simulation for specified bodies over a time period.
    
    Request Body (JSON):
        bodies: List of body IDs to simulate
        start_time: Start timestamp (ISO 8601)
        end_time: End timestamp (ISO 8601)
        steps: Number of simulation steps
        include_planet9: Include Planet-9 in simulation (boolean)
    
    Returns:
        JSON object with simulation results
    """
    data = request.get_json()
    
    if not data:
        return jsonify({
            'error': 'Keine Daten erhalten',
            'message': 'Bitte sende JSON-Daten im Request-Body.'
        }), 400
    
    # Validate parameters
    body_ids = data.get('bodies', [])
    if not body_ids:
        body_ids = list(CELESTIAL_BODIES.keys())  # Default to all planets
    
    # Parse time range
    try:
        start_time = datetime.fromisoformat(
            data.get('start_time', _now_utc().isoformat()).replace('Z', '+00:00')
        )
        end_time = datetime.fromisoformat(
            data.get('end_time', (_now_utc() + timedelta(days=365)).isoformat()).replace('Z', '+00:00')
        )
    except ValueError as e:
        return jsonify({
            'error': 'Ungültiges Zeitformat',
            'message': str(e)
        }), 400
    
    # Get simulation steps
    try:
        steps = int(data.get('steps', 100))
        steps = min(max(steps, 10), 1000)  # Limit between 10 and 1000
    except ValueError:
        steps = 100
    
    # Calculate time step
    time_delta = (end_time - start_time) / steps
    
    # Run simulation
    simulation_results = []
    current_time = start_time
    
    for step in range(steps):
        step_data = {
            'step': step,
            'timestamp': current_time.isoformat(),
            'positions': {}
        }
        
        # Calculate positions for all specified bodies
        for body_id in body_ids:
            if body_id in CELESTIAL_BODIES:
                body_data = CELESTIAL_BODIES[body_id]
            elif body_id in TNO_BODIES:
                body_data = TNO_BODIES[body_id]
            else:
                continue
            
            position = calculate_position(body_data['orbital_elements'], current_time)
            step_data['positions'][body_id] = position
        
        
        # Include Planet-9 if requested
        if data.get('include_planet9', False):
            p9_elements = PLANET_9_PREDICTION['orbital_elements']
            step_data['positions']['planet9'] = calculate_position(p9_elements, current_time)
        
        simulation_results.append(step_data)
        current_time += time_delta
    
    return jsonify({
        'simulation': {
            'bodies': body_ids,
            'start_time': start_time.isoformat(),
            'end_time': end_time.isoformat(),
            'steps': steps,
            'time_step_days': time_delta.total_seconds() / 86400,
            'results': simulation_results
        },
        'metadata': {
            'calculation_method': 'keplerian',
            'include_perturbations': False,
            'note': 'Vereinfachte Kepler-Berechnung ohne N-Body-Perturbationen'
        }
    })


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
    from nbody import simulate_nbody

    data = request.get_json()
    if not data:
        return jsonify({
            'error': 'Keine Daten erhalten',
            'message': 'Bitte sende JSON-Daten im Request-Body.'
        }), 400

    body_ids = data.get('bodies', ['sun', 'jupiter', 'saturn', 'earth'])
    if not body_ids:
        return jsonify({'error': 'Keine Koerper angegeben'}), 400

    try:
        start_time = datetime.fromisoformat(
            data.get('start_time', _now_utc().isoformat()).replace('Z', '+00:00')
        ).replace(tzinfo=None)
        end_time = datetime.fromisoformat(
            data.get('end_time', (_now_utc() + timedelta(days=365)).isoformat()).replace('Z', '+00:00')
        ).replace(tzinfo=None)
    except ValueError as e:
        return jsonify({'error': 'Ungueltiges Zeitformat', 'message': str(e)}), 400

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

    bodies_data = []
    for bid in body_ids:
        if bid in CELESTIAL_BODIES:
            bodies_data.append({'id': bid, **CELESTIAL_BODIES[bid]})
        elif bid in TNO_BODIES:
            bodies_data.append({'id': bid, **TNO_BODIES[bid]})
        else:
            return jsonify({
                'error': 'Objekt nicht gefunden',
                'message': f'Body "{bid}" existiert nicht'
            }), 404

    result = simulate_nbody(bodies_data, start_time, end_time, step_days, sample_every)

    return jsonify({
        'simulation': result,
        'method': 'RK4 N-body integration in barycentric frame',
        'units': {'length': 'AU', 'time': 'days', 'mass': 'M_sun'},
    })


@app.route('/api/planet9/search', methods=['GET'])
@handle_errors
@cache.cached(timeout=3600)
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


@app.route('/api/tno/discoveries', methods=['GET'])
@handle_errors
@cache.cached(timeout=3600)
def get_tno_discoveries() -> Response:
    """
    Get information about recent TNO discoveries.
    Includes discovery details and scientific significance.
    
    Query Parameters:
        limit: Maximum number of discoveries to return
        significance: Filter by significance level
    
    Returns:
        JSON object with TNO discovery data
    """
    limit = request.args.get('limit', 20)
    try:
        limit = int(limit)
        limit = min(max(limit, 5), 50)
    except ValueError:
        limit = 20
    
    # Get TNO data sorted by discovery date
    discoveries = []
    for body_id, body_data in TNO_BODIES.items():
        discovery_info = body_data.get('discovery', {})
        discoveries.append({
            'id': body_id,
            'name': body_data['name'],
            'name_de': body_data['name_de'],
            'discovery_date': discovery_info.get('date', 'Unknown'),
            'discovery_year': discovery_info.get('year', 0),
            'discoverers': discovery_info.get('discoverers', []),
            'telescope': discovery_info.get('telescope', 'Unknown'),
            'semi_major_axis_au': body_data['orbital_elements']['semi_major_axis_au'],
            'perihelion_au': body_data['orbital_elements']['perihelion_au'],
            'aphelion_au': body_data['orbital_elements']['aphelion_au'],
            'eccentricity': body_data['orbital_elements']['eccentricity'],
            'inclination_deg': body_data['orbital_elements']['inclination_deg'],
            'significance_de': body_data.get('significance_de', ''),
            'category': body_data.get('tno_type', 'General TNO'),
            'color': body_data['color']
        })
    
    # Sort by discovery year (newest first)
    discoveries.sort(key=lambda x: x['discovery_year'], reverse=True)
    
    # Apply limit
    discoveries = discoveries[:limit]
    
    return jsonify({
        'discoveries': discoveries,
        'count': len(discoveries),
        'total_tnos': len(TNO_BODIES),
        'discovery_timeline': TNO_DISCOVERIES['timeline'],
        'classification_guide_de': {
            'detached': 'Gelöste Objekte - Keine signifikante Wechselwirkung mit Neptun',
            'sednoid': 'Sedna-ähnliche Objekte - Extrem sonnenfern mit ungewöhnlichen Orbits',
            'scattered': 'Gestreute Scheibe - Durch Neptun in exzentrische Bahnen gestreut',
            'classical': 'Klassische KBO - Stabile Bahnen im Kuipergürtel',
            'resonant': 'Resonante KBO - In Bahnresonanz mit Neptun',
            'extreme_tno': 'Extreme TNOs - Semi-major axis > 150 AU, Perihel > 30 AU'
        },
        'research_significance_de': {
            'planet9_connection': 'Viele extreme TNOs zeigen orbitale Ausrichtungen, die auf die Existenz von Planet-9 hindeuten könnten.',
            'solar_system_formation': 'TNOs sind Überbleibsel aus der Entstehung des Sonnensystems und helfen uns, die frühe Geschichte zu verstehen.',
            'primordial': 'Objekte wie Sedna bewahren den ursprünglichen Zustand des frühen Sonnensystems.'
        }
    })


@app.route('/api/categories', methods=['GET'])
@handle_errors
@cache.cached(timeout=3600)
def get_categories() -> Response:
    """
    Get all available body categories with descriptions.
    
    Returns:
        JSON object with category information
    """
    return jsonify({
        'categories': BODY_CATEGORIES,
        'colors': BODY_COLORS,
        'legend_de': {
            'planets': 'Die 8 Planeten unseres Sonnensystems',
            'dwarf_planets': 'Zwergplaneten wie Pluto und Eris',
            'tnos': 'Transneptunische Objekte jenseits des Neptun',
            'extreme_tno': 'Extreme TNOs mit sehr großen Bahnen',
            'detached': 'Gelöste Objekte ohne Neptun-Wechselwirkung',
            'planet9': 'Hypothetischer neunter Planet'
        }
    })


@app.route('/api/time/convert', methods=['GET'])
@handle_errors
def convert_time() -> Response:
    """
    Convert between different time formats for orbital calculations.
    
    Query Parameters:
        jd: Julian Date
        mjd: Modified Julian Date
        iso: ISO 8601 timestamp
    
    Returns:
        JSON object with converted time formats
    """
    result = {'input': {}}
    
    if 'jd' in request.args:
        try:
            jd = float(request.args['jd'])
            # Julian Date to datetime
            mjd = jd - 2400000.5
            days_since_j2000 = jd - 2451545.0
            dt = datetime(2000, 1, 1, 12, 0, 0) + timedelta(days=days_since_j2000)
            
            result['input']['julian_date'] = jd
            result['modified_julian_date'] = mjd
            result['iso'] = dt.isoformat()
            result['days_since_j2000'] = days_since_j2000
        except ValueError:
            return jsonify({'error': 'Ungültiges Julian Date Format'}), 400
            
    elif 'iso' in request.args:
        try:
            dt = datetime.fromisoformat(request.args['iso'].replace('Z', '+00:00'))
            # Calculate Julian Date
            j2000 = datetime(2000, 1, 1, 12, 0, 0)
            days_since_j2000 = (dt - j2000).total_seconds() / 86400
            jd = 2451545.0 + days_since_j2000
            
            result['input']['iso'] = request.args['iso']
            result['julian_date'] = jd
            result['modified_julian_date'] = jd - 2400000.5
            result['days_since_j2000'] = days_since_j2000
        except ValueError:
            return jsonify({'error': 'Ungültiges ISO Zeitformat'}), 400
    else:
        # Default to now
        dt = _now_utc()
        j2000 = datetime(2000, 1, 1, 12, 0, 0)
        days_since_j2000 = (dt - j2000).total_seconds() / 86400
        jd = 2451545.0 + days_since_j2000
        
        result['input']['current_time'] = 'now'
        result['julian_date'] = jd
        result['modified_julian_date'] = jd - 2400000.5
        result['iso'] = dt.isoformat()
        result['days_since_j2000'] = days_since_j2000
    
    return jsonify(result)


@app.route('/api/ephemeris', methods=['GET'])
@handle_errors
def get_ephemeris() -> Response:
    """
    Generate an ephemeris table for selected bodies.
    
    Query Parameters:
        bodies: Comma-separated list of body IDs
        start_date: Start date (ISO 8601)
        end_date: End date (ISO 8601)
        interval_days: Interval between entries
    
    Returns:
        JSON object with ephemeris data
    """
    # Parse body list
    body_ids = request.args.get('bodies', 'mercury,venus,earth,mars,jupiter,saturn')
    body_ids = [b.strip().lower() for b in body_ids.split(',')]
    
    # Parse date range
    try:
        start_date = datetime.fromisoformat(
            request.args.get('start_date', _now_utc().strftime('%Y-%m-%d'))
        )
        end_date = datetime.fromisoformat(
            request.args.get('end_date', (_now_utc() + timedelta(days=30)).strftime('%Y-%m-%d'))
        )
    except ValueError:
        return jsonify({'error': 'Ungültiges Datumsformat'}), 400
    
    # Parse interval
    try:
        interval_days = int(request.args.get('interval_days', 7))
        interval_days = min(max(interval_days, 1), 365)
    except ValueError:
        interval_days = 7
    
    # Generate ephemeris
    ephemeris = []
    current_date = start_date
    
    while current_date <= end_date:
        entry = {
            'date': current_date.strftime('%Y-%m-%d'),
            'julian_date': 2451545.0 + (current_date - datetime(2000, 1, 1, 12, 0, 0)).total_seconds() / 86400,
            'positions': {}
        }
        
        for body_id in body_ids:
            if body_id in CELESTIAL_BODIES:
                body_data = CELESTIAL_BODIES[body_id]
            elif body_id in TNO_BODIES:
                body_data = TNO_BODIES[body_id]
            else:
                continue
            
            pos = calculate_position(body_data['orbital_elements'], current_date)
            entry['positions'][body_id] = {
                'x_au': round(pos['x'], 4),
                'y_au': round(pos['y'], 4),
                'z_au': round(pos['z'], 4),
                'r_au': round(pos['r'], 4),
                'true_anomaly_deg': round(pos['true_anomaly_deg'], 2)
            }
        
        
        ephemeris.append(entry)
        current_date += timedelta(days=interval_days)
    
    return jsonify({
        'ephemeris': ephemeris,
        'bodies': body_ids,
        'start_date': start_date.strftime('%Y-%m-%d'),
        'end_date': end_date.strftime('%Y-%m-%d'),
        'interval_days': interval_days,
        'entries': len(ephemeris)
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
            '/api/simulate',
            '/api/simulate/nbody',
            '/api/planet9/search',
            '/api/tno/discoveries',
            '/api/categories',
            '/api/time/convert',
            '/api/ephemeris'
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
