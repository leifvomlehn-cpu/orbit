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

    def test_cache_keys_are_query_aware(self, client):
        # Regression: statischer Key 'all_bodies' ignorierte category/planet9 —
        # die erste Anfrage bestimmte 5 min lang alle Antworten.
        d1 = client.get('/api/bodies').get_json()
        assert 'planet9' not in [b['id'] for b in d1['bodies']]
        d2 = client.get('/api/bodies?include_planet9=true').get_json()
        assert 'planet9' in [b['id'] for b in d2['bodies']]
        d3 = client.get('/api/bodies?category=planets').get_json()
        assert {b['category'] for b in d3['bodies']} == {'planet'}
        # Wiederholung der ersten Anfrage: Cache-Treffer, unveraenderte Daten
        d4 = client.get('/api/bodies').get_json()
        assert len(d4['bodies']) == len(d1['bodies'])


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

    def test_orbit_cache_keys_are_query_aware(self, client):
        # Regression: Key enthielt nur body_id, points ging unter
        d1 = client.get('/api/orbit/earth?points=180').get_json()
        d2 = client.get('/api/orbit/earth?points=360').get_json()
        assert d1['points_count'] == 180
        assert d2['points_count'] == 360


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

    def test_cache_keys_are_query_aware(self, client):
        # Regression: Default-Key (nur Pfad) ignorierte confidence
        d1 = client.get('/api/planet9/search?confidence=conservative').get_json()
        d2 = client.get('/api/planet9/search?confidence=optimistic').get_json()
        assert d1['search_zone']['confidence_level'] == 'conservative'
        assert d2['search_zone']['confidence_level'] == 'optimistic'


class TestTnoDiscoveries:
    def test_returns_count(self, client):
        d = client.get('/api/tno/discoveries').get_json()
        assert d['count'] > 0
        assert d['total_tnos'] > 0

    def test_cache_keys_are_query_aware(self, client):
        # Regression: Default-Key (nur Pfad) ignorierte limit
        d1 = client.get('/api/tno/discoveries?limit=5').get_json()
        d2 = client.get('/api/tno/discoveries?limit=10').get_json()
        assert d1['count'] == 5
        assert d2['count'] == 10


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


class TestIsoTimestampHandling:
    """Regression Fix-Paket 09/2026: 'Z'/Offsets crashten mit HTTP 500
    (naive - aware datetime) oder wurden ohne UTC-Umrechnung abgeschnitten."""

    def test_position_accepts_z_suffix(self, client):
        r = client.get('/api/position/earth/2026-04-06T12:00:00Z')
        assert r.status_code == 200
        assert r.get_json()['timestamp'].startswith('2026-04-06T12:00:00')

    def test_position_offset_is_converted_to_utc(self, client):
        # '+' im Pfad bleibt literal (kein Query-Decoding) — 14:00+02:00 = 12:00 UTC
        r = client.get('/api/position/earth/2026-04-06T14:00:00+02:00')
        assert r.status_code == 200
        assert r.get_json()['timestamp'].startswith('2026-04-06T12:00:00')

    def test_time_convert_accepts_z(self, client):
        d = client.get('/api/time/convert?iso=2000-01-01T12:00:00Z').get_json()
        assert d['julian_date'] == pytest.approx(2451545.0)

    def test_time_convert_offset_is_converted_to_utc(self, client):
        # Query-String: '+' muss als %2B kodiert sein (sonst Space)
        d = client.get('/api/time/convert?iso=2000-01-01T14:00:00%2B02:00').get_json()
        assert d['julian_date'] == pytest.approx(2451545.0)

    def test_ephemeris_accepts_z_dates(self, client):
        r = client.get('/api/ephemeris?start_date=2026-01-01T00:00:00Z&end_date=2026-01-15T00:00:00Z')
        assert r.status_code == 200
        assert r.get_json()['entries'] > 0

    def test_simulate_accepts_z_timestamps(self, client):
        r = client.post('/api/simulate', json={
            'bodies': ['earth'],
            'start_time': '2026-01-01T00:00:00Z',
            'end_time': '2026-02-01T00:00:00Z',
            'steps': 10,
        })
        assert r.status_code == 200

    def test_nbody_accepts_z_timestamps(self, client):
        r = client.post('/api/simulate/nbody', json={
            'bodies': ['sun', 'earth'],
            'start_time': '2026-01-01T00:00:00Z',
            'duration_days': 30,
            'step_days': 5.0,
        })
        assert r.status_code == 200


