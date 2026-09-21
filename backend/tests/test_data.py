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


class TestPhysicalWave2Fields:
    """Welle 2: rotation_period_hours / obliquity_deg / albedo_geometric / rings.

    Quellen: NSSDCA Planetary Factsheets (Planeten), Sekundaerquellen bei
    Zwergplaneten. Sparse: Felder nur wo belegt; None = nicht belastbar.
    """

    WITH_VALUES = (
        'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn',
        'uranus', 'neptune', 'pluto', 'ceres', 'eris', 'makemake',
        'haumea', 'quaoar',
    )
    RINGED = ('jupiter', 'saturn', 'uranus', 'neptune')

    def test_fields_present_where_documented(self):
        for body_id in self.WITH_VALUES:
            phys = CELESTIAL_BODIES[body_id]['physical_data']
            for k in ('rotation_period_hours', 'obliquity_deg', 'albedo_geometric'):
                assert k in phys, f"{body_id}: missing {k}"

    def test_albedo_in_range(self):
        for body_id in self.WITH_VALUES:
            a = CELESTIAL_BODIES[body_id]['physical_data']['albedo_geometric']
            assert a is not None and 0 < a <= 1, f"{body_id}: albedo={a}"

    def test_retrograde_negative(self):
        for body_id in ('venus', 'uranus', 'pluto'):
            rot = CELESTIAL_BODIES[body_id]['physical_data']['rotation_period_hours']
            assert rot < 0, f"{body_id}: retrograd erwartet, bekam {rot}"

    def test_earth_exact_values(self):
        phys = CELESTIAL_BODIES['earth']['physical_data']
        assert phys['rotation_period_hours'] == 23.9345
        assert phys['obliquity_deg'] == 23.44
        assert phys['albedo_geometric'] == 0.434

    def test_ringed_planets_structure(self):
        for body_id in self.RINGED:
            rings = CELESTIAL_BODIES[body_id]['physical_data']['rings']
            assert len(rings) >= 4, f"{body_id}: zu wenige Ringe"
            for ring in rings:
                for k in ('name', 'inner_radius_km', 'outer_radius_km', 'optical_depth'):
                    assert k in ring, f"{body_id}/{ring.get('name')}: missing {k}"
                assert ring['inner_radius_km'] <= ring['outer_radius_km']

    def test_ring_radii_outside_surface(self):
        for body_id in self.RINGED:
            phys = CELESTIAL_BODIES[body_id]['physical_data']
            for ring in phys['rings']:
                assert ring['inner_radius_km'] > phys['radius_km'], (
                    f"{body_id}/{ring['name']}: Ring beginnt unter der Oberflaeche"
                )

    def test_saturn_main_rings(self):
        rings = {r['name']: r for r in CELESTIAL_BODIES['saturn']['physical_data']['rings']}
        assert rings['B']['inner_radius_km'] == 91975
        assert rings['B']['outer_radius_km'] == 117507
        assert rings['A']['inner_radius_km'] == 122340

    def test_unringed_bodies_have_no_rings_key(self):
        for body_id in ('mercury', 'venus', 'earth', 'mars'):
            assert 'rings' not in CELESTIAL_BODIES[body_id]['physical_data']
        for tno_id, tno in TNO_BODIES.items():
            assert 'rings' not in tno['physical_data'], f"{tno_id}: TNO mit Ringen?"
