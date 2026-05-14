"""Tests for orbital_data integrity."""
import pytest

from orbital_data import (
    CELESTIAL_BODIES,
    TNO_BODIES,
    PLANET_9_PREDICTION,
    BODY_CATEGORIES,
    BODY_COLORS,
)


class TestCelestialBodies:
    @pytest.mark.parametrize("body_id", list(CELESTIAL_BODIES.keys()))
    def test_body_has_required_fields(self, body_id):
        b = CELESTIAL_BODIES[body_id]
        for k in ('name', 'name_de', 'category', 'color', 'orbital_elements', 'physical_data', 'description_de'):
            assert k in b, f"{body_id} missing {k}"

    @pytest.mark.parametrize("body_id", list(CELESTIAL_BODIES.keys()))
    def test_orbital_elements_complete(self, body_id):
        e = CELESTIAL_BODIES[body_id]['orbital_elements']
        for k in ('semi_major_axis_au', 'eccentricity', 'inclination_deg',
                  'longitude_ascending_node_deg', 'argument_perihelion_deg',
                  'mean_anomaly_deg', 'orbital_period_days'):
            assert k in e, f"{body_id}: missing {k}"


class TestTnoBodies:
    @pytest.mark.parametrize("tno_id", list(TNO_BODIES.keys()))
    def test_tno_has_required_fields(self, tno_id):
        b = TNO_BODIES[tno_id]
        for k in ('name', 'name_de', 'color', 'orbital_elements', 'physical_data', 'discovery'):
            assert k in b, f"{tno_id} missing {k}"

    @pytest.mark.parametrize("tno_id", list(TNO_BODIES.keys()))
    def test_tno_eccentricity_below_1(self, tno_id):
        e = TNO_BODIES[tno_id]['orbital_elements']['eccentricity']
        assert 0 <= e < 1, f"{tno_id}: e={e}"


class TestPlanet9:
    def test_orbital_elements_in_range(self):
        e = PLANET_9_PREDICTION['orbital_elements']
        assert 400 <= e['semi_major_axis_au'] <= 800

    def test_marked_hypothetical(self):
        assert PLANET_9_PREDICTION.get('hypothetical') is True


class TestMetadata:
    def test_categories_have_descriptions(self):
        for cat, meta in BODY_CATEGORIES.items():
            assert 'name' in meta and 'description_de' in meta

    def test_body_colors_are_valid_hex(self):
        for body, color in BODY_COLORS.items():
            assert color.startswith('#') and len(color) == 7
