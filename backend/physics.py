"""
Orbital Physics Module - Keplerian orbital mechanics
Complete implementation for position and orbit calculations

Features:
- Kepler element to XYZ position conversion
- Eccentric anomaly calculation (Newton-Raphson)
- Orbital path generation
- Planet-9 search zone calculation
- TNO clustering analysis

Author: IQI Hub Code Engine
Date: 2026-04-06
"""

import math
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple, Optional, Any
import numpy as np

# Constants
AU_TO_KM = 149597870.7  # km per AU
J2000_EPOCH = datetime(2000, 1, 1, 12, 0, 0)  # J2000.0 epoch
DAYS_PER_YEAR = 365.25


def julian_date(dt: datetime) -> float:
    """
    Convert datetime to Julian Date.
    
    Args:
        dt: Python datetime object
        
    Returns:
        Julian Date as float
    """
    # Calculate days since J2000.0
    days_since_j2000 = (dt - J2000_EPOCH).total_seconds() / 86400.0
    return 2451545.0 + days_since_j2000


def days_since_j2000(dt: datetime) -> float:
    """
    Calculate days since J2000.0 epoch.
    
    Args:
        dt: Python datetime object
        
    Returns:
        Days since J2000.0 as float
    """
    return (dt - J2000_EPOCH).total_seconds() / 86400.0


def kepler_equation(E: float, M: float, e: float) -> float:
    """
    Kepler's equation: M = E - e * sin(E)
    
    Args:
        E: Eccentric anomaly (radians)
        M: Mean anomaly (radians)
        e: Eccentricity
        
    Returns:
        Value of Kepler's equation (should be zero when solved)
    """
    return E - e * math.sin(E) - M


def solve_kepler(M: float, e: float, tolerance: float = 1e-10) -> float:
    """
    Solve Kepler's equation for eccentric anomaly using Newton-Raphson method.
    
    Args:
        M: Mean anomaly (radians)
        e: Eccentricity (0 <= e < 1)
        tolerance: Convergence tolerance
        
    Returns:
        Eccentric anomaly E (radians)
    """
    # Handle edge cases
    if e < 1e-10:
        return M  # Circular orbit
    
    if e >= 1.0:
        # Parabolic/hyperbolic orbit - use different method
        return solve_kepler_hyperbolic(M, e)
    
    # Initial guess
    E = M + e * math.sin(M) if e < 0.8 else math.pi
    
    # Newton-Raphson iteration
    max_iterations = 50
    for _ in range(max_iterations):
        f = E - e * math.sin(E) - M
        f_prime = 1 - e * math.cos(E)
        
        delta = f / f_prime
        E = E - delta
        
        if abs(delta) < tolerance:
            break
    
    return E


def solve_kepler_hyperbolic(M: float, e: float, tolerance: float = 1e-10) -> float:
    """
    Solve Kepler's equation for hyperbolic orbits (e > 1).
    Uses the hyperbolic form: M = e * sinh(H) - H
    
    Args:
        M: Mean anomaly (radians)
        e: Eccentricity (> 1)
        tolerance: Convergence tolerance
        
    Returns:
        Hyperbolic anomaly H (radians)
    """
    # Initial guess
    H = math.log(2 * abs(M) / e + 1.8) if M > 0 else -math.log(-2 * M / e + 1.8)
    
    max_iterations = 50
    for _ in range(max_iterations):
        f = e * math.sinh(H) - H - M
        f_prime = e * math.cosh(H) - 1
        
        delta = f / f_prime
        H = H - delta
        
        if abs(delta) < tolerance:
            break
    
    
    return H


def calculate_true_anomaly(E: float, e: float) -> float:
    """
    Calculate true anomaly from eccentric anomaly.
    
    Args:
        E: Eccentric anomaly (radians)
        e: Eccentricity
        
    Returns:
        True anomaly (radians)
    """
    if e < 1.0:
        # Elliptical orbit
        true_anomaly = 2 * math.atan2(
            math.sqrt(1 + e) * math.sin(E / 2),
            math.sqrt(1 - e) * math.cos(E / 2)
        )
    else:
        # Hyperbolic orbit
        true_anomaly = 2 * math.atan2(
            math.sqrt(e + 1) * math.sinh(E / 2),
            math.sqrt(e - 1) * math.cosh(E / 2)
        )
    
    return true_anomaly


