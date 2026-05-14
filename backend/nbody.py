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

try:
    from numba import njit
    HAS_NUMBA = True
except ImportError:
    HAS_NUMBA = False
    def njit(*args, **kwargs):
        # Pass-through Fallback wenn numba nicht installiert
        if len(args) == 1 and callable(args[0]):
            return args[0]
        def decorator(f):
            return f
        return decorator

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


@njit(cache=True, fastmath=True)
def _accelerations_jit(pos, gms, out):
    """In-place Beschleunigungs-Loop fuer Numba.

    Pure-loop-Variante; bei N<=12 deutlich schneller als die numpy-broadcast-
    Version weil keine 3D-Intermediates allokiert werden und JIT die Inner-
    Loop direkt nach Maschinencode kompiliert.
    """
    N = pos.shape[0]
    for i in range(N):
        out[i, 0] = 0.0
        out[i, 1] = 0.0
        out[i, 2] = 0.0
    for i in range(N):
        for j in range(N):
            if i == j:
                continue
            dx = pos[j, 0] - pos[i, 0]
            dy = pos[j, 1] - pos[i, 1]
            dz = pos[j, 2] - pos[i, 2]
            r2 = dx * dx + dy * dy + dz * dz + SOFTENING_AU2
            inv_r3 = r2 ** (-1.5)
            out[i, 0] += gms[j] * dx * inv_r3
            out[i, 1] += gms[j] * dy * inv_r3
            out[i, 2] += gms[j] * dz * inv_r3


@njit(cache=True, fastmath=True)
def _verlet_integrate_jit(pos, vel, gms, dt, n_steps, sample_every,
                          snap_pos, snap_vel, snap_days):
    """Kompletter Verlet-Loop in einem JIT-Kernel.

    Schreibt Snapshots in vorallokierte Arrays. Returns: tatsaechliche
    Snapshot-Anzahl (initial + sampled + finaler).
    """
    N = pos.shape[0]
    acc = np.zeros((N, 3))

    for i in range(N):
        snap_pos[0, i, 0] = pos[i, 0]
        snap_pos[0, i, 1] = pos[i, 1]
        snap_pos[0, i, 2] = pos[i, 2]
        snap_vel[0, i, 0] = vel[i, 0]
        snap_vel[0, i, 1] = vel[i, 1]
        snap_vel[0, i, 2] = vel[i, 2]
    snap_days[0] = 0.0
    snap_idx = 1
    elapsed = 0.0

    _accelerations_jit(pos, gms, acc)

    for step in range(n_steps):
        for i in range(N):
            vel[i, 0] += 0.5 * dt * acc[i, 0]
            vel[i, 1] += 0.5 * dt * acc[i, 1]
            vel[i, 2] += 0.5 * dt * acc[i, 2]
        for i in range(N):
            pos[i, 0] += dt * vel[i, 0]
            pos[i, 1] += dt * vel[i, 1]
            pos[i, 2] += dt * vel[i, 2]
        _accelerations_jit(pos, gms, acc)
        for i in range(N):
            vel[i, 0] += 0.5 * dt * acc[i, 0]
            vel[i, 1] += 0.5 * dt * acc[i, 1]
            vel[i, 2] += 0.5 * dt * acc[i, 2]

        elapsed += dt
        if (step + 1) % sample_every == 0 or step == n_steps - 1:
            for i in range(N):
                snap_pos[snap_idx, i, 0] = pos[i, 0]
                snap_pos[snap_idx, i, 1] = pos[i, 1]
                snap_pos[snap_idx, i, 2] = pos[i, 2]
                snap_vel[snap_idx, i, 0] = vel[i, 0]
                snap_vel[snap_idx, i, 1] = vel[i, 1]
                snap_vel[snap_idx, i, 2] = vel[i, 2]
            snap_days[snap_idx] = elapsed
            snap_idx += 1

    return snap_idx


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

    if integrator not in ('rk4', 'verlet'):
        raise ValueError(f"Unknown integrator: {integrator!r} (use rk4 or verlet)")

    n_steps = max(1, int(round(duration_days / step_days)))

    if integrator == 'verlet' and HAS_NUMBA:
        # Numba fast-path: kompletter 365k-step Loop in einem JIT-Kernel.
        # Bei N=8/100k Jahre ~5-10x schneller als der numpy-Pfad.
        pos = np.ascontiguousarray(state[:, :3].copy())
        vel = np.ascontiguousarray(state[:, 3:].copy())
        gms_c = np.ascontiguousarray(gms)
        n_samples_max = (n_steps // max(1, sample_every)) + 2
        snap_pos = np.zeros((n_samples_max, N, 3))
        snap_vel = np.zeros((n_samples_max, N, 3))
        snap_days = np.zeros(n_samples_max)
        actual = _verlet_integrate_jit(
            pos, vel, gms_c, float(step_days), int(n_steps), int(sample_every),
            snap_pos, snap_vel, snap_days,
        )
        days_at = snap_days[:actual].tolist()
        states = []
        for k in range(actual):
            s = np.empty((N, 6))
            s[:, :3] = snap_pos[k]
            s[:, 3:] = snap_vel[k]
            states.append(s)
    else:
        # Pure-Python Pfad (RK4 oder Verlet ohne Numba)
        step_fn = verlet_step if integrator == 'verlet' else rk4_step
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


def _warmup_numba():
    """JIT pre-compile beim Modul-Import (kein Cold-Start beim ersten User-Call).

    cache=True schreibt das kompilierte Modul ins __pycache__/. Erstes
    Container-Start nach --no-cache build kompiliert (3-5s), alle weiteren
    Worker-Starts laden sub-millisekunde aus dem Cache.
    """
    if not HAS_NUMBA:
        return
    pos = np.array([[0.0, 0.0, 0.0], [1.0, 0.0, 0.0]])
    vel = np.zeros((2, 3))
    gms_w = np.array([1.0, 0.1])
    sp = np.zeros((3, 2, 3))
    sv = np.zeros((3, 2, 3))
    sd = np.zeros(3)
    _verlet_integrate_jit(pos, vel, gms_w, 1.0, 1, 1, sp, sv, sd)


_warmup_numba()
