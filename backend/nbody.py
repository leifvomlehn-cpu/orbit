"""
N-Body Integration Module - Sprint A.1
=======================================

Echter N-Body-Integrator mit Runge-Kutta-4.

Im Gegensatz zu physics.py (ungestoerte Kepler-Bahnen) beruecksichtigt dieses
Modul die gegenseitigen gravitativen Wechselwirkungen aller Koerper.

Einheiten:
- Laengen in AU
- Zeit in Tagen
- Massen in Sonnenmassen (M_sun)
- Geschwindigkeiten in AU/Tag

GM_sun = 4*pi^2 / 365.25^2 = 2.959122e-4 AU^3/day^2
"""

import math
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any, Optional

import numpy as np

from physics import solve_kepler, calculate_true_anomaly, calculate_mean_anomaly


GM_SUN_AU3_PER_DAY2 = 2.959122082855911e-4
SUN_MASS_KG = 1.989e30
SOFTENING_AU2 = 1e-18  # squared, gegen Division durch 0


def kepler_state_vector(elements: Dict[str, float], dt: datetime) -> Tuple[np.ndarray, np.ndarray]:
    """Position + Geschwindigkeit aus Kepler-Bahnelementen am Zeitpunkt dt.

    Returns (pos, vel) als (3,)-numpy-arrays in AU bzw. AU/Tag.
    """
    a = elements.get('semi_major_axis_au', 1.0)
    e = elements.get('eccentricity', 0.0)
    i = math.radians(elements.get('inclination_deg', 0.0))
    omega = math.radians(elements.get('longitude_ascending_node_deg', 0.0))
    w = math.radians(elements.get('argument_perihelion_deg', 0.0))
    period = elements.get('orbital_period_days', 365.25)

    if a == 0:
        return np.zeros(3), np.zeros(3)

    M = calculate_mean_anomaly(elements, dt)
    E = solve_kepler(M, e)
    nu = calculate_true_anomaly(E, e)

    r = a * (1 - e * math.cos(E))
    x_pf = r * math.cos(nu)
    y_pf = r * math.sin(nu)

    # Geschwindigkeit im Perifokus-Frame
    n = 2 * math.pi / period
    E_dot = n / (1 - e * math.cos(E))
    vx_pf = -a * math.sin(E) * E_dot
    vy_pf = a * math.sqrt(1 - e * e) * math.cos(E) * E_dot

    cw, sw = math.cos(w), math.sin(w)
    co, so = math.cos(omega), math.sin(omega)
    ci, si = math.cos(i), math.sin(i)
    R = np.array([
        [co * cw - so * sw * ci, -co * sw - so * cw * ci, 0.0],
        [so * cw + co * sw * ci, -so * sw + co * cw * ci, 0.0],
        [sw * si,                  cw * si,                 0.0],
    ])
    return R @ np.array([x_pf, y_pf, 0.0]), R @ np.array([vx_pf, vy_pf, 0.0])


def accelerations(positions: np.ndarray, gms: np.ndarray) -> np.ndarray:
    """Vektorisierte O(N^2) Gravitations-Beschleunigung (Sprint A.3 Speedup).
    
    positions=(N,3), gms=(N,). 10-50x schneller als Python-Loop fuer N>4
    durch numpy-Broadcasting. Identisches Ergebnis (modulo FP-Reihenfolge).
    """
    # r_ij[i,j] = positions[j] - positions[i], shape (N, N, 3)
    r_ij = positions[None, :, :] - positions[:, None, :]
    # r^2 inkl. Softening, shape (N, N)
    r2 = np.sum(r_ij * r_ij, axis=2) + SOFTENING_AU2
    # Selbst-Interaktion ausblenden (Diagonale -> inf -> Beitrag 0)
    np.fill_diagonal(r2, np.inf)
    # 1/r^3 fuer jeden Paar, shape (N, N)
    inv_r3 = r2 ** (-1.5)
    # acc[i] = sum_j gms[j] * r_ij[i,j] * inv_r3[i,j]
    return np.sum(gms[None, :, None] * r_ij * inv_r3[:, :, None], axis=1)


def rk4_step(state: np.ndarray, gms: np.ndarray, dt: float) -> np.ndarray:
    """Ein RK4-Schritt. state=(N,6) mit [x,y,z,vx,vy,vz] pro Koerper."""
    def deriv(s):
        out = np.empty_like(s)
        out[:, :3] = s[:, 3:]
        out[:, 3:] = accelerations(s[:, :3], gms)
        return out
    k1 = deriv(state)
    k2 = deriv(state + 0.5 * dt * k1)
    k3 = deriv(state + 0.5 * dt * k2)
    k4 = deriv(state + dt * k3)
    return state + (dt / 6.0) * (k1 + 2 * k2 + 2 * k3 + k4)


