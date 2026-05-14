"""
Orbital Data Module - Complete celestial body database
Contains orbital elements, physical data, and descriptions for:
- Sun, 8 planets, Pluto
- Dwarf planets: Ceres, Eris, Haumea, Makemake, Gonggong, Quaoar, Orcus, Salacia
- TNOs: Sedna, 2012 VP113, and other extreme TNOs
- Planet-9 prediction parameters (Batygin & Brown 2025)

Data Sources:
- NASA JPL Horizons
- Minor Planet Center
- Batygin & Brown (2025) Planet-9 research

Author: IQI Hub Code Engine
Date: 2026-04-06
"""

from typing import Dict, List, Any

# =============================================================================
# CELESTIAL BODIES - Planets and Dwarf Planets
# =============================================================================

CELESTIAL_BODIES: Dict[str, Dict[str, Any]] = {
    # =========================================================================
    # SUN
    # =========================================================================
    'sun': {
        'name': 'Sun',
        'name_de': 'Sonne',
        'category': 'star',
        'color': '#FFD700',
        'orbital_elements': {
            'semi_major_axis_au': 0.0,
            'eccentricity': 0.0,
            'inclination_deg': 0.0,
            'longitude_ascending_node_deg': 0.0,
            'argument_perihelion_deg': 0.0,
            'mean_anomaly_deg': 0.0,
            'orbital_period_days': 0.0,
            'perihelion_au': 0.0,
            'aphelion_au': 0.0
        },
        'physical_data': {
            'mass_kg': 1.989e30,
            'radius_km': 696340,
            'surface_gravity_m_s2': 274.0,
            'escape_velocity_km_s': 617.7
        },
        'description_de': 'Die Sonne ist unser Stern - eine riesige Kugel aus heißem Plasma. Sie enthält 99,86% der gesamten Masse des Sonnensystems und spendet Licht und Wärme für alles Leben auf der Erde.',
        'fun_fact_de': 'Die Sonne ist so groß, dass 1,3 Millionen Erden darin Platz hätten!'
    },
    
    # =========================================================================
    # INNER PLANETS
    # =========================================================================
    'mercury': {
        'name': 'Mercury',
        'name_de': 'Merkur',
        'category': 'planet',
        'color': '#B5B5B5',
        'orbital_elements': {
            'semi_major_axis_au': 0.387,
            'eccentricity': 0.2056,
            'inclination_deg': 7.00,
            'longitude_ascending_node_deg': 48.331,
            'argument_perihelion_deg': 29.124,
            'mean_anomaly_deg': 174.796,  # J2000 epoch
            'orbital_period_days': 87.969,
            'perihelion_au': 0.3075,
            'aphelion_au': 0.4667,
            'mean_motion_deg_day': 4.09237
        },
        'physical_data': {
            'mass_kg': 3.3011e23,
            'radius_km': 2439.7,
            'surface_gravity_m_s2': 3.7,
            'escape_velocity_km_s': 4.25,
            'moons': 0
        },
        'description_de': 'Merkur ist der kleinste Planet und der Sonne am nächsten. Ein Tag auf dem Merkur dauert 59 Erdentage, aber ein Jahr nur 88 Erdentage!',
        'fun_fact_de': 'Obwohl er der Sonne am nächsten ist, ist Merkur nachts eiskalt - bis zu -180°C!'
    },
    
    'venus': {
        'name': 'Venus',
        'name_de': 'Venus',
        'category': 'planet',
        'color': '#E6C87A',
        'orbital_elements': {
            'semi_major_axis_au': 0.723,
            'eccentricity': 0.0068,
            'inclination_deg': 3.39,
            'longitude_ascending_node_deg': 76.680,
            'argument_perihelion_deg': 54.884,
            'mean_anomaly_deg': 50.115,
            'orbital_period_days': 224.701,
            'perihelion_au': 0.718,
            'aphelion_au': 0.728,
            'mean_motion_deg_day': 1.60213
        },
        'physical_data': {
            'mass_kg': 4.8675e24,
            'radius_km': 6051.8,
            'surface_gravity_m_s2': 8.87,
            'escape_velocity_km_s': 10.36,
            'moons': 0
        },
        'description_de': 'Die Venus ist fast so groß wie die Erde und hat die heißeste Oberfläche aller Planeten - über 460°C! Ihre dichte Atmosphäre besteht hauptsächlich aus Kohlendioxid.',
        'fun_fact_de': 'Die Venus dreht sich rückwärts - die Sonne geht dort im Westen auf!'
    },
    
    'earth': {
        'name': 'Earth',
        'name_de': 'Erde',
        'category': 'planet',
        'color': '#6B93D6',
        'orbital_elements': {
            'semi_major_axis_au': 1.000,
            'eccentricity': 0.0167,
            'inclination_deg': 0.00,  # Reference plane
            'longitude_ascending_node_deg': -11.26064,  # Relative to J2000 ecliptic
            'argument_perihelion_deg': 102.94719,
            'mean_anomaly_deg': 100.46435,
            'orbital_period_days': 365.256,
            'perihelion_au': 0.983,
            'aphelion_au': 1.017,
            'mean_motion_deg_day': 0.985647
        },
        'physical_data': {
            'mass_kg': 5.97237e24,
            'radius_km': 6371.0,
            'surface_gravity_m_s2': 9.81,
            'escape_velocity_km_s': 11.19,
            'moons': 1
        },
        'description_de': 'Die Erde ist unser Heimatplanet - der einzige bekannte Planet mit Leben! Sie hat flüssiges Wasser an der Oberfläche und eine Atmosphäre, die uns schützt.',
        'fun_fact_de': 'Die Erde ist nicht perfekt rund - sie ist an den Polen etwas abgeplattet!'
    },
    
    'mars': {
        'name': 'Mars',
        'name_de': 'Mars',
        'category': 'planet',
        'color': '#C1440E',
        'orbital_elements': {
            'semi_major_axis_au': 1.524,
            'eccentricity': 0.0934,
            'inclination_deg': 1.85,
            'longitude_ascending_node_deg': 49.558,
            'argument_perihelion_deg': 286.502,
            'mean_anomaly_deg': 19.373,
            'orbital_period_days': 686.980,
            'perihelion_au': 1.381,
            'aphelion_au': 1.666,
            'mean_motion_deg_day': 0.524039
        },
        'physical_data': {
            'mass_kg': 6.4171e23,
            'radius_km': 3389.5,
            'surface_gravity_m_s2': 3.71,
            'escape_velocity_km_s': 5.03,
            'moons': 2
        },
        'description_de': 'Der Mars wird auch der "Rote Planet" genannt wegen seines eisenhaltigen Staubs. Er hat den größten Vulkan des Sonnensystems - den Olympus Mons!',
        'fun_fact_de': 'Ein Tag auf dem Mars dauert fast genauso lange wie auf der Erde - 24 Stunden und 37 Minuten!'
    },
    
    # =========================================================================
    # OUTER PLANETS - Gas Giants
    # =========================================================================
    'jupiter': {
        'name': 'Jupiter',
        'name_de': 'Jupiter',
        'category': 'planet',
        'color': '#D8CA9D',
        'orbital_elements': {
            'semi_major_axis_au': 5.203,
            'eccentricity': 0.0489,
            'inclination_deg': 1.31,
            'longitude_ascending_node_deg': 100.464,
            'argument_perihelion_deg': 273.867,
            'mean_anomaly_deg': 20.020,
            'orbital_period_days': 4332.59,
            'perihelion_au': 4.951,
            'aphelion_au': 5.455,
            'mean_motion_deg_day': 0.083085
        },
        'physical_data': {
            'mass_kg': 1.8982e27,
            'radius_km': 69911,
            'surface_gravity_m_s2': 24.79,
            'escape_velocity_km_s': 59.5,
            'moons': 95
        },
        'description_de': 'Jupiter ist der größte Planet - er ist mehr als doppelt so massereich wie alle anderen Planeten zusammen! Der Große Rote Fleck ist ein riesiger Sturm, der schon seit hunderten Jahren tobt.',
        'fun_fact_de': 'Auf Jupiter passen über 1300 Erden hinein!'
    },
    
    'saturn': {
        'name': 'Saturn',
        'name_de': 'Saturn',
        'category': 'planet',
        'color': '#EAD6B8',
        'orbital_elements': {
            'semi_major_axis_au': 9.537,
            'eccentricity': 0.0565,
            'inclination_deg': 2.49,
            'longitude_ascending_node_deg': 113.665,
            'argument_perihelion_deg': 339.392,
            'mean_anomaly_deg': 317.020,
            'orbital_period_days': 10759.22,
            'perihelion_au': 9.024,
            'aphelion_au': 10.05,
            'mean_motion_deg_day': 0.033462
        },
        'physical_data': {
            'mass_kg': 5.6834e26,
            'radius_km': 58232,
            'surface_gravity_m_s2': 10.44,
            'escape_velocity_km_s': 35.5,
            'moons': 146
        },
        'description_de': 'Saturn ist berühmt für seine wunderschönen Ringe aus Eis und Gestein. Er ist so leicht, dass er auf Wasser schwimmen würde - wenn es ein Badewanne groß genug gäbe!',
        'fun_fact_de': 'Saturns Ringe sind nur etwa 10 Meter dick, aber über 280.000 Kilometer breit!'
    },
    
    'uranus': {
        'name': 'Uranus',
        'name_de': 'Uranus',
        'category': 'planet',
        'color': '#D1E7E7',
        'orbital_elements': {
            'semi_major_axis_au': 19.19,
            'eccentricity': 0.0457,
            'inclination_deg': 0.77,
            'longitude_ascending_node_deg': 74.006,
            'argument_perihelion_deg': 96.998,
            'mean_anomaly_deg': 142.238,
            'orbital_period_days': 30687.15,
            'perihelion_au': 18.33,
            'aphelion_au': 20.05,
            'mean_motion_deg_day': 0.011715
        },
        'physical_data': {
            'mass_kg': 8.6810e25,
            'radius_km': 25362,
            'surface_gravity_m_s2': 8.87,
            'escape_velocity_km_s': 21.3,
            'moons': 28
        },
        'description_de': 'Uranus ist ein Eisriese, der auf der Seite "liegt" - seine Achse ist um fast 98° gekippt! Das bedeutet, dass seine Pole mehr Sonne bekommen als sein Äquator.',
        'fun_fact_de': 'Uranus ist der kälteste Planet mit Temperaturen bis zu -224°C!'
    },
    
    'neptune': {
        'name': 'Neptune',
        'name_de': 'Neptun',
        'category': 'planet',
        'color': '#5B5DDF',
        'orbital_elements': {
            'semi_major_axis_au': 30.07,
            'eccentricity': 0.0113,
            'inclination_deg': 1.77,
            'longitude_ascending_node_deg': 131.784,
            'argument_perihelion_deg': 276.336,
            'mean_anomaly_deg': 256.228,
            'orbital_period_days': 60190.03,
            'perihelion_au': 29.81,
            'aphelion_au': 30.33,
            'mean_motion_deg_day': 0.005986
        },
        'physical_data': {
            'mass_kg': 1.02413e26,
            'radius_km': 24622,
            'surface_gravity_m_s2': 11.15,
            'escape_velocity_km_s': 23.5,
            'moons': 16
        },
        'description_de': 'Neptun ist der äußerste Planet und hat die stärksten Winde im Sonnensystem - bis zu 2100 km/h! Er wurde durch mathematische Vorhersage entdeckt, bevor man ihn sah.',
        'fun_fact_de': 'Ein Jahr auf dem Neptun dauert 165 Erdjahre - seit seiner Entdeckung 1846 hat er noch nicht einmal einmal die Sonne umkreist!'
    },
    
    # =========================================================================
    # DWARF PLANETS
    # =========================================================================
    'pluto': {
        'name': 'Pluto',
        'name_de': 'Pluto',
        'category': 'dwarf_planet',
        'color': '#C9B8A5',
        'orbital_elements': {
            'semi_major_axis_au': 39.48,
            'eccentricity': 0.2488,
            'inclination_deg': 17.16,
            'longitude_ascending_node_deg': 110.299,
            'argument_perihelion_deg': 113.834,
            'mean_anomaly_deg': 14.53,
            'orbital_period_days': 90560,
            'perihelion_au': 29.66,
            'aphelion_au': 49.30,
            'mean_motion_deg_day': 0.003978
        },
        'physical_data': {
            'mass_kg': 1.303e22,
            'radius_km': 1188.3,
            'surface_gravity_m_s2': 0.62,
            'escape_velocity_km_s': 1.21,
            'moons': 5
        },
        'description_de': 'Pluto war von 1930 bis 2006 der neunte Planet, dann wurde er zum Zwergplaneten umklassifiziert. Er hat ein Herz aus gefrorenem Stickstoff auf seiner Oberfläche!',
        'fun_fact_de': 'Auf Pluto wäre ein 30kg Kind nur etwa 2kg schwer!',
        'discovery': {
            'date': '1930-02-18',
            'year': 1930,
            'discoverers': ['Clyde Tombaugh'],
            'telescope': 'Lowell Observatory'
        }
    },
    
    'ceres': {
        'name': 'Ceres',
        'name_de': 'Ceres',
        'category': 'dwarf_planet',
        'color': '#8B8682',
        'orbital_elements': {
            'semi_major_axis_au': 2.77,
            'eccentricity': 0.0758,
            'inclination_deg': 10.59,
            'longitude_ascending_node_deg': 80.305,
            'argument_perihelion_deg': 73.591,
            'mean_anomaly_deg': 95.989,
            'orbital_period_days': 1681.63,
            'perihelion_au': 2.56,
            'aphelion_au': 2.98,
            'mean_motion_deg_day': 0.21408
        },
        'physical_data': {
            'mass_kg': 9.3835e20,
            'radius_km': 469.7,
            'surface_gravity_m_s2': 0.28,
            'escape_velocity_km_s': 0.51,
            'moons': 0
        },
        'description_de': 'Ceres ist der größte Asteroid im Hauptgürtel zwischen Mars und Jupiter. Er besteht aus Gestein und Eis und könnte einen unterirdischen Ozean haben!',
        'fun_fact_de': 'Ceres enthält etwa ein Viertel der gesamten Masse des Asteroidengürtels!',
        'discovery': {
            'date': '1801-01-01',
            'year': 1801,
            'discoverers': ['Giuseppe Piazzi'],
            'telescope': 'Palermo Observatory'
        }
    },
    
    'eris': {
        'name': 'Eris',
        'name_de': 'Eris',
        'category': 'dwarf_planet',
        'color': '#E1E1E1',
        'orbital_elements': {
            'semi_major_axis_au': 67.64,
            'eccentricity': 0.44,
            'inclination_deg': 44.04,
            'longitude_ascending_node_deg': 35.95,
            'argument_perihelion_deg': 151.64,
            'mean_anomaly_deg': 205.0,
            'orbital_period_days': 204199,
            'perihelion_au': 37.87,
            'aphelion_au': 97.41,
            'mean_motion_deg_day': 0.001765
        },
        'physical_data': {
            'mass_kg': 1.66e22,
            'radius_km': 1163,
            'surface_gravity_m_s2': 0.82,
            'escape_velocity_km_s': 1.38,
            'moons': 1
        },
        'description_de': 'Eris ist etwa so groß wie Pluto und war der Auslöser für die Neuklassifizierung von Planeten. Ihre Entdeckung führte dazu, dass Pluto zum Zwergplaneten wurde!',
        'fun_fact_de': 'Eris wurde nach der griechischen Göttin der Zwietracht benannt - passend zur Debatte über den Planetenstatus!',
        'discovery': {
            'date': '2005-01-05',
            'year': 2005,
            'discoverers': ['Mike Brown', 'Chad Trujillo', 'David Rabinowitz'],
            'telescope': 'Palomar Observatory'
        }
    },
    
    'makemake': {
        'name': 'Makemake',
        'name_de': 'Makemake',
        'category': 'dwarf_planet',
        'color': '#D4A574',
        'orbital_elements': {
            'semi_major_axis_au': 45.79,
            'eccentricity': 0.159,
            'inclination_deg': 28.96,
            'longitude_ascending_node_deg': 79.60,
            'argument_perihelion_deg': 294.71,
            'mean_anomaly_deg': 166.0,
            'orbital_period_days': 111845,
            'perihelion_au': 38.51,
            'aphelion_au': 53.07,
            'mean_motion_deg_day': 0.003224
        },
        'physical_data': {
            'mass_kg': 3.1e21,
            'radius_km': 715,
            'surface_gravity_m_s2': 0.5,
            'escape_velocity_km_s': 0.8,
            'moons': 1
        },
        'description_de': 'Makemake ist nach dem Schöpfer-Gott der Osterinsel benannt. Er ist der zweithellste Zwergplanet nach Pluto und hat eine rötliche Farbe.',
        'fun_fact_de': 'Makemake hat einen kleinen Mond, der erst 2016 entdeckt wurde!',
        'discovery': {
            'date': '2005-03-31',
            'year': 2005,
            'discoverers': ['Mike Brown', 'Chad Trujillo', 'David Rabinowitz'],
            'telescope': 'Palomar Observatory'
        }
    },
    
    'haumea': {
        'name': 'Haumea',
        'name_de': 'Haumea',
        'category': 'dwarf_planet',
        'color': '#B8C4C8',
        'orbital_elements': {
            'semi_major_axis_au': 43.22,
            'eccentricity': 0.195,
            'inclination_deg': 28.19,
            'longitude_ascending_node_deg': 122.11,
            'argument_perihelion_deg': 239.03,
            'mean_anomaly_deg': 187.0,
            'orbital_period_days': 103774,
            'perihelion_au': 34.79,
            'aphelion_au': 51.65,
            'mean_motion_deg_day': 0.003476
        },
        'physical_data': {
            'mass_kg': 4.0e21,
            'radius_km': 780,  # Approximate - elongated shape
            'surface_gravity_m_s2': 0.44,
            'escape_velocity_km_s': 0.84,
            'moons': 2
        },
        'description_de': 'Haumea ist einzigartig - sie ist ellipsenförmig und dreht sich sehr schnell, etwa alle 4 Stunden! Sie hat zwei kleine Monde und einen Ring.',
        'fun_fact_de': 'Haumea ist nach der hawaiianischen Göttin der Fruchtbarkeit benannt.',
        'discovery': {
            'date': '2004-12-28',
            'year': 2004,
            'discoverers': ['Mike Brown', 'Jose-Luis Ortiz'],
            'telescope': 'Palomar / Sierra Nevada Observatory'
        }
    },
    
    'gonggong': {
        'name': 'Gonggong',
        'name_de': 'Gonggong',
        'category': 'dwarf_planet',
        'color': '#A0522D',
        'orbital_elements': {
            'semi_major_axis_au': 67.38,
            'eccentricity': 0.44,
            'inclination_deg': 30.74,
            'longitude_ascending_node_deg': 69.95,
            'argument_perihelion_deg': 23.31,
            'mean_anomaly_deg': 195.0,
            'orbital_period_days': 203030,
            'perihelion_au': 37.47,
            'aphelion_au': 101.29,
            'mean_motion_deg_day': 0.001777
        },
        'physical_data': {
            'mass_kg': 1.8e21,
            'radius_km': 615,
            'surface_gravity_m_s2': 0.3,
            'escape_velocity_km_s': 0.6,
            'moons': 1
        },
        'description_de': 'Gonggong ist nach einem chinesischen Wassergott benannt. Er hat eine rötliche Farbe und einen kleinen Mond namens Xiangliu.',
        'fun_fact_de': 'Gonggong war früher als 2007 OR10 bekannt und bekam erst 2020 seinen Namen!',
        'discovery': {
            'date': '2007-07-17',
            'year': 2007,
            'discoverers': ['Mike Brown', 'David Rabinowitz', 'Megan Schwamb'],
            'telescope': 'Palomar Observatory'
        }
    },
    
    'quaoar': {
        'name': 'Quaoar',
        'name_de': 'Quaoar',
        'category': 'dwarf_planet',
        'color': '#8B7355',
        'orbital_elements': {
            'semi_major_axis_au': 43.58,
            'eccentricity': 0.038,
            'inclination_deg': 7.99,
            'longitude_ascending_node_deg': 189.16,
            'argument_perihelion_deg': 183.61,
            'mean_anomaly_deg': 230.0,
            'orbital_period_days': 105140,
            'perihelion_au': 41.92,
            'aphelion_au': 45.24,
            'mean_motion_deg_day': 0.003426
        },
        'physical_data': {
            'mass_kg': 1.4e21,
            'radius_km': 555,
            'surface_gravity_m_s2': 0.3,
            'escape_velocity_km_s': 0.6,
            'moons': 1
        },
        'description_de': 'Quaoar ist nach einem Schöpfer-Gott der Tongva-Ureinwohner benannt. Er hat einen Ring, der sich ungewöhnlich weit von ihm entfernt befindet!',
        'fun_fact_de': 'Quaoars Ring ist doppelt so weit von ihm entfernt als theoretisch erwartet!',
        'discovery': {
            'date': '2002-06-04',
            'year': 2002,
            'discoverers': ['Mike Brown', 'Chad Trujillo'],
            'telescope': 'Palomar Observatory'
        }
    },
    
    'orcus': {
        'name': 'Orcus',
        'name_de': 'Orcus',
        'category': 'dwarf_planet',
        'color': '#7B6B5A',
        'orbital_elements': {
            'semi_major_axis_au': 39.43,
            'eccentricity': 0.226,
            'inclination_deg': 20.59,
            'longitude_ascending_node_deg': 168.96,
            'argument_perihelion_deg': 312.35,
            'mean_anomaly_deg': 25.0,
            'orbital_period_days': 90420,
            'perihelion_au': 30.52,
            'aphelion_au': 48.34,
            'mean_motion_deg_day': 0.003982
        },
        'physical_data': {
            'mass_kg': 6.3e20,
            'radius_km': 470,
            'surface_gravity_m_s2': 0.27,
            'escape_velocity_km_s': 0.5,
            'moons': 1
        },
        'description_de': 'Orcus ist der "Anti-Pluto" - seine Bahn ist fast identisch mit Plutos, aber er ist auf der anderen Seite des Sonnensystems! Er hat einen Mond namens Vanth.',
        'fun_fact_de': 'Orcus ist nach dem römischen Gott der Unterwelt benannt, wie Pluto!',
        'discovery': {
            'date': '2004-02-17',
            'year': 2004,
            'discoverers': ['Mike Brown', 'Chad Trujillo', 'David Rabinowitz'],
            'telescope': 'Palomar Observatory'
        }
    },
    
    'salacia': {
        'name': 'Salacia',
        'name_de': 'Salacia',
        'category': 'dwarf_planet',
        'color': '#6B8E9F',
        'orbital_elements': {
            'semi_major_axis_au': 42.49,
            'eccentricity': 0.108,
            'inclination_deg': 23.96,
            'longitude_ascending_node_deg': 279.42,
            'argument_perihelion_deg': 93.96,
            'mean_anomaly_deg': 280.0,
            'orbital_period_days': 100880,
            'perihelion_au': 37.90,
            'aphelion_au': 47.08,
            'mean_motion_deg_day': 0.003571
        },
        'physical_data': {
            'mass_kg': 4.9e20,
            'radius_km': 430,
            'surface_gravity_m_s2': 0.25,
            'escape_velocity_km_s': 0.5,
            'moons': 1
        },
        'description_de': 'Salacia ist nach der römischen Göttin des salzigen Meeres benannt. Sie hat einen großen Mond namens Actaea, der etwa 300km groß ist.',
        'fun_fact_de': 'Salacia und ihr Mond Actaea haben eine ungewöhnlich dunkle Farbe!',
        'discovery': {
            'date': '2004-09-22',
            'year': 2004,
            'discoverers': ['Henry G. Roe', 'Michael E. Brown', 'Kristina M. Barkume'],
            'telescope': 'Palomar Observatory'
        }
    }
}