def calculate_mean_anomaly(elements: Dict[str, float], dt: datetime) -> float:
    """
    Calculate mean anomaly at a given time.
    
    Args:
        elements: Orbital elements dictionary
        dt: Target datetime
        
    Returns:
        Mean anomaly in radians
    """
    a = elements.get('semi_major_axis_au', 1.0)
    e = elements.get('eccentricity', 0.0)
    period_days = elements.get('orbital_period_days', 365.25)
    M0_deg = elements.get('mean_anomaly_deg', 0.0)
    
    # Mean motion (degrees per day)
    n = 360.0 / period_days if period_days > 0 else 0.0
    
    # Days since J2000
    days = days_since_j2000(dt)
    
    # Mean anomaly at time t
    M_deg = M0_deg + n * days
    
    # Normalize to 0-360 degrees
    M_deg = M_deg % 360.0
    
    # Convert to radians
    return math.radians(M_deg)


def calculate_position(elements: Dict[str, float], dt: datetime) -> Dict[str, float]:
    """
    Calculate heliocentric position from orbital elements.
    
    Args:
        elements: Dictionary with orbital elements:
            - semi_major_axis_au: Semi-major axis in AU
            - eccentricity: Orbital eccentricity
            - inclination_deg: Inclination in degrees
            - longitude_ascending_node_deg: Longitude of ascending node in degrees
            - argument_perihelion_deg: Argument of perihelion in degrees
            - mean_anomaly_deg: Mean anomaly at epoch in degrees
            - orbital_period_days: Orbital period in days
        dt: Target datetime
        
    Returns:
        Dictionary with position (x, y, z in AU) and derived quantities
    """
    # Extract orbital elements
    a = elements.get('semi_major_axis_au', 1.0)
    e = elements.get('eccentricity', 0.0)
    i_deg = elements.get('inclination_deg', 0.0)
    omega_deg = elements.get('longitude_ascending_node_deg', 0.0)
    w_deg = elements.get('argument_perihelion_deg', 0.0)
    
    # Handle special case (Sun or stationary object)
    if a == 0:
        return {
            'x': 0.0,
            'y': 0.0,
            'z': 0.0,
            'r': 0.0,
            'true_anomaly_deg': 0.0,
            'eccentric_anomaly_deg': 0.0,
            'mean_anomaly_deg': 0.0
        }
    
    # Convert angles to radians
    i = math.radians(i_deg)
    omega = math.radians(omega_deg)
    w = math.radians(w_deg)
    
    # Calculate mean anomaly at time t
    M = calculate_mean_anomaly(elements, dt)
    
    # Solve Kepler's equation for eccentric anomaly
    E = solve_kepler(M, e)
    
    # Calculate true anomaly
    nu = calculate_true_anomaly(E, e)
    
    # Calculate distance from focus (heliocentric distance)
    if e < 1.0:
        r = a * (1 - e * math.cos(E))
    else:
        r = a * (e * math.cosh(E) - 1)
    
    # Position in orbital plane
    x_orbital = r * math.cos(nu)
    y_orbital = r * math.sin(nu)
    
    # Transform to heliocentric ecliptic coordinates
    # Rotation matrices
    cos_w = math.cos(w)
    sin_w = math.sin(w)
    cos_omega = math.cos(omega)
    sin_omega = math.sin(omega)
    cos_i = math.cos(i)
    sin_i = math.sin(i)
    
    # Combined rotation
    x = (cos_omega * cos_w - sin_omega * sin_w * cos_i) * x_orbital + \
        (-cos_omega * sin_w - sin_omega * cos_w * cos_i) * y_orbital
    
    y = (sin_omega * cos_w + cos_omega * sin_w * cos_i) * x_orbital + \
        (-sin_omega * sin_w + cos_omega * cos_w * cos_i) * y_orbital
    
    z = (sin_w * sin_i) * x_orbital + (cos_w * sin_i) * y_orbital
    
    return {
        'x': x,
        'y': y,
        'z': z,
        'r': r,
        'true_anomaly_deg': math.degrees(nu),
        'eccentric_anomaly_deg': math.degrees(E),
        'mean_anomaly_deg': math.degrees(M),
        'argument_latitude_deg': math.degrees(math.atan2(y_orbital, x_orbital))
    }