class TestNbodyLimits:
    """Regression Fix-Paket 09/2026: unbegrenzte n_steps/n_samples -> OOM
    im 2G-Container. Caps muessen VOR der Array-Allokation greifen."""

    def test_step_cap_returns_400(self, client):
        r = client.post('/api/simulate/nbody', json={
            'bodies': ['sun', 'earth'],
            'duration_days': 365.25 * 1_000_000,
            'step_days': 0.01,
        })
        assert r.status_code == 400
        d = r.get_json()
        assert d['max_steps'] == 2_000_000
        assert d['n_steps_required'] > d['max_steps']

    def test_sample_cap_returns_400(self, client):
        r = client.post('/api/simulate/nbody', json={
            'bodies': ['sun', 'earth'],
            'duration_days': 365.25 * 5000,
            'step_days': 1.0,
            'sample_every': 1,
        })
        assert r.status_code == 400
        d = r.get_json()
        assert d['max_samples'] == 10_000
        assert d['n_samples_required'] > d['max_samples']

    def test_request_within_limits_passes(self, client):
        r = client.post('/api/simulate/nbody', json={
            'bodies': ['sun', 'earth'],
            'duration_days': 365.25,
            'step_days': 30,
            'sample_every': 1,
        })
        assert r.status_code == 200



class TestBodiesTnoType:
    """Sprint B: /api/bodies liefert tno_type mit, damit der Extreme-Filter
    im React-Frontend greift (vorher war der Tab still leer, weil category
    fuer TNOs hart auf 'tno' gesetzt wurde)."""

    def test_sedna_is_sednoid(self, client):
        d = client.get('/api/bodies?category=tnos').get_json()
        sedna = next((b for b in d['bodies'] if b['id'] == 'sedna'), None)
        assert sedna is not None
        assert sedna.get('tno_type') == 'sednoid'

    def test_extreme_tno_type_present(self, client):
        d = client.get('/api/bodies?category=tnos').get_json()
        types = {b.get('tno_type') for b in d['bodies']}
        assert 'extreme_tno' in types

    def test_planets_have_no_tno_type_key(self, client):
        d = client.get('/api/bodies?category=planets').get_json()
        assert all('tno_type' not in b for b in d['bodies'])


class TestJsonBodyErrors:
    """Deep-Recon #3: ungültiges/fehlendes JSON landete über die
    HTTPException von get_json() im generischen 500er statt als 400."""

    def test_simulate_invalid_json_returns_400(self, client):
        r = client.post('/api/simulate', data='{kaputt', content_type='application/json')
        assert r.status_code == 400

    def test_simulate_wrong_content_type_returns_400(self, client):
        r = client.post('/api/simulate', data='bodies=earth', content_type='text/plain')
        assert r.status_code == 400

    def test_nbody_invalid_json_returns_400(self, client):
        r = client.post('/api/simulate/nbody', data='{kaputt', content_type='application/json')
        assert r.status_code == 400

    def test_nbody_wrong_content_type_returns_400(self, client):
        r = client.post('/api/simulate/nbody', data='x=1', content_type='text/plain')
        assert r.status_code == 400


class TestEphemerisLimits:
    """Deep-Recon #2: unbegrenzter Zeitraum -> ~220k Einträge (OOM/Payload)."""

    def test_huge_range_returns_400(self, client):
        r = client.get('/api/ephemeris?start_date=1900-01-01&end_date=2500-01-01&interval_days=1')
        assert r.status_code == 400
        assert r.get_json()['max_entries'] == 2000

    def test_range_within_limit_passes(self, client):
        r = client.get('/api/ephemeris?start_date=2026-01-01&end_date=2027-12-31&interval_days=1')
        assert r.status_code == 200


class TestCorsLockedDown:
    """Deep-Recon #1: Origins-Whitelist statt '*'."""

    def test_unknown_origin_gets_no_cors_header(self, client):
        r = client.get('/api/health', headers={'Origin': 'http://evil.example'})
        assert 'Access-Control-Allow-Origin' not in r.headers

    def test_dev_origin_is_allowed(self, client):
        r = client.get('/api/health', headers={'Origin': 'http://localhost:5173'})
        assert r.headers.get('Access-Control-Allow-Origin') == 'http://localhost:5173'