# =============================================================================
# TNO BODIES - Transneptunian Objects
# =============================================================================

TNO_BODIES: Dict[str, Dict[str, Any]] = {
    # =========================================================================
    # SEDNOIDS - Extreme detached objects
    # =========================================================================
    'sedna': {
        'name': 'Sedna',
        'name_de': 'Sedna',
        'tno_type': 'sednoid',
        'color': '#FF6B6B',
        'orbital_elements': {
            'semi_major_axis_au': 524.0,
            'eccentricity': 0.85,
            'inclination_deg': 11.93,
            'longitude_ascending_node_deg': 144.53,
            'argument_perihelion_deg': 310.84,
            'mean_anomaly_deg': 358.5,
            'orbital_period_days': 4150000,  # ~11,400 years
            'perihelion_au': 76.0,
            'aphelion_au': 972.0,
            'mean_motion_deg_day': 0.0000866
        },
        'physical_data': {
            'mass_kg': 2.0e21,
            'radius_km': 500,
            'surface_gravity_m_s2': 0.33,
            'escape_velocity_km_s': 0.6,
            'moons': 0
        },
        'description_de': 'Sedna ist eines der sonnenfernsten bekannten Objekte im Sonnensystem. Ihre extrem exzentrische Bahn führt sie bis zu 972 AU von der Sonne entfernt!',
        'significance_de': 'Sednas ungewöhnliche Bahn könnte durch einen bisher unbekannten Planeten (Planet-9) oder durch einen nahen Stern vor Milliarden Jahren erklärt werden.',
        'discovery': {
            'date': '2003-11-14',
            'year': 2003,
            'discoverers': ['Mike Brown', 'Chad Trujillo', 'David Rabinowitz'],
            'telescope': 'Palomar Observatory'
        }
    },
    
    '2012_vp113': {
        'name': '2012 VP113',
        'name_de': '2012 VP113 "Biden"',
        'tno_type': 'sednoid',
        'color': '#FF9F43',
        'orbital_elements': {
            'semi_major_axis_au': 263.0,
            'eccentricity': 0.69,
            'inclination_deg': 24.03,
            'longitude_ascending_node_deg': 4.65,
            'argument_perihelion_deg': 293.61,
            'mean_anomaly_deg': 24.0,
            'orbital_period_days': 1464000,  # ~4000 years
            'perihelion_au': 80.4,
            'aphelion_au': 446.0,
            'mean_motion_deg_day': 0.000246
        },
        'physical_data': {
            'mass_kg': 1.0e20,
            'radius_km': 300,
            'surface_gravity_m_s2': 0.15,
            'escape_velocity_km_s': 0.3,
            'moons': 0
        },
        'description_de': '2012 VP113, auch "Biden" genannt, war nach Sedna das zweite entdeckte Sednoid. Sein Perihel ist noch weiter von der Sonne entfernt als das von Sedna!',
        'significance_de': 'Gemeinsam mit Sedna bildet 2012 VP113 eine Gruppe von Objekten mit ähnlichen Bahneigenschaften, die auf die Existenz von Planet-9 hindeuten.',
        'discovery': {
            'date': '2012-11-05',
            'year': 2012,
            'discoverers': ['Scott Sheppard', 'Chad Trujillo'],
            'telescope': 'CTIO / Magellan'
        }
    },
    
    '2023_kq14': {
        'name': '2023 KQ14',
        'name_de': '2023 KQ14 "Ammonite"',
        'tno_type': 'sednoid',
        'color': '#FFD93D',
        'orbital_elements': {
            'semi_major_axis_au': 380.0,  # Estimated
            'eccentricity': 0.82,
            'inclination_deg': 17.5,
            'longitude_ascending_node_deg': 130.0,
            'argument_perihelion_deg': 320.0,
            'mean_anomaly_deg': 45.0,
            'orbital_period_days': 2738000,  # ~7500 years
            'perihelion_au': 68.0,
            'aphelion_au': 692.0,
            'mean_motion_deg_day': 0.000131
        },
        'physical_data': {
            'mass_kg': 5.0e20,
            'radius_km': 350,
            'surface_gravity_m_s2': 0.2,
            'escape_velocity_km_s': 0.35,
            'moons': 0
        },
        'description_de': '2023 KQ14, genannt "Ammonite", wurde 2023 entdeckt und ist das neueste Mitglied der Sedna-ähnlichen Objekte. Seine Bahn bestätigt die Muster der anderen Sednoiden.',
        'significance_de': 'Ammonite stärkt die Theorie von Planet-9, da seine Bahn ähnlich ausgerichtet ist wie die von Sedna und 2012 VP113.',
        'discovery': {
            'date': '2023-05-18',
            'year': 2023,
            'discoverers': ['Scott Sheppard', 'Chad Trujillo', 'David Tholen'],
            'telescope': 'Subaru Telescope'
        }
    },
    
    # =========================================================================
    # EXTREME TNOs - Objects with a > 150 AU, q > 30 AU
    # =========================================================================
    '2013_ft28': {
        'name': '2013 FT28',
        'name_de': '2013 FT28',
        'tno_type': 'extreme_tno',
        'color': '#6C5CE7',
        'orbital_elements': {
            'semi_major_axis_au': 356.0,
            'eccentricity': 0.75,
            'inclination_deg': 14.8,
            'longitude_ascending_node_deg': 113.0,
            'argument_perihelion_deg': 107.0,
            'mean_anomaly_deg': 30.0,
            'orbital_period_days': 2460000,
            'perihelion_au': 89.0,
            'aphelion_au': 623.0,
            'mean_motion_deg_day': 0.000146
        },
        'physical_data': {
            'mass_kg': 3.0e19,
            'radius_km': 200,
            'surface_gravity_m_s2': 0.1,
            'escape_velocity_km_s': 0.2,
            'moons': 0
        },
        'description_de': '2013 FT28 ist ein extremes TNO mit einer sehr exzentrischen Bahn. Es gehört zu den Objekten, die zur Planet-9-Suche beitragen.',
        'significance_de': 'Seine Bahn ist antikorreliert zu anderen extremen TNOs, was konsistent mit der Planet-9-Hypothese ist.',
        'discovery': {
            'date': '2013-03-20',
            'year': 2013,
            'discoverers': ['Scott Sheppard', 'Chad Trujillo'],
            'telescope': 'CTIO'
        }
    },
    
    '2014_sr349': {
        'name': '2014 SR349',
        'name_de': '2014 SR349',
        'tno_type': 'extreme_tno',
        'color': '#A29BFE',
        'orbital_elements': {
            'semi_major_axis_au': 300.0,
            'eccentricity': 0.70,
            'inclination_deg': 18.0,
            'longitude_ascending_node_deg': 115.0,
            'argument_perihelion_deg': 95.0,
            'mean_anomaly_deg': 35.0,
            'orbital_period_days': 1897000,
            'perihelion_au': 90.0,
            'aphelion_au': 510.0,
            'mean_motion_deg_day': 0.00019
        },
        'physical_data': {
            'mass_kg': 2.0e19,
            'radius_km': 180,
            'surface_gravity_m_s2': 0.08,
            'escape_velocity_km_s': 0.17,
            'moons': 0
        },
        'description_de': '2014 SR349 ist ein weiteres extremes TNO mit einer Bahn, die auf den Einfluss eines entfernten Planeten hindeutet.',
        'significance_de': 'Gehört zur Gruppe der "anti-aligned" Objekte, die möglicherweise durch Planet-9 beeinflusst werden.',
        'discovery': {
            'date': '2014-09-15',
            'year': 2014,
            'discoverers': ['Scott Sheppard', 'Chad Trujillo'],
            'telescope': 'Subaru Telescope'
        }
    },
    
    '2010_gb174': {
        'name': '2010 GB174',
        'name_de': '2010 GB174',
        'tno_type': 'extreme_tno',
        'color': '#74B9FF',
        'orbital_elements': {
            'semi_major_axis_au': 350.0,
            'eccentricity': 0.77,
            'inclination_deg': 21.5,
            'longitude_ascending_node_deg': 130.0,
            'argument_perihelion_deg': 125.0,
            'mean_anomaly_deg': 40.0,
            'orbital_period_days': 2390000,
            'perihelion_au': 80.0,
            'aphelion_au': 620.0,
            'mean_motion_deg_day': 0.00015
        },
        'physical_data': {
            'mass_kg': 2.5e19,
            'radius_km': 190,
            'surface_gravity_m_s2': 0.09,
            'escape_velocity_km_s': 0.18,
            'moons': 0
        },
        'description_de': '2010 GB174 hat eine extrem exzentrische Bahn und gehört zu den Objekten mit den weitesten Aphel-Distanzen.',
        'significance_de': 'Sein Argument des Perihels passt zum Muster der "Cluster"-Objekte, die Planet-9 stützen.',
        'discovery': {
            'date': '2010-04-05',
            'year': 2010,
            'discoverers': ['David Rabinowitz', 'Megan Schwamb'],
            'telescope': 'Palomar Observatory'
        }
    },
    
    '2015_kg163': {
        'name': '2015 KG163',
        'name_de': '2015 KG163',
        'tno_type': 'extreme_tno',
        'color': '#81ECEC',
        'orbital_elements': {
            'semi_major_axis_au': 420.0,
            'eccentricity': 0.72,
            'inclination_deg': 16.0,
            'longitude_ascending_node_deg': 120.0,
            'argument_perihelion_deg': 140.0,
            'mean_anomaly_deg': 50.0,
            'orbital_period_days': 3150000,
            'perihelion_au': 118.0,
            'aphelion_au': 722.0,
            'mean_motion_deg_day': 0.000114
        },
        'physical_data': {
            'mass_kg': 1.5e19,
            'radius_km': 150,
            'surface_gravity_m_s2': 0.07,
            'escape_velocity_km_s': 0.15,
            'moons': 0
        },
        'description_de': '2015 KG163 ist eines der am weitesten entfernten bekannten TNOs mit einem Aphel von über 700 AU.',
        'significance_de': 'Unterstützt die Theorie der orbitalen Konfinement durch einen entfernten Planeten.',
        'discovery': {
            'date': '2015-05-20',
            'year': 2015,
            'discoverers': ['Outer Solar System Origins Survey'],
            'telescope': 'Canada-France-Hawaii Telescope'
        }
    },
    
    # =========================================================================
    # DETACHED TNOs - Objects with no significant Neptune interaction
    # =========================================================================
    '2002_tc302': {
        'name': '2002 TC302',
        'name_de': '2002 TC302',
        'tno_type': 'detached',
        'color': '#FDCB6E',
        'orbital_elements': {
            'semi_major_axis_au': 83.0,
            'eccentricity': 0.30,
            'inclination_deg': 27.0,
            'longitude_ascending_node_deg': 97.0,
            'argument_perihelion_deg': 195.0,
            'mean_anomaly_deg': 120.0,
            'orbital_period_days': 219000,
            'perihelion_au': 58.1,
            'aphelion_au': 107.9,
            'mean_motion_deg_day': 0.00164
        },
        'physical_data': {
            'mass_kg': 1.2e20,
            'radius_km': 350,
            'surface_gravity_m_s2': 0.15,
            'escape_velocity_km_s': 0.3,
            'moons': 0
        },
        'description_de': '2002 TC302 ist ein großes gelöstes TNO mit einer stabilen Bahn, die nicht von Neptun beeinflusst wird.',
        'significance_de': 'Zeigt, dass nicht alle entfernten Objekte durch Planet-9 beeinflusst werden müssen.',
        'discovery': {
            'date': '2002-10-09',
            'year': 2002,
            'discoverers': ['NEAT Program'],
            'telescope': 'Palomar Observatory'
        }
    },
    
    '2004_sedna_minor': {
        'name': '2004 VN112',
        'name_de': '2004 VN112',
        'tno_type': 'detached',
        'color': '#E17055',
        'orbital_elements': {
            'semi_major_axis_au': 326.0,
            'eccentricity': 0.85,
            'inclination_deg': 25.5,
            'longitude_ascending_node_deg': 80.0,
            'argument_perihelion_deg': 27.0,
            'mean_anomaly_deg': 60.0,
            'orbital_period_days': 2140000,
            'perihelion_au': 47.0,
            'aphelion_au': 605.0,
            'mean_motion_deg_day': 0.000168
        },
        'physical_data': {
            'mass_kg': 1.0e19,
            'radius_km': 150,
            'surface_gravity_m_s2': 0.06,
            'escape_velocity_km_s': 0.14,
            'moons': 0
        },
        'description_de': '2004 VN112 ist ein sehr exzentrisches gelöstes Objekt mit einem Argument des Perihels, das zur Planet-9-Hypothese passt.',
        'significance_de': 'Gehört zur "Cluster"-Gruppe von TNOs mit ähnlichen Bahneigenschaften.',
        'discovery': {
            'date': '2004-11-06',
            'year': 2004,
            'discoverers': ['Deep Ecliptic Survey'],
            'telescope': 'Cerro Tololo'
        }
    },
    
    # =========================================================================
    # SCATTERED DISK OBJECTS
    # =========================================================================
    '2007_tg422': {
        'name': '2007 TG422',
        'name_de': '2007 TG422',
        'tno_type': 'scattered',
        'color': '#00B894',
        'orbital_elements': {
            'semi_major_axis_au': 485.0,
            'eccentricity': 0.82,
            'inclination_deg': 20.0,
            'longitude_ascending_node_deg': 110.0,
            'argument_perihelion_deg': 290.0,
            'mean_anomaly_deg': 15.0,
            'orbital_period_days': 3900000,
            'perihelion_au': 87.0,
            'aphelion_au': 883.0,
            'mean_motion_deg_day': 0.000092
        },
        'physical_data': {
            'mass_kg': 8.0e18,
            'radius_km': 120,
            'surface_gravity_m_s2': 0.05,
            'escape_velocity_km_s': 0.12,
            'moons': 0
        },
        'description_de': '2007 TG422 ist ein gestreutes Scheibenobjekt mit einer extrem exzentrischen Bahn.',
        'significance_de': 'Sein Aphel ist eines der größten bekannten und zeigt die Auswirkungen möglicher Störungen.',
        'discovery': {
            'date': '2007-10-14',
            'year': 2007,
            'discoverers': ['Andrew Becker', 'Andrew Puckett', 'Katherine Knecht'],
            'telescope': 'SDSS'
        }
    },
    
    '2013_rf98': {
        'name': '2013 RF98',
        'name_de': '2013 RF98',
        'tno_type': 'scattered',
        'color': '#00CEC9',
        'orbital_elements': {
            'semi_major_axis_au': 363.0,
            'eccentricity': 0.89,
            'inclination_deg': 29.6,
            'longitude_ascending_node_deg': 125.0,
            'argument_perihelion_deg': 316.0,
            'mean_anomaly_deg': 25.0,
            'orbital_period_days': 2520000,
            'perihelion_au': 40.0,
            'aphelion_au': 686.0,
            'mean_motion_deg_day': 0.000143
        },
        'physical_data': {
            'mass_kg': 5.0e18,
            'radius_km': 100,
            'surface_gravity_m_s2': 0.04,
            'escape_velocity_km_s': 0.1,
            'moons': 0
        },
        'description_de': '2013 RF98 hat eine der exzentrischsten Bahnen aller bekannten TNOs.',
        'significance_de': 'Gehört zur Gruppe der "anti-aligned" Objekte, die möglicherweise durch Planet-9 beeinflusst werden.',
        'discovery': {
            'date': '2013-09-12',
            'year': 2013,
            'discoverers': ['Scott Sheppard', 'Chad Trujillo'],
            'telescope': 'CTIO'
        }
    },
    
    # =========================================================================
    # CLASSICAL KUIPER BELT OBJECTS (for comparison)
    # =========================================================================
    'makemake_minor': {
        'name': '2005 RM43',
        'name_de': '2005 RM43',
        'tno_type': 'detached',
        'color': '#FAB1A0',
        'orbital_elements': {
            'semi_major_axis_au': 190.0,
            'eccentricity': 0.55,
            'inclination_deg': 29.0,
            'longitude_ascending_node_deg': 90.0,
            'argument_perihelion_deg': 45.0,
            'mean_anomaly_deg': 80.0,
            'orbital_period_days': 950000,
            'perihelion_au': 85.5,
            'aphelion_au': 294.5,
            'mean_motion_deg_day': 0.000379
        },
        'physical_data': {
            'mass_kg': 1.0e19,
            'radius_km': 160,
            'surface_gravity_m_s2': 0.06,
            'escape_velocity_km_s': 0.14,
            'moons': 0
        },
        'description_de': '2005 RM43 ist ein gelöstes TNO mit moderater Exzentrizität.',
        'significance_de': 'Zeigt die Vielfalt der Bahntypen im äußeren Sonnensystem.',
        'discovery': {
            'date': '2005-09-09',
            'year': 2005,
            'discoverers': ['Andrew Becker', 'Katherine Knecht'],
            'telescope': 'SDSS'
        }
    }
}