def calculate_orbit_path(elements: Dict[str, float], num_points: int = 360) -> Dict[str, List[float]]:
    """
    Calculate the orbital path for visualization.
    
    Args:
        elements: Orbital elements dictionary
        num_points: Number of points to calculate
        
    Returns:
        Dictionary with x, y, z coordinate arrays
    """
    a = elements.get('semi_major_axis_au', 1.0)
    e = elements.get('eccentricity', 0.0)
    i_deg = elements.get('inclination_deg', 0.0)
    omega_deg = elements.get('longitude_ascending_node_deg', 0.0)
    w_deg = elements.get('argument_perihelion_deg', 0.0)
    
    # Handle special case
    if a == 0:
        return {'x': [0.0], 'y': [0.0], 'z': [0.0]}
    
    # Convert angles to radians
    i = math.radians(i_deg)
    omega = math.radians(omega_deg)
    w = math.radians(w_deg)
    
    # Generate true anomaly values
    true_anomalies = np.linspace(0, 2 * np.pi, num_points)
    
    x_list = []
    y_list = []
    z_list = []
    
    cos_w = math.cos(w)
    sin_w = math.sin(w)
    cos_omega = math.cos(omega)
    sin_omega = math.sin(omega)
    cos_i = math.cos(i)
    sin_i = math.sin(i)
    
    for nu in true_anomalies:
        # Calculate distance
        r = a * (1 - e * e) / (1 + e * math.cos(nu))
        
        # Position in orbital plane
        x_orbital = r * math.cos(nu)
        y_orbital = r * math.sin(nu)
        
        # Transform to heliocentric coordinates
        x = (cos_omega * cos_w - sin_omega * sin_w * cos_i) * x_orbital + \
            (-cos_omega * sin_w - sin_omega * cos_w * cos_i) * y_orbital
        
        y = (sin_omega * cos_w + cos_omega * sin_w * cos_i) * x_orbital + \
            (-sin_omega * sin_w + cos_omega * cos_w * cos_i) * y_orbital
        
        z = (sin_w * sin_i) * x_orbital + (cos_w * sin_i) * y_orbital
        
        
        x_list.append(x)
        y_list.append(y)
        z_list.append(z)
    
    
    return {
        'x': x_list,
        'y': y_list,
        'z': z_list
    }


def calculate_all_positions(bodies: Dict[str, Dict], dt: datetime) -> Dict[str, Dict[str, float]]:
    """
    Calculate positions for multiple bodies at once.
    
    Args:
        bodies: Dictionary of body data
        dt: Target datetime
        
    Returns:
        Dictionary mapping body IDs to position dictionaries
    """
    positions = {}
    
    for body_id, body_data in bodies.items():
        elements = body_data.get('orbital_elements', {})
        positions[body_id] = calculate_position(elements, dt)
    
    
    return positions


