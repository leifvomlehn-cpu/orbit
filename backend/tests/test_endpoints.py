"""Tests for orbital API endpoints."""
import pytest


class TestHealth:
    def test_health_returns_200(self, client):
        r = client.get('/api/health')
        assert r.status_code == 200
        d = r.get_json()
        assert d['status'] == 'healthy'
        assert d['bodies_count'] > 20


class TestGetAllBodies:
    def test_returns_200_with_bodies(self, client):
        d = client.get('/api/bodies').get_json()
        assert isinstance(d['bodies'], list)
        assert d['count'] == len(d['bodies'])

    def test_excludes_planet9_by_default(self, client):
        d = client.get('/api/bodies').get_json()
        assert 'planet9' not in [b['id'] for b in d['bodies']]

    def test_includes_planet9_when_requested(self, client):
        d = client.get('/api/bodies?include_planet9=true').get_json()
        ids = [b['id'] for b in d['bodies']]
        assert 'planet9' in ids
        p9 = next(b for b in d['bodies'] if b['id'] == 'planet9')
        assert p9['hypothetical'] is True

    def test_filter_planets_only(self, client):
        d = client.get('/api/bodies?category=planets').get_json()
        assert {b['category'] for b in d['bodies']} == {'planet'}

    def test_filter_tnos_only(self, client):
        d = client.get('/api/bodies?category=tnos').get_json()
        assert {b['category'] for b in d['bodies']} == {'tno'}

    def test_sorted_by_semi_major_axis(self, client):
        d = client.get('/api/bodies').get_json()
        axes = [b['orbital_elements']['semi_major_axis_au'] for b in d['bodies']]
        assert axes == sorted(axes)


class TestGetBody:
    def test_get_earth_by_id(self, client):
        d = client.get('/api/bodies/earth').get_json()
        assert d['id'] == 'earth'
        assert d['name_de'] == 'Erde'
        assert 'current_position' in d
        assert 'orbit_path' in d

    def test_unknown_body_returns_404(self, client):
        assert client.get('/api/bodies/middle_earth').status_code == 404

    def test_lookup_by_german_name(self, client):
        d = client.get('/api/bodies/erde').get_json()
        assert d['id'] == 'earth'


class TestPosition:
    def test_position_now(self, client):
        d = client.get('/api/position/earth/now').get_json()
        assert d['body_id'] == 'earth'
        assert 0.98 < d['position']['r'] < 1.02

    def test_position_iso_timestamp(self, client):
        d = client.get('/api/position/earth/2026-04-06T12:00:00').get_json()
        assert d['timestamp'].startswith('2026-04-06')

    def test_invalid_timestamp_returns_400(self, client):
        assert client.get('/api/position/earth/not-a-date').status_code == 400

    def test_unknown_body_returns_404(self, client):
        assert client.get('/api/position/middle_earth/now').status_code == 404


class TestOrbit:
    def test_orbit_earth(self, client):
        d = client.get('/api/orbit/earth').get_json()
        assert d['body_id'] == 'earth'
        assert d['points_count'] > 0

    def test_orbit_custom_points(self, client):
        d = client.get('/api/orbit/earth?points=180').get_json()
        assert d['points_count'] == 180


class TestSimulate:
    def test_simulate_basic(self, client):
        r = client.post('/api/simulate', json={
            'bodies': ['earth', 'mars'],
            'start_time': '2026-01-01T00:00:00',
            'end_time': '2026-04-01T00:00:00',
            'steps': 10,
        })
        assert r.status_code == 200
        d = r.get_json()
        assert len(d['simulation']['results']) == 10
        for step in d['simulation']['results']:
            assert 'earth' in step['positions'] and 'mars' in step['positions']

    def test_simulate_empty_body_returns_400(self, client):
        assert client.post('/api/simulate', json={}).status_code == 400

    def test_simulate_with_planet9(self, client):
        r = client.post('/api/simulate', json={
            'bodies': ['earth'],
            'start_time': '2026-01-01T00:00:00',
            'end_time': '2026-02-01T00:00:00',
            'steps': 5,
            'include_planet9': True,
        })
        d = r.get_json()
        assert 'planet9' in d['simulation']['results'][0]['positions']


class TestPlanet9Search:
    def test_returns_full_structure(self, client):
        d = client.get('/api/planet9/search').get_json()
        for k in ('planet9_prediction', 'search_zone', 'tno_clustering'):
            assert k in d


class TestTnoDiscoveries:
    def test_returns_count(self, client):
        d = client.get('/api/tno/discoveries').get_json()
        assert d['count'] > 0
        assert d['total_tnos'] > 0


class TestCategoriesEndpoint:
    def test_returns_categories_and_colors(self, client):
        d = client.get('/api/categories').get_json()
        assert 'categories' in d and 'colors' in d


class TestTimeConvert:
    def test_iso_to_jd(self, client):
        d = client.get('/api/time/convert?iso=2000-01-01T12:00:00').get_json()
        assert d['julian_date'] == pytest.approx(2451545.0)

    def test_jd_to_iso(self, client):
        d = client.get('/api/time/convert?jd=2451545.0').get_json()
        assert d['iso'].startswith('2000-01-01T12:00:00')

    def test_default_returns_now(self, client):
        d = client.get('/api/time/convert').get_json()
        assert 'julian_date' in d
        assert d['input']['current_time'] == 'now'


class TestEphemeris:
    def test_default_ephemeris(self, client):
        d = client.get('/api/ephemeris').get_json()
        assert d['entries'] > 0


class TestUnknownEndpoint:
    def test_404_for_unknown_path(self, client):
        r = client.get('/api/does_not_exist')
        assert r.status_code == 404
        assert 'available_endpoints' in r.get_json()
