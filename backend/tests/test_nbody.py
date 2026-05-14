"""Tests for the N-Body integrator (Sprint A.1)."""
import math
from datetime import datetime

import numpy as np
import pytest

from nbody import (
    kepler_state_vector,
    accelerations,
    rk4_step,
    total_energy,
    total_angular_momentum,
    simulate_nbody,
    GM_SUN_AU3_PER_DAY2,
)
from physics import calculate_position
from orbital_data import CELESTIAL_BODIES


class TestStateVector:
    def test_sun_zero(self):
        pos, vel = kepler_state_vector(CELESTIAL_BODIES['sun']['orbital_elements'], datetime(2026, 1, 1))
        assert np.allclose(pos, 0.0)
        assert np.allclose(vel, 0.0)

    def test_earth_position_matches_kepler(self):
        elements = CELESTIAL_BODIES['earth']['orbital_elements']
        dt = datetime(2026, 6, 1)
        pos_nb, _ = kepler_state_vector(elements, dt)
        kep = calculate_position(elements, dt)
        assert pos_nb[0] == pytest.approx(kep['x'], abs=1e-9)
        assert pos_nb[1] == pytest.approx(kep['y'], abs=1e-9)
        assert pos_nb[2] == pytest.approx(kep['z'], abs=1e-9)

    def test_earth_velocity_magnitude_circa_29_78_km_s(self):
        # 29.78 km/s = 29.78 / 1.496e8 * 86400 = 0.01721 AU/Tag
        _, vel = kepler_state_vector(CELESTIAL_BODIES['earth']['orbital_elements'], datetime(2026, 1, 1))
        v = float(np.linalg.norm(vel))
        assert v == pytest.approx(0.01721, rel=0.05)


class TestAccelerations:
    def test_isolated_body_has_zero_acc(self):
        pos = np.array([[1.0, 0.0, 0.0]])
        gms = np.array([GM_SUN_AU3_PER_DAY2])
        acc = accelerations(pos, gms)
        assert np.allclose(acc, 0.0)

    def test_two_body_attraction(self):
        # Sonne bei origin, Testteilchen bei (1,0,0)
        pos = np.array([[0.0, 0.0, 0.0], [1.0, 0.0, 0.0]])
        gms = np.array([GM_SUN_AU3_PER_DAY2, 0.0])
        acc = accelerations(pos, gms)
        # Testteilchen zur Sonne hin (negativ-x), Betrag = GM_sun/r^2 = GM_sun
        assert acc[1, 0] == pytest.approx(-GM_SUN_AU3_PER_DAY2, rel=1e-6)
        assert acc[1, 1] == pytest.approx(0.0, abs=1e-15)
        assert acc[1, 2] == pytest.approx(0.0, abs=1e-15)


class TestRK4:
    def test_circular_orbit_stays_circular(self):
        # Sonne + Testteilchen mit v_circ bei r=1 AU
        gms = np.array([GM_SUN_AU3_PER_DAY2, 0.0])
        v_circ = math.sqrt(GM_SUN_AU3_PER_DAY2 / 1.0)
        state = np.array([
            [0.0, 0, 0, 0, 0, 0],
            [1.0, 0, 0, 0, v_circ, 0],
        ])
        # 365 Schritte a 1 Tag
        for _ in range(365):
            state = rk4_step(state, gms, 1.0)
        r_final = float(np.linalg.norm(state[1, :3]))
        assert r_final == pytest.approx(1.0, abs=1e-3)


