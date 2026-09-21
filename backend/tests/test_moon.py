"""Mond (parent_id 'earth'): Datenintegrität + API-Verhalten.

Der Mond ist der erste Körper mit geozentrischen Bahnelementen. Diese
Tests sichern: Datensatz vollständig, API liefert parent_id, Orbit-Pfad
bleibt relativ zur Erde, Einzel-Positionen gehen heliozentrisch raus
(Erde + Relativorbit), N-Body lehnt den Mond klar ab.
"""
import math

from orbital_data import BODY_CATEGORIES, CELESTIAL_BODIES


def test_moon_dataset_complete():
    moon = CELESTIAL_BODIES['moon']
    assert moon['category'] == 'moon'
    assert moon['parent_id'] == 'earth'
    el = moon['orbital_elements']
    # Geozentrisch: Halbachse ≈ 384.400 km
    assert abs(el['semi_major_axis_au'] - 0.0025696) < 1e-6
    assert 0 < el['eccentricity'] < 1
    assert abs(el['orbital_period_days'] - 27.321661) < 1e-3
    phys = moon['physical_data']
    assert abs(phys['radius_km'] - 1737.4) < 0.1
    assert phys['rotation_period_hours'] == 655.728  # gebundene Rotation


def test_moon_category_registered():
    assert 'moon' in BODY_CATEGORIES


def test_bodies_endpoint_has_moon_with_parent(client):
    res = client.get('/api/bodies?include_orbits=true')
    assert res.status_code == 200
    payload = res.get_json()
    bodies = {b['id']: b for b in payload['bodies']}
    assert 'moon' in bodies
    moon = bodies['moon']
    assert moon['parent_id'] == 'earth'
    assert moon['category'] == 'moon'
    # Orbit-Pfad relativ zur Erde: Radien ~0.0026 AU, nicht heliozentrisch ~1 AU
    path = moon['orbit_path']
    radii = [
        math.sqrt(x ** 2 + y ** 2 + z ** 2)
        for x, y, z in zip(path['x'], path['y'], path['z'])
    ]
    assert max(radii) < 0.01
    # Sortierung: Mond direkt hinter der Erde (nicht bei 0.0026 AU vorn)
    ids = [b['id'] for b in payload['bodies']]
    assert ids.index('moon') == ids.index('earth') + 1


def test_moon_position_heliocentric(client):
    res = client.get('/api/position/moon/now')
    assert res.status_code == 200
    pos = res.get_json()['position']
    # Heliozentrisch aufgesetzt: ~1 AU von der Sonne, nicht 0.0026 AU
    assert 0.9 < pos['r'] < 1.1


def test_moon_detail_position_heliocentric(client):
    res = client.get('/api/bodies/moon')
    assert res.status_code == 200
    body = res.get_json()
    assert body['parent_id'] == 'earth'
    assert 0.9 < body['current_position']['r'] < 1.1


def test_moon_rejected_in_nbody(client):
    res = client.post('/api/simulate/nbody', json={
        'bodies': ['sun', 'earth', 'moon'],
        'start_time': '2026-01-01T00:00:00',
        'duration_days': 10,
        'step_days': 1.0,
    })
    assert res.status_code == 400