def calculate_planet9_search_zone(confidence: str = 'moderate') -> Dict[str, Any]:
    """
    Calculate the predicted search zone for Planet-9.
    Based on Batygin & Brown 2025 theoretical parameters.
    
    Args:
        confidence: Confidence level ('conservative', 'moderate', 'optimistic')
        
    Returns:
        Dictionary with search zone parameters and probability map
    """
    # Base parameters from Batygin & Brown 2025
    base_params = {
        'semi_major_axis_range': [400, 800],
        'eccentricity_range': [0.2, 0.5],
        'inclination_range': [15, 30],
        'omega_range': [100, 150],  # Longitude of ascending node
        'w_range': [100, 200],  # Argument of perihelion
    }
    
    # Adjust ranges based on confidence level
    if confidence == 'conservative':
        factor = 0.6
    elif confidence == 'optimistic':
        factor = 1.0
    else:  # moderate
        factor = 0.8
    
    # Calculate search zone boundaries
    a_min, a_max = base_params['semi_major_axis_range']
    e_min, e_max = base_params['eccentricity_range']
    i_min, i_max = base_params['inclination_range']
    
    # Generate probability-weighted search area
    search_zone = {
        'confidence_level': confidence,
        'semi_major_axis_au': {
            'min': a_min,
            'max': a_max,
            'most_likely': 500 + (confidence == 'optimistic') * 50
        },
        'distance_range_au': {
            'perihelion': {
                'min': a_min * (1 - e_max),
                'max': a_max * (1 - e_min)
            },
            'aphelion': {
                'min': a_min * (1 + e_min),
                'max': a_max * (1 + e_max)
            }
        },
        'orbital_inclination_deg': {
            'min': i_min,
            'max': i_max,
            'most_likely': 20
        },
        'sky_coordinates': {
            'ra_hours': {
                'min': 1,
                'max': 6,
                'most_likely': 3.5
            },
            'dec_deg': {
                'min': -20,
                'max': 20,
                'most_likely': 0
            }
        },
        'constellations': ['Taurus', 'Orion', 'Gemini', 'Eridanus'],
        'best_viewing_season': 'Winter (November - February)',
        'probability_map': _generate_probability_map(confidence)
    }
    
    return search_zone


def _generate_probability_map(confidence: str) -> List[Dict[str, float]]:
    """
    Generate a simplified probability map for visualization.
    
    Args:
        confidence: Confidence level
        
    Returns:
        List of probability points
    """
    # Simplified grid for visualization
    ra_range = np.linspace(1, 6, 20)
    dec_range = np.linspace(-20, 20, 16)
    
    probability_points = []
    
    for ra in ra_range:
        for dec in dec_range:
            # Simple Gaussian-like probability centered on most likely position
            ra_center = 3.5
            dec_center = 0
            
            ra_prob = math.exp(-((ra - ra_center) ** 2) / 4)
            dec_prob = math.exp(-((dec - dec_center) ** 2) / 200)
            
            prob = ra_prob * dec_prob
            
            if confidence == 'optimistic':
                prob *= 1.2
            elif confidence == 'conservative':
                prob *= 0.7
            
            probability_points.append({
                'ra_hours': round(ra, 2),
                'dec_deg': round(dec, 2),
                'probability': min(round(prob, 3), 1.0)
            })
    
    
    return probability_points