class TestConservation:
    @pytest.fixture(scope='class')
    def sim_1yr(self):
        bodies = [
            {'id': 'sun', **CELESTIAL_BODIES['sun']},
            {'id': 'earth', **CELESTIAL_BODIES['earth']},
            {'id': 'jupiter', **CELESTIAL_BODIES['jupiter']},
        ]
        return simulate_nbody(bodies, datetime(2026, 1, 1), datetime(2027, 1, 1),
                              step_days=1.0, sample_every=30)

    def test_energy_conservation_1yr(self, sim_1yr):
        E = sim_1yr['energy']
        E0 = E[0]
        for Ei in E[1:]:
            drift = abs((Ei - E0) / E0)
            assert drift < 1e-6, f"E drift {drift} > 1e-6"

    def test_angular_momentum_conservation_1yr(self, sim_1yr):
        L = np.array(sim_1yr['angular_momentum'])
        L0_mag = float(np.linalg.norm(L[0]))
        for Li in L[1:]:
            drift = float(np.linalg.norm(Li - L[0])) / L0_mag
            assert drift < 1e-6, f"L drift {drift} > 1e-6"


class TestKeplerBaseline:
    def test_earth_2body_matches_kepler_10yr(self):
        # 2-Koerper-System (Sonne+Erde): RK4 muss praktisch identisch mit Kepler sein
        bodies = [
            {'id': 'sun', **CELESTIAL_BODIES['sun']},
            {'id': 'earth', **CELESTIAL_BODIES['earth']},
        ]
        start, end = datetime(2026, 1, 1), datetime(2036, 1, 1)
        result = simulate_nbody(bodies, start, end, step_days=1.0, sample_every=365)

        earth_idx = result['body_ids'].index('earth')
        sun_idx = result['body_ids'].index('sun')
        earth_nb = np.array(result['positions'][-1][earth_idx])
        sun_nb = np.array(result['positions'][-1][sun_idx])
        # heliozentrisch: Erde relativ zur Sonne
        earth_helio = earth_nb - sun_nb

        kep = calculate_position(CELESTIAL_BODIES['earth']['orbital_elements'], end)
        earth_kep = np.array([kep['x'], kep['y'], kep['z']])

        diff = float(np.linalg.norm(earth_helio - earth_kep))
        assert diff < 0.001, f"RK4 vs Kepler Erde 10yr: {diff} AU"


class TestNbodyEndpoint:
    def test_endpoint_basic(self, client):
        r = client.post('/api/simulate/nbody', json={
            'bodies': ['sun', 'earth'],
            'start_time': '2026-01-01T00:00:00',
            'end_time': '2026-04-01T00:00:00',
            'step_days': 1.0,
            'sample_every': 10,
        })
        assert r.status_code == 200
        d = r.get_json()
        assert d['simulation']['body_ids'] == ['sun', 'earth']
        assert d['simulation']['metadata']['integrator'] == 'RK4'
        assert d['simulation']['metadata']['frame'] == 'barycentric'

    def test_endpoint_unknown_body_returns_404(self, client):
        r = client.post('/api/simulate/nbody', json={'bodies': ['unknown_x']})
        assert r.status_code == 404

    def test_endpoint_empty_body_returns_400(self, client):
        assert client.post('/api/simulate/nbody', json={}).status_code == 400

    def test_endpoint_in_available_endpoints_404(self, client):
        d = client.get('/api/does_not_exist').get_json()
        assert '/api/simulate/nbody' in d['available_endpoints']

    def test_endpoint_include_planet9(self, client):
        # Sprint A.3: P9 muss im N-Body-Pool landen wenn include_planet9=true
        r = client.post('/api/simulate/nbody', json={
            'bodies': ['sun', 'sedna'],
            'start_time': '2026-01-01T00:00:00',
            'end_time': '2026-04-01T00:00:00',
            'step_days': 5.0,
            'sample_every': 5,
            'include_planet9': True,
        })
        assert r.status_code == 200
        d = r.get_json()
        assert 'planet9' in d['simulation']['body_ids']

    def test_endpoint_planet9_default_off(self, client):
        r = client.post('/api/simulate/nbody', json={
            'bodies': ['sun', 'earth'],
            'start_time': '2026-01-01T00:00:00',
            'end_time': '2026-02-01T00:00:00',
            'step_days': 1.0,
            'sample_every': 5,
        })
        d = r.get_json()
        assert 'planet9' not in d['simulation']['body_ids']