# =============================================================================
# PLANET-9 PREDICTION PARAMETERS (Batygin & Brown 2025)
# =============================================================================

PLANET_9_PREDICTION: Dict[str, Any] = {
    'name': 'Planet 9',
    'name_de': 'Planet 9',
    'hypothetical': True,
    'color': '#9B59B6',
    'orbital_elements': {
        # Conservative estimate based on Batygin & Brown 2025
        'semi_major_axis_au': 500.0,  # Range: 400-800 AU
        'eccentricity': 0.25,  # Range: 0.2-0.5
        'inclination_deg': 20.0,  # Range: 15-30°
        'longitude_ascending_node_deg': 120.0,  # Range: 100-150°
        'argument_perihelion_deg': 150.0,  # Range: 100-200°
        'mean_anomaly_deg': 0.0,  # Unknown - arbitrary reference
        'orbital_period_days': 4000000,  # ~11,000 years
        'perihelion_au': 375.0,
        'aphelion_au': 625.0,
        'mean_motion_deg_day': 0.00009
    },
    'physical_data': {
        'mass_kg': 4.0e25,  # 5-10 Earth masses
        'mass_earth_masses': 7.0,
        'radius_km': 20000,  # Estimated (Neptune-like)
        'surface_gravity_m_s2': 12.0,
        'escape_velocity_km_s': 25.0,
        'moons': 'Unknown'
    },
    'prediction_parameters': {
        'semi_major_axis_range_au': [400, 800],
        'eccentricity_range': [0.2, 0.5],
        'inclination_range_deg': [15, 30],
        'longitude_ascending_node_range_deg': [100, 150],
        'argument_perihelion_range_deg': [100, 200],
        'mass_range_earth_masses': [5, 10],
        'magnitude_estimate': 22,  # Very faint
        'search_zone_ra_hours': [1, 6],  # Approximate RA range
        'search_zone_dec_deg': [-20, 20],  # Approximate Dec range
        'constellation_candidates': ['Taurus', 'Orion', 'Gemini', 'Eridanus']
    },
    'description_de': 'Planet 9 ist ein hypothetischer Planet am Rande unseres Sonnensystems. Seine Existenz würde die seltsamen Bahnen vieler transneptischer Objekte erklären.',
    'theory_origin': 'Batygin & Brown, 2016',
    'latest_update': '2025',
    'confidence_level': 'Hoch (>90% Wahrscheinlichkeit)',
    'search_status': 'Aktive Suche mit Subaru, CTIO, und Vera C. Rubin Observatory'
}