def verlet_step(state: np.ndarray, gms: np.ndarray, dt: float) -> np.ndarray:
    """Velocity-Verlet (Leapfrog) - symplektischer 2nd-order Integrator.

    Bei langen Sims (>5000 Jahre) deutlich energie-stabiler als RK4, weil
    symplektisch: Gesamtenergie oszilliert beschraenkt statt linear zu driften.
    Pro Schritt nur 2 Beschleunigungs-Calls (RK4: 4) -> auch ~2x schneller.
    """
    pos = state[:, :3]
    vel = state[:, 3:]
    acc1 = accelerations(pos, gms)
    vel_half = vel + 0.5 * dt * acc1
    pos_new = pos + dt * vel_half
    acc2 = accelerations(pos_new, gms)
    vel_new = vel_half + 0.5 * dt * acc2
    out = np.empty_like(state)
    out[:, :3] = pos_new
    out[:, 3:] = vel_new
    return out


def total_energy(state: np.ndarray, gms: np.ndarray) -> float:
    """Gesamtenergie (kin + pot) - sollte ueber Integration konstant bleiben.

    E = 1/2 sum_i m_i v_i^2 - sum_{i<j} m_i m_j / r_ij
    (m_i sind hier die gms - Faktor G ist absorbiert)
    """
    pos, vel = state[:, :3], state[:, 3:]
    E = 0.5 * np.sum(gms * np.sum(vel ** 2, axis=1))
    N = state.shape[0]
    for i in range(N):
        for j in range(i + 1, N):
            E -= gms[i] * gms[j] / np.linalg.norm(pos[j] - pos[i])
    return float(E)


def total_angular_momentum(state: np.ndarray, gms: np.ndarray) -> np.ndarray:
    """L = sum_i m_i (r_i x v_i). Sollte konstant bleiben."""
    pos, vel = state[:, :3], state[:, 3:]
    L = np.zeros(3)
    for i in range(state.shape[0]):
        L += gms[i] * np.cross(pos[i], vel[i])
    return L


def simulate_nbody(
    bodies_data: List[Dict[str, Any]],
    start_time: datetime,
    end_time: Optional[datetime] = None,
    duration_days: Optional[float] = None,
    step_days: float = 1.0,
    sample_every: int = 1,
    integrator: str = 'rk4',
) -> Dict[str, Any]:
    """N-Body-Sim mit RK4. Dauer entweder via end_time ODER duration_days (Sprint A.3).
    
    duration_days hat Vorrang. Bei sehr langen Sims (>7000 Jahre) waere end_time
    ausserhalb von Python's datetime-Limit (year < 10000) - duration_days umgeht das.
    Bei diesen Faellen werden Timestamps als 'T+<tage>d'-Strings ausgegeben.
    """
    if duration_days is None:
        if end_time is None:
            raise ValueError("end_time oder duration_days muss angegeben sein")
        duration_days = (end_time - start_time).total_seconds() / 86400.0

    N = len(bodies_data)
    gms = np.array([
        (b['physical_data']['mass_kg'] / SUN_MASS_KG) * GM_SUN_AU3_PER_DAY2
        for b in bodies_data
    ])

    state = np.zeros((N, 6))
    for idx, body in enumerate(bodies_data):
        pos, vel = kepler_state_vector(body['orbital_elements'], start_time)
        state[idx, :3] = pos
        state[idx, 3:] = vel

    # Barycenter-Korrektur: total momentum = 0, COM = origin
    total_m = np.sum(gms)
    if total_m > 0:
        com_pos = (gms[:, None] * state[:, :3]).sum(axis=0) / total_m
        com_vel = (gms[:, None] * state[:, 3:]).sum(axis=0) / total_m
        state[:, :3] -= com_pos
        state[:, 3:] -= com_vel

    if integrator == 'verlet':
        step_fn = verlet_step
    elif integrator == 'rk4':
        step_fn = rk4_step
    else:
        raise ValueError(f"Unknown integrator: {integrator!r} (use rk4 or verlet)")

    n_steps = max(1, int(round(duration_days / step_days)))

    days_at: List[float] = [0.0]
    states: List[np.ndarray] = [state.copy()]
    elapsed = 0.0
    for step in range(n_steps):
        state = step_fn(state, gms, step_days)
        elapsed += step_days
        if (step + 1) % sample_every == 0 or step == n_steps - 1:
            days_at.append(elapsed)
            states.append(state.copy())

    def _fmt(days: float) -> str:
        # Overflow-Schutz: Python datetime kann max year 9999
        try:
            return (start_time + timedelta(days=days)).isoformat()
        except OverflowError:
            return f"T+{int(round(days))}d"

    return {
        'body_ids': [b['id'] for b in bodies_data],
        'timestamps': [_fmt(d) for d in days_at],
        'days_since_start': days_at,
        'positions': [s[:, :3].tolist() for s in states],
        'velocities': [s[:, 3:].tolist() for s in states],
        'energy': [total_energy(s, gms) for s in states],
        'angular_momentum': [total_angular_momentum(s, gms).tolist() for s in states],
        'metadata': {
            'step_days': step_days,
            'n_steps': n_steps,
            'n_samples': len(states),
            'n_bodies': N,
            'integrator': integrator.upper(),
            'frame': 'barycentric',
            'duration_days': duration_days,
        },
    }