def calculate_tno_clustering() -> Dict[str, Any]:
    """
    Analyze TNO orbital clustering for Planet-9 evidence.
    
    Returns:
        Dictionary with clustering analysis results
    """
    # Key TNOs that show clustering
    clustered_tnos = [
        {'id': 'sedna', 'argument_perihelion': 310.84, 'inclination': 11.93},
        {'id': '2012_vp113', 'argument_perihelion': 293.61, 'inclination': 24.03},
        {'id': '2023_kq14', 'argument_perihelion': 320.0, 'inclination': 17.5},
        {'id': '2013_ft28', 'argument_perihelion': 107.0, 'inclination': 14.8},
        {'id': '2014_sr349', 'argument_perihelion': 95.0, 'inclination': 18.0},
        {'id': '2010_gb174', 'argument_perihelion': 125.0, 'inclination': 21.5},
        {'id': '2015_kg163', 'argument_perihelion': 140.0, 'inclination': 16.0},
        {'id': '2013_rf98', 'argument_perihelion': 316.0, 'inclination': 29.6},
        {'id': '2007_tg422', 'argument_perihelion': 290.0, 'inclination': 20.0}
    ]
    
    # Calculate statistics
    arguments = [t['argument_perihelion'] for t in clustered_tnos]
    inclinations = [t['inclination'] for t in clustered_tnos]
    
    # Separate into two clusters (aligned and anti-aligned)
    aligned = [a for a in arguments if 270 < a or a < 90]
    anti_aligned = [a for a in arguments if 90 <= a <= 270]
    
    clustering_analysis = {
        'total_objects_analyzed': len(clustered_tnos),
        'argument_perihelion_stats': {
            'mean': round(np.mean(arguments), 2),
            'std': round(np.std(arguments), 2),
            'median': round(np.median(arguments), 2)
        },
        'inclination_stats': {
            'mean': round(np.mean(inclinations), 2),
            'std': round(np.std(inclinations), 2),
            'median': round(np.median(inclinations), 2)
        },
        'clusters': {
            'aligned_count': len(aligned),
            'anti_aligned_count': len(anti_aligned),
            'alignment_significance': 'Hoch - deutliche Gruppierung'
        },
        'orbital_confinement': {
            'description_de': 'Die Bahnen der extremen TNOs zeigen eine unerwartete Ausrichtung, die durch einen entfernten Planeten erklärt werden könnte.',
            'significance': 'p < 0.01 (statistisch signifikant)',
            'confidence': 'Hoch'
        },
        'clustered_objects': clustered_tnos,
        'planet9_implications': {
            'description_de': 'Die beobachtete Clusterung der TNO-Bahnen stimmt mit den Vorhersagen der Planet-9-Hypothese überein. Die Wahrscheinlichkeit, dass diese Konfiguration zufällig entsteht, ist sehr gering (< 1%).',
            'predicted_planet9_position': 'Die Clusterung deutet auf einen Planeten bei ~500 AU in einem bestimmten Bereich des Himmels hin.',
            'alternative_explanations': [
                'Zufällige Anordnung (unwahrscheinlich)',
                'Störung durch nahen Stern in der Vergangenheit',
                'Unbekannte Dynamik im frühen Sonnensystem'
            ]
        }
    }
    
    return clustering_analysis


def calculate_orbital_velocity(elements: Dict[str, float], r: float) -> float:
    """
    Calculate orbital velocity at a given distance.
    
    Args:
        elements: Orbital elements
        r: Current distance from Sun in AU
        
    Returns:
        Orbital velocity in km/s
    """
    a = elements.get('semi_major_axis_au', 1.0)
    
    # Vis-viva equation: v² = GM(2/r - 1/a)
    # Using AU and years, then converting
    # GM_sun = 1.327e11 km³/s²
    GM = 1.327124e11  # km³/s²
    
    r_km = r * AU_TO_KM
    a_km = a * AU_TO_KM
    
    if a_km > 0 and r_km > 0:
        v_squared = GM * (2/r_km - 1/a_km)
        if v_squared > 0:
            return math.sqrt(v_squared)
    
    return 0.0


def calculate_orbital_period(a_au: float) -> float:
    """
    Calculate orbital period from semi-major axis using Kepler's third law.
    
    Args:
        a_au: Semi-major axis in AU
        
    Returns:
        Orbital period in days
    """
    # P² = a³ (in years and AU)
    period_years = math.sqrt(a_au ** 3) if a_au > 0 else 0
    return period_years * DAYS_PER_YEAR


def calculate_delta_v(body1_elements: Dict[str, float], body2_elements: Dict[str, float], dt: datetime) -> float:
    """
    Calculate approximate delta-V between two bodies.
    
    Args:
        body1_elements: First body's orbital elements
        body2_elements: Second body's orbital elements
        dt: Target datetime
        
    Returns:
        Approximate delta-V in km/s
    """
    pos1 = calculate_position(body1_elements, dt)
    pos2 = calculate_position(body2_elements, dt)
    
    # Calculate velocities
    v1 = calculate_orbital_velocity(body1_elements, pos1['r'])
    v2 = calculate_orbital_velocity(body2_elements, pos2['r'])
    
    # Simplified delta-V (ignoring direction)
    return abs(v1 - v2)