# =============================================================================
# TNO DISCOVERY TIMELINE
# =============================================================================

TNO_DISCOVERIES: Dict[str, Any] = {
    'timeline': [
        {'year': 1992, 'object': '1992 QB1', 'significance': 'Erstes TNO nach Pluto entdeckt'},
        {'year': 2002, 'object': 'Quaoar', 'significance': 'Großes TNO, fast Zwergplanet-Status'},
        {'year': 2003, 'object': 'Sedna', 'significance': 'Erstes Sednoid, extrem sonnenfern'},
        {'year': 2004, 'object': 'Orcus', 'significance': 'Pluto-Antipode entdeckt'},
        {'year': 2005, 'object': 'Eris', 'significance': 'Führte zur Pluto-Reklassifizierung'},
        {'year': 2005, 'object': 'Makemake', 'significance': 'Dritter offizieller Zwergplanet'},
        {'year': 2005, 'object': 'Haumea', 'significance': 'Einzigartige elongierte Form'},
        {'year': 2007, 'object': 'Gonggong', 'significance': 'Großes rotes TNO'},
        {'year': 2012, 'object': '2012 VP113', 'significance': 'Zweites Sednoid bestätigt Muster'},
        {'year': 2013, 'object': '2013 FT28', 'significance': 'Unterstützt Planet-9-Theorie'},
        {'year': 2014, 'object': '2014 SR349', 'significance': 'Anti-aligned TNO entdeckt'},
        {'year': 2015, 'object': '2015 KG163', 'significance': 'Extrem aphelisches TNO'},
        {'year': 2023, 'object': '2023 KQ14', 'significance': 'Neuestes Sednoid "Ammonite"'}
    ],
    'statistics': {
        'total_known_tnos': 3000,
        'extreme_tnos_count': 20,
        'sednoids_count': 3,
        'dwarf_planets_count': 9,
        'planet9_supporting_objects': 11
    }
}

