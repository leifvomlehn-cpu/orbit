"""Tests fuer das Mittel-Prio-Paket (09/2026):
- parse_iso_utc: explizites null im JSON -> HTTP 400 statt AttributeError/500
- Kepler fail-fast: e >= 1 wird mit klarem ValueError abgelehnt (statt still
  falsch zu rechnen); korrekte hyperbolische Implementierung kommt mit Sprint C
- Zirkulaere TNO-Winkelstatistik: wrap-sicher bei 0°/360°
"""
import math

import pytest

from app import parse_iso_utc
from physics import (
    solve_kepler,
    calculate_position,
    calculate_orbit_path,
    calculate_tno_clustering,
    _circular_mean_deg,
    _circular_std_deg,
    _circular_median_deg,
)


class TestParseIsoUtcNull:
    """Regression: "start_time": null im JSON -> None.strip() ->
    AttributeError -> HTTP 500. Muss 400 mit klarer Meldung sein."""

    def test_none_raises_valueerror(self):
        with pytest.raises(ValueError):
            parse_iso_utc(None)

    def test_empty_string_raises_valueerror(self):
        with pytest.raises(ValueError):
            parse_iso_utc('   ')

    def test_non_string_raises_valueerror(self):
        with pytest.raises(ValueError):
            parse_iso_utc(12345)

    def test_simulate_null_start_time_returns_400(self, client):
        r = client.post('/api/simulate', json={
            'bodies': ['earth'],
            'start_time': None,
            'end_time': '2026-02-01T00:00:00',
            'steps': 10,
        })
        assert r.status_code == 400

    def test_simulate_null_end_time_returns_400(self, client):
        r = client.post('/api/simulate', json={
            'bodies': ['earth'],
            'start_time': '2026-01-01T00:00:00',
            'end_time': None,
            'steps': 10,
        })
        assert r.status_code == 400

    def test_nbody_null_start_time_returns_400(self, client):
        r = client.post('/api/simulate/nbody', json={
            'bodies': ['sun', 'earth'],
            'start_time': None,
            'duration_days': 30,
            'step_days': 5.0,
        })
        assert r.status_code == 400

    def test_nbody_null_end_time_returns_400(self, client):
        r = client.post('/api/simulate/nbody', json={
            'bodies': ['sun', 'earth'],
            'start_time': '2026-01-01T00:00:00',
            'end_time': None,
            'step_days': 5.0,
        })
        assert r.status_code == 400


class TestKeplerFailFast:
    """e >= 1: hyperbolischer Pfad rechnete still falsch (physics.py:86/166).
    Jetzt fail-fast mit klarer Meldung — korrekte Implementierung in Sprint C."""

    HYPERBOLIC_ELEMENTS = {
        'semi_major_axis_au': 1.0,
        'eccentricity': 1.5,
        'inclination_deg': 0.0,
        'longitude_ascending_node_deg': 0.0,
        'argument_perihelion_deg': 0.0,
        'mean_anomaly_deg': 0.0,
        'orbital_period_days': 365.25,
    }

    def test_solve_kepler_rejects_hyperbolic(self):
        with pytest.raises(ValueError, match='hyperbolisch'):
            solve_kepler(0.5, 1.5)

    def test_solve_kepler_rejects_parabolic(self):
        with pytest.raises(ValueError, match='hyperbolisch'):
            solve_kepler(0.5, 1.0)

    def test_calculate_position_rejects_hyperbolic(self):
        from datetime import datetime
        with pytest.raises(ValueError, match='hyperbolisch'):
            calculate_position(self.HYPERBOLIC_ELEMENTS, datetime(2026, 1, 1))

    def test_calculate_orbit_path_rejects_hyperbolic(self):
        with pytest.raises(ValueError, match='hyperbolisch'):
            calculate_orbit_path(self.HYPERBOLIC_ELEMENTS)

    def test_elliptical_orbits_unaffected(self):
        # Hohe, aber geschlossene Exzentrizitaet (z.B. Sedna e~0.85) muss
        # weiterhin funktionieren.
        E = solve_kepler(1.0, 0.85)
        assert math.isfinite(E)
        path = calculate_orbit_path({
            **self.HYPERBOLIC_ELEMENTS, 'eccentricity': 0.85,
        })
        assert len(path['x']) == 360


class TestCircularTnoStatistics:
    """Regression physics.py:519: np.mean/std ueber Perihel-Argumente ignorierte
    den 0°/360°-Wrap — 359° und 1° ergaben linear 180° statt ~0°."""

    def test_mean_wraps_around_zero(self):
        assert _circular_mean_deg([359.0, 1.0]) == pytest.approx(0.0, abs=0.1)

    def test_mean_simple_cluster(self):
        assert _circular_mean_deg([10.0, 20.0, 30.0]) == pytest.approx(20.0, abs=0.1)

    def test_std_small_for_tight_cluster(self):
        assert _circular_std_deg([359.0, 1.0]) < 2.0

    def test_std_large_for_opposite_angles(self):
        # 0° und 180°: maximal gestreut -> std deutlich groesser
        assert _circular_std_deg([0.0, 180.0]) > 60.0

    def test_median_wraps_around_zero(self):
        med = _circular_median_deg([358.0, 0.0, 2.0])
        assert med == pytest.approx(0.0, abs=0.1)

    def test_clustering_endpoint_uses_circular_stats(self, client):
        d = client.get('/api/planet9/search').get_json()
        stats = d['tno_clustering']['argument_perihelion_stats']
        assert stats['method'].startswith('circular')
        assert 0.0 <= stats['mean'] < 360.0
        assert math.isfinite(stats['std'])