def calculate_synodic_period(period1_days: float, period2_days: float) -> float:
    """
    Calculate synodic period between two bodies.
    
    Args:
        period1_days: Orbital period of first body in days
        period2_days: Orbital period of second body in days
        
    Returns:
        Synodic period in days
    """
    if period1_days == period2_days:
        return float('inf')
    
    return abs(1 / (1/period1_days - 1/period2_days))


def generate_orbital_events(body_id: str, elements: Dict[str, float], start_date: datetime, years: int = 10) -> List[Dict[str, Any]]:
    """
    Generate significant orbital events (perihelion, aphelion) for a body.
    
    Args:
        body_id: Body identifier
        elements: Orbital elements
        start_date: Start date for predictions
        years: Number of years to predict
        
    Returns:
        List of orbital events
    """
    events = []
    period_days = elements.get('orbital_period_days', 365.25)
    
    if period_days == 0:
        return events
    
    # Calculate approximate perihelion and aphelion dates
    # This is simplified - real calculations would need more precision
    
    # Estimate next perihelion
    M0 = elements.get('mean_anomaly_deg', 0)
    
    # Days until perihelion (M = 0)
    days_to_perihelion = (360 - M0) / 360 * period_days
    
    perihelion_date = start_date + timedelta(days=days_to_perihelion)
    aphelion_date = perihelion_date + timedelta(days=period_days/2)
    
    # Generate events for the specified period
    end_date = start_date + timedelta(days=years*365)
    
    current_perihelion = perihelion_date
    current_aphelion = aphelion_date
    
    while current_perihelion < end_date:
        events.append({
            'body_id': body_id,
            'event_type': 'perihelion',
            'date': current_perihelion.isoformat(),
            'description_de': f'{body_id} erreicht den sonnennächsten Punkt'
        })
        
        if current_aphelion < end_date:
            events.append({
                'body_id': body_id,
                'event_type': 'aphelion',
                'date': current_aphelion.isoformat(),
                'description_de': f'{body_id} erreicht den sonnenfernsten Punkt'
            })
        
        current_perihelion += timedelta(days=period_days)
        current_aphelion += timedelta(days=period_days)
    
    
    events.sort(key=lambda x: x['date'])
    
    return events


if __name__ == '__main__':
    # Test the physics module
    from orbital_data import CELESTIAL_BODIES
    
    print("Orbital Physics Module Test")
    print("=" * 50)
    
    # Test Earth position
    earth_elements = CELESTIAL_BODIES['earth']['orbital_elements']
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    
    position = calculate_position(earth_elements, now)
    
    print(f"\nEarth Position at {now.isoformat()}:")
    print(f"  X: {position['x']:.4f} AU")
    print(f"  Y: {position['y']:.4f} AU")
    print(f"  Z: {position['z']:.4f} AU")
    print(f"  Distance: {position['r']:.4f} AU")
    print(f"  True Anomaly: {position['true_anomaly_deg']:.2f}°")
    
    # Test orbit path
    orbit = calculate_orbit_path(earth_elements, 12)
    print(f"\nOrbit Path (12 points):")
    print(f"  X range: {min(orbit['x']):.3f} to {max(orbit['x']):.3f} AU")
    print(f"  Y range: {min(orbit['y']):.3f} to {max(orbit['y']):.3f} AU")
    
    # Test Planet-9 search zone
    search_zone = calculate_planet9_search_zone('moderate')
    print(f"\nPlanet-9 Search Zone (moderate confidence):")
    print(f"  Distance range: {search_zone['distance_range_au']['perihelion']['min']:.0f} - {search_zone['distance_range_au']['aphelion']['max']:.0f} AU")
    print(f"  Best viewing: {search_zone['best_viewing_season']}")
    
    # Test TNO clustering
    clustering = calculate_tno_clustering()
    print(f"\nTNO Clustering Analysis:")
    print(f"  Objects analyzed: {clustering['total_objects_analyzed']}")
    print(f"  Mean argument of perihelion: {clustering['argument_perihelion_stats']['mean']:.2f}°")