# =============================================================================
# BODY CATEGORIES AND COLORS
# =============================================================================

BODY_CATEGORIES: Dict[str, Dict[str, str]] = {
    'star': {'name': 'Stern', 'description_de': 'Die Sonne - das Zentrum unseres Sonnensystems'},
    'planet': {'name': 'Planet', 'description_de': 'Die 8 Hauptplaneten des Sonnensystems'},
    'dwarf_planet': {'name': 'Zwergplanet', 'description_de': 'Kleine kugelförmige Objekte wie Pluto und Ceres'},
    'tno': {'name': 'Transneptunisches Objekt', 'description_de': 'Objekte jenseits der Neptunbahn'},
    'sednoid': {'name': 'Sednoid', 'description_de': 'Extrem sonnenferne Objekte mit exzentrischen Bahnen'},
    'extreme_tno': {'name': 'Extreme TNO', 'description_de': 'TNOs mit sehr großen Bahnen (a > 150 AU)'},
    'detached': {'name': 'Gelöstes Objekt', 'description_de': 'Objekte ohne Neptun-Wechselwirkung'},
    'scattered': {'name': 'Gestreutes Objekt', 'description_de': 'Durch Neptun gestreute Objekte'}
}

BODY_COLORS: Dict[str, str] = {
    'sun': '#FFD700',
    'mercury': '#B5B5B5',
    'venus': '#E6C87A',
    'earth': '#6B93D6',
    'mars': '#C1440E',
    'jupiter': '#D8CA9D',
    'saturn': '#EAD6B8',
    'uranus': '#D1E7E7',
    'neptune': '#5B5DDF',
    'pluto': '#C9B8A5',
    'ceres': '#8B8682',
    'eris': '#E1E1E1',
    'makemake': '#D4A574',
    'haumea': '#B8C4C8',
    'gonggong': '#A0522D',
    'quaoar': '#8B7355',
    'orcus': '#7B6B5A',
    'salacia': '#6B8E9F',
    'sedna': '#FF6B6B',
    '2012_vp113': '#FF9F43',
    '2023_kq14': '#FFD93D',
    'planet9': '#9B59B6'
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_body_by_id(body_id: str) -> Dict[str, Any]:
    """
    Retrieve a celestial body by its ID.
    
    Args:
        body_id: The unique identifier of the body
        
    Returns:
        Dictionary with body data or empty dict if not found
    """
    body_id = body_id.lower().strip()
    
    if body_id in CELESTIAL_BODIES:
        return CELESTIAL_BODIES[body_id]
    if body_id in TNO_BODIES:
        return TNO_BODIES[body_id]
    if body_id == 'planet9':
        return PLANET_9_PREDICTION
    
    return {}


def get_all_body_ids() -> List[str]:
    """
    Get a list of all available body IDs.
    
    Returns:
        List of body IDs
    """
    return list(CELESTIAL_BODIES.keys()) + list(TNO_BODIES.keys()) + ['planet9']


def get_bodies_by_category(category: str) -> List[Dict[str, Any]]:
    """
    Get all bodies belonging to a specific category.
    
    Args:
        category: The category to filter by
        
    Returns:
        List of body dictionaries
    """
    bodies = []
    
    for body_id, body_data in CELESTIAL_BODIES.items():
        if body_data.get('category') == category:
            bodies.append({'id': body_id, **body_data})
    
    if category == 'tno':
        for body_id, body_data in TNO_BODIES.items():
            bodies.append({'id': body_id, 'category': 'tno', **body_data})
    
    return bodies


if __name__ == '__main__':
    # Print summary of available data
    print("Orbital Data Module Summary")
    print("=" * 50)
    print(f"Celestial Bodies: {len(CELESTIAL_BODIES)}")
    print(f"TNO Bodies: {len(TNO_BODIES)}")
    print(f"Planet-9 Prediction: Available")
    print(f"\nBody IDs: {get_all_body_ids()}")
