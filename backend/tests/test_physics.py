"""Tests for orbital physics module."""
import math
from datetime import datetime

import pytest

from physics import (
    julian_date,
    days_since_j2000,
    kepler_equation,
    solve_kepler,
    calculate_true_anomaly,
    calculate_position,
    calculate_orbit_path,
    calculate_orbital_velocity,
    calculate_orbital_period,
    calculate_synodic_period,
    calculate_tno_clustering,
    calculate_planet9_search_zone,
    J2000_EPOCH,
)
from orbital_data import CELESTIAL_BODIES


class TestTimeFunctions:
    def test_julian_date_at_j2000_epoch(self):
        assert julian_date(J2000_EPOCH) == pytest.approx(2451545.0)

    def test_days_since_j2000_at_epoch(self):
        assert days_since_j2000(J2000_EPOCH) == pytest.approx(0.0)

    def test_days_since_j2000_one_year_later(self):
        # 2000 was a leap year -> 366 days from J2000 to 2001-01-01 12:00
        assert days_since_j2000(datetime(2001, 1, 1, 12, 0, 0)) == pytest.approx(366.0)


class TestKeplerEquation:
    def test_kepler_equation_at_zero(self):
        assert kepler_equation(0.0, 0.0, 0.0) == pytest.approx(0.0)

    def test_solve_kepler_circular_orbit(self):
        # e=0 -> E == M
        M = 1.234
        assert solve_kepler(M, 0.0) == pytest.approx(M)

    def test_solve_kepler_low_eccentricity(self):
        M, e = 0.5, 0.2
        E = solve_kepler(M, e)
        assert (E - e * math.sin(E)) == pytest.approx(M, abs=1e-9)

    def test_solve_kepler_high_eccentricity(self):
        M, e = 0.5, 0.9
        E = solve_kepler(M, e)
        assert (E - e * math.sin(E)) == pytest.approx(M, abs=1e-9)

    def test_solve_kepler_at_perihel(self):
        assert solve_kepler(0.0, 0.5) == pytest.approx(0.0)


class TestTrueAnomaly:
    def test_true_anomaly_at_perihel(self):
        assert calculate_true_anomaly(0.0, 0.5) == pytest.approx(0.0)

    def test_true_anomaly_at_aphelion(self):
        # E=pi -> nu=pi (atan2 may return ±pi for the same physical point)
        nu = calculate_true_anomaly(math.pi, 0.5)
        assert abs(abs(nu) - math.pi) < 1e-9


class TestPositionCalculation:
    def test_sun_position_is_origin(self):
        pos = calculate_position(CELESTIAL_BODIES['sun']['orbital_elements'], datetime(2026, 1, 1))
        assert (pos['x'], pos['y'], pos['z'], pos['r']) == (0.0, 0.0, 0.0, 0.0)

    def test_earth_distance_within_perihel_aphelion(self):
        for month in range(1, 13):
            pos = calculate_position(CELESTIAL_BODIES['earth']['orbital_elements'], datetime(2026, month, 1))
            assert 0.98 < pos['r'] < 1.02, f"month {month}: r={pos['r']:.4f}"

    def test_jupiter_distance_in_range(self):
        pos = calculate_position(CELESTIAL_BODIES['jupiter']['orbital_elements'], datetime(2026, 1, 1))
        assert 4.9 < pos['r'] < 5.5

    def test_neptune_distance_around_30_au(self):
        pos = calculate_position(CELESTIAL_BODIES['neptune']['orbital_elements'], datetime(2026, 1, 1))
        assert 29.5 < pos['r'] < 30.5

    def test_sedna_distance_above_70_au(self):
        from orbital_data import TNO_BODIES
        pos = calculate_position(TNO_BODIES['sedna']['orbital_elements'], datetime(2026, 1, 1))
        assert pos['r'] > 70.0


class TestOrbitPath:
    def test_orbit_path_length_matches_points(self):
        path = calculate_orbit_path(CELESTIAL_BODIES['earth']['orbital_elements'], num_points=180)
        assert len(path['x']) == len(path['y']) == len(path['z']) == 180

    def test_earth_orbit_stays_in_perihel_aphelion(self):
        path = calculate_orbit_path(CELESTIAL_BODIES['earth']['orbital_elements'], num_points=72)
        distances = [math.sqrt(x*x + y*y + z*z) for x, y, z in zip(path['x'], path['y'], path['z'])]
        assert all(0.98 < d < 1.02 for d in distances)

    def test_sun_orbit_path_collapses_to_origin(self):
        assert calculate_orbit_path(CELESTIAL_BODIES['sun']['orbital_elements'])['x'] == [0.0]


class TestOrbitalMechanics:
    def test_orbital_period_kepler3_earth(self):
        # P[years] = sqrt(a^3) for a=1 AU -> 1 year
        assert calculate_orbital_period(1.0) == pytest.approx(365.25, abs=0.01)

    def test_orbital_period_kepler3_jupiter(self):
        # Jupiter a=5.204 -> P ~= 11.86 years
        assert calculate_orbital_period(5.204) == pytest.approx(11.86 * 365.25, rel=0.01)

    def test_orbital_velocity_earth(self):
        # Earth at 1 AU: ~29.78 km/s
        v = calculate_orbital_velocity(CELESTIAL_BODIES['earth']['orbital_elements'], 1.0)
        assert v == pytest.approx(29.78, rel=0.01)

    def test_synodic_period_earth_mars(self):
        # Earth-Mars synodic period: ~779.94 days
        assert calculate_synodic_period(365.25, 686.97) == pytest.approx(779.94, abs=2.0)

    def test_synodic_period_same_body_is_infinite(self):
        assert calculate_synodic_period(365.25, 365.25) == float('inf')


class TestClusteringAndPlanet9:
    def test_clustering_returns_required_structure(self):
        c = calculate_tno_clustering()
        assert c['total_objects_analyzed'] > 0
        for k in ('argument_perihelion_stats', 'inclination_stats', 'clusters', 'clustered_objects'):
            assert k in c

    def test_planet9_zone_moderate(self):
        z = calculate_planet9_search_zone('moderate')
        assert z['confidence_level'] == 'moderate'
        assert z['semi_major_axis_au']['min'] == 400
        assert z['semi_major_axis_au']['max'] == 800

    def test_planet9_zone_probability_bounded(self):
        probs = [p['probability'] for p in calculate_planet9_search_zone('moderate')['probability_map']]
        assert all(0 <= p <= 1 for p in probs)
