/**
 * Orbital Simulator - Frontend Application v9
 * FIXED: Zoom Controls in Bottom Bar, iPad Optimization
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    API_BASE: '/api',
    DEFAULT_SCALE: 15, // pixels per AU
    MIN_SCALE: 0.1,
    MAX_SCALE: 500,
    ZOOM_FACTOR: 1.2,
    ANIMATION_FPS: 60,
    STAR_COUNT: 200,
    ORBIT_OPACITY: 0.6,
    BODY_MIN_RADIUS: 3,
    BODY_MAX_RADIUS: 20,
    SUN_RADIUS: 25,
    CACHE_DURATION: 300000, // 5 minutes
    SPEED_MIN: 25,
    SPEED_MAX: 5000,
    SPEED_DEFAULT: 50,
    UI_IDLE_TIMEOUT: 5000, // 5 seconds
    COLORS: {
        background: '#0a0a1a',
        orbit: 'rgba(255, 255, 255, 0.3)',
        grid: 'rgba(255, 255, 255, 0.05)',
        text: '#ffffff',
        highlight: '#4a9eff'
    }
};

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

const AppState = {
    // Bodies data
    bodies: [],
    bodiesMap: {},
    orbitsCache: {},
    
    // View state
    scale: CONFIG.DEFAULT_SCALE,
    offsetX: 0,
    offsetY: 0,
    viewMode: '2d', // '2d' or '3d'
    rotation3D: { x: 0.6, y: 0.3 },
    
    // Selection
    selectedBody: null,
    hoveredBody: null,
    
    // Animation
    isPlaying: false,
    animationSpeed: CONFIG.SPEED_DEFAULT, // days per second
    currentDate: new Date(),
    animationFrameId: null,
    lastFrameTime: 0,
    
    // Planet-9 mode
    showPlanet9: false,
    planet9Data: null,
    
    // N-Body Comparison (Sprint A.2)
    showNbody: false,
    nbodyYears: 100,
    nbodyCache: {},
    nbodyLoading: false,
    nbodyDebounce: null,
    
    // UI state
    isLoading: true,
    sidebarOpen: false,
    filterCategory: 'all',
    searchQuery: '',
    
    // UI Idle State
    uiIdleTimer: null,
    
    // Stars background
    stars: [],
    
    // Mouse state
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    lastMousePos: { x: 0, y: 0 }
};

// =============================================================================
// DOM ELEMENTS
// =============================================================================

const DOM = {
    // Screens
    loadingScreen: null,
    app: null,
    
    // Canvases
    orbitCanvas: null,
    overlayCanvas: null,
    ctx: null,
    overlayCtx: null,
    canvasContainer: null,
    
    // Header
    currentDateEl: null,
    currentTimeEl: null,
    helpBtn: null,
    
    // Sidebar
    searchInput: null,
    bodyList: null,
    filterBtns: null,
    planet9Btn: null,
    
    // Controls
    zoomInBtn: null,
    zoomOutBtn: null,
    zoomResetBtn: null,
    view2DBtn: null,
    view3DBtn: null,
    scaleValue: null,
    
    // Time controls
    timePlayBtn: null,
    timeRewindBtn: null,
    timeForwardBtn: null,
    timeBackBtn: null,
    timeMonthBackBtn: null,
    timeMonthForwardBtn: null,
    speedSlider: null,
    speedValue: null,
    datePicker: null,
    todayBtn: null,
    
    // Info panel
    infoPanel: null,
    infoTitle: null,
    infoContent: null,
    infoClose: null,
    
    // Planet-9 panel
    planet9Panel: null,
    planet9Close: null,
    showPlanet9OrbitBtn: null,
    
    // Modal
    helpModal: null,
    
    // Tooltip
    tooltip: null
};

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize the application
 */
async function init() {
    console.log("%c 🚀 IQI HUB DEBUG: App v9 Initialisiert! Speed Max: " + CONFIG.SPEED_MAX, "color: lime; background: black; font-size: 16px; padding: 5px;");
    
    // Cache DOM elements FIRST
    cacheDOMElements();
    
    // NOW setup canvas (after DOM elements are cached)
    setupCanvas();
    
    // Generate stars background
    generateStars();
    
    // Load data from API
    await loadData();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initial render
    render();
    
    // Update time display
    updateTimeDisplay();
    
    // Init Slider UI explicitly
    if (DOM.speedSlider) {
        DOM.speedSlider.min = CONFIG.SPEED_MIN;
        DOM.speedSlider.max = CONFIG.SPEED_MAX;
        DOM.speedSlider.value = AppState.animationSpeed;
        if (DOM.speedValue) DOM.speedValue.textContent = `${AppState.animationSpeed} T/s`;
    }
    
    // Hide loading screen
    setTimeout(() => {
        if (DOM.loadingScreen) {
            DOM.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                if (DOM.loadingScreen) DOM.loadingScreen.style.display = 'none';
                if (DOM.app) DOM.app.classList.remove('hidden');
                AppState.isLoading = false;
                // Canvas had 0×0 while app was hidden – resize now
                AppState.offsetX = 0;
                AppState.offsetY = 0;
                resizeCanvas();
                
                // NO AUTO-START: User must click Play
            }, 500);
        }
    }, 1000);
    
    console.log('Orbital Simulator initialized!');
}

/**
 * Cache all DOM element references
 */
function cacheDOMElements() {
    DOM.loadingScreen = document.getElementById('loading-screen');
    DOM.app = document.getElementById('app');
    
    DOM.orbitCanvas = document.getElementById('orbit-canvas');
    DOM.overlayCanvas = document.getElementById('overlay-canvas');
    DOM.canvasContainer = document.getElementById('canvas-container');
    
    // Initialize canvas contexts AFTER elements are found
    if (DOM.orbitCanvas) {
        DOM.ctx = DOM.orbitCanvas.getContext('2d');
    }
    if (DOM.overlayCanvas) {
        DOM.overlayCtx = DOM.overlayCanvas.getContext('2d');
    }
    
    DOM.currentDateEl = document.getElementById('current-date');
    DOM.currentTimeEl = document.getElementById('current-time');
    DOM.helpBtn = document.getElementById('help-btn');
    
    DOM.searchInput = document.getElementById('search-input');
    DOM.bodyList = document.getElementById('body-list');
    DOM.filterBtns = document.querySelectorAll('.filter-btn');
    DOM.planet9Btn = document.getElementById('planet9-btn');
    
    DOM.zoomInBtn = document.getElementById('zoom-in');
    DOM.zoomOutBtn = document.getElementById('zoom-out');
    DOM.zoomResetBtn = document.getElementById('zoom-reset');
    DOM.view2DBtn = document.getElementById('view-2d');
    DOM.view3DBtn = document.getElementById('view-3d');
    DOM.scaleValue = document.getElementById('scale-value');
    
    DOM.timePlayBtn = document.getElementById('time-play');
    DOM.timeRewindBtn = document.getElementById('time-rewind');
    DOM.timeForwardBtn = document.getElementById('time-fast-forward');
    DOM.timeBackBtn = document.getElementById('time-back');
    DOM.timeMonthBackBtn = document.getElementById('time-month-back');
    DOM.timeMonthForwardBtn = document.getElementById('time-month-forward');
    DOM.speedSlider = document.getElementById('speed-slider');
    DOM.speedValue = document.getElementById('speed-value');
    DOM.datePicker = document.getElementById('date-picker');
    DOM.todayBtn = document.getElementById('today-btn');
    
    DOM.infoPanel = document.getElementById('info-panel');
    DOM.infoTitle = document.getElementById('info-title');
    DOM.infoContent = document.getElementById('info-content');
    DOM.infoClose = document.getElementById('info-close');
    
    DOM.planet9Panel = document.getElementById('planet9-panel');
    DOM.planet9Close = document.getElementById('planet9-close');
    DOM.showPlanet9OrbitBtn = document.getElementById('show-planet9-orbit');
    
    DOM.helpModal = document.getElementById('help-modal');
    
    // N-Body Comparison (Sprint A.2)
    DOM.nbodyToggle = document.getElementById('nbody-toggle');
    DOM.nbodyConfig = document.getElementById('nbody-config');
    DOM.nbodyYearsSlider = document.getElementById('nbody-years');
    DOM.nbodyYearsValue = document.getElementById('nbody-years-value');
    DOM.driftDisplay = document.getElementById('nbody-drift-display');
    DOM.driftValue = document.getElementById('drift-value');
    DOM.driftBody = document.getElementById('drift-body');
    DOM.tooltip = document.getElementById('tooltip');
}

/**
 * Set up canvas dimensions and context
 */
function setupCanvas() {
    if (!DOM.orbitCanvas || !DOM.canvasContainer) {
        console.error('Canvas or container not found!');
        return;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Set initial date picker value
    if (DOM.datePicker) {
        const today = new Date();
        DOM.datePicker.value = today.toISOString().split('T')[0];
    }
}

/**
 * Resize canvas to fit container
 */
function resizeCanvas() {
    if (!DOM.canvasContainer || !DOM.orbitCanvas || !DOM.overlayCanvas) return;
    
    const rect = DOM.canvasContainer.getBoundingClientRect();
    
    DOM.orbitCanvas.width = rect.width;
    DOM.orbitCanvas.height = rect.height;
    DOM.overlayCanvas.width = rect.width;
    DOM.overlayCanvas.height = rect.height;
    
    // Re-center view
    if (AppState.offsetX === 0 && AppState.offsetY === 0) {
        centerView();
    }
    
    render();
}

/**
 * Center the view on the Sun
 */
function centerView() {
    if (DOM.orbitCanvas) {
        AppState.offsetX = DOM.orbitCanvas.width / 2;
        AppState.offsetY = DOM.orbitCanvas.height / 2;
    }
}

/**
 * Generate random stars for background
 */
function generateStars() {
    AppState.stars = [];
    for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
        AppState.stars.push({
            x: Math.random(),
            y: Math.random(),
            size: Math.random() * 1.5 + 0.5,
            brightness: Math.random() * 0.5 + 0.5
        });
    }
}

// =============================================================================
// DATA LOADING
// =============================================================================

/**
 * Load all data from the API
 */
async function loadData() {
    try {
        // Load bodies
        const bodiesResponse = await fetch(`${CONFIG.API_BASE}/bodies?include_orbits=true`);
        const bodiesData = await bodiesResponse.json();
        
        AppState.bodies = bodiesData.bodies;
        AppState.bodiesMap = {};
        
        bodiesData.bodies.forEach(body => {
            AppState.bodiesMap[body.id] = body;
            // Cache orbit path
            if (body.orbit_path) {
                AppState.orbitsCache[body.id] = body.orbit_path;
            }
        });
        
        // Render body list
        renderBodyList();
        
        // Load Planet-9 data
        try {
            const p9Response = await fetch(`${CONFIG.API_BASE}/planet9/search`);
            AppState.planet9Data = await p9Response.json();
        } catch (e) {
            console.log('Planet-9 data not available');
        }
        
        console.log(`Loaded ${AppState.bodies.length} celestial bodies`);
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Daten konnten nicht geladen werden. Bitte prüfe die Verbindung zum Server.');
    }
}

/**
 * Fetch position for a specific body at a specific time
 */
async function fetchPosition(bodyId, timestamp) {
    const ts = timestamp.toISOString();
    try {
        const response = await fetch(`${CONFIG.API_BASE}/position/${bodyId}/${encodeURIComponent(ts)}`);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching position for ${bodyId}:`, error);
        return null;
    }
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Main render function
 */
function render() {
    if (!DOM.ctx || !DOM.orbitCanvas) return;
    
    const ctx = DOM.ctx;
    const width = DOM.orbitCanvas.width;
    const height = DOM.orbitCanvas.height;
    
    // Clear canvas
    ctx.fillStyle = CONFIG.COLORS.background;
    ctx.fillRect(0, 0, width, height);
    
    // Draw stars
    drawStars(ctx, width, height);
    
    // Draw grid
    drawGrid(ctx, width, height);
    
    // Draw orbits
    drawOrbits(ctx);
    
    // Draw N-Body comparison orbit if enabled (Sprint A.2)
    if (AppState.showNbody && AppState.selectedBody) {
        drawNbodyOrbit(ctx, AppState.selectedBody.id);
    }
    
    // Draw Planet-9 prediction zone if enabled
    if (AppState.showPlanet9) {
        drawPlanet9Zone(ctx);
    }
    
    // Draw bodies
    drawBodies(ctx);
    
    // Draw Sun
    drawSun(ctx);
    
    // Update scale indicator
    updateScaleIndicator();
}

/**
 * Draw background stars
 */
function drawStars(ctx, width, height) {
    AppState.stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(
            star.x * width,
            star.y * height,
            star.size,
            0,
            Math.PI * 2
        );
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.fill();
    });
}

/**
 * Draw coordinate grid
 */
function drawGrid(ctx, width, height) {
    const scale = AppState.scale;
    const offsetX = AppState.offsetX;
    const offsetY = AppState.offsetY;
    
    ctx.strokeStyle = CONFIG.COLORS.grid;
    ctx.lineWidth = 0.5;
    
    // Calculate grid spacing (show 1, 5, 10, 50, 100 AU intervals based on scale)
    let gridSpacing = 1; // AU
    if (scale < 2) gridSpacing = 100;
    else if (scale < 5) gridSpacing = 50;
    else if (scale < 20) gridSpacing = 10;
    else if (scale < 50) gridSpacing = 5;
    
    // Draw vertical lines
    const startX = Math.floor(-offsetX / scale / gridSpacing) * gridSpacing;
    const endX = Math.ceil((width - offsetX) / scale / gridSpacing) * gridSpacing;
    
    for (let x = startX; x <= endX; x += gridSpacing) {
        const screenX = offsetX + x * scale;
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, height);
        ctx.stroke();
        
        // Label
        if (x !== 0 && scale > 5) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '10px Arial';
            ctx.fillText(`${x} AU`, screenX + 2, offsetY - 5);
        }
    }
    
    // Draw horizontal lines
    const startY = Math.floor(-offsetY / scale / gridSpacing) * gridSpacing;
    const endY = Math.ceil((height - offsetY) / scale / gridSpacing) * gridSpacing;
    
    for (let y = startY; y <= endY; y += gridSpacing) {
        const screenY = offsetY + y * scale;
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(width, screenY);
        ctx.stroke();
        
        // Label
        if (y !== 0 && scale > 5) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '10px Arial';
            ctx.fillText(`${y} AU`, offsetX + 5, screenY - 2);
        }
    }
    
    // Draw axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(0, offsetY);
    ctx.lineTo(width, offsetY);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(offsetX, 0);
    ctx.lineTo(offsetX, height);
    ctx.stroke();
}

/**
 * Draw orbital paths for all bodies using Kepler orbital elements.
 */
function drawOrbits(ctx) {
    const scale = AppState.scale;
    const sunX = AppState.offsetX;
    const sunY = AppState.offsetY;

    const NUM_POINTS = 360;

    AppState.bodies.forEach(function(body) {
        if (body.id === 'sun') return;

        const el = body.orbital_elements;
        if (!el || !el.semi_major_axis_au || el.semi_major_axis_au === 0) return;

        const a = el.semi_major_axis_au;
        let   e = el.eccentricity || 0;
        if (e < 0 || e >= 1) e = Math.max(0, Math.min(0.99, e));

        const i     = (el.inclination_deg || 0) * Math.PI / 180;
        const omega = (el.longitude_ascending_node_deg || 0) * Math.PI / 180;
        const w     = (el.argument_perihelion_deg || 0) * Math.PI / 180;

        const cosW = Math.cos(w), sinW = Math.sin(w);
        const cosO = Math.cos(omega), sinO = Math.sin(omega);
        const cosI = Math.cos(i), sinI = Math.sin(i);

        ctx.beginPath();

        for (let k = 0; k <= NUM_POINTS; k++) {
            const nu = (k / NUM_POINTS) * 2 * Math.PI;
            const r  = a * (1 - e * e) / (1 + e * Math.cos(nu));

            const xOrb = r * Math.cos(nu);
            const yOrb = r * Math.sin(nu);

            let hx = (cosO * cosW - sinO * sinW * cosI) * xOrb +
                     (-cosO * sinW - sinO * cosW * cosI) * yOrb;
            let hy = (sinO * cosW + cosO * sinW * cosI) * xOrb +
                     (-sinO * sinW + cosO * cosW * cosI) * yOrb;
            let hz = (sinW * sinI) * xOrb + (cosW * sinI) * yOrb;

            if (AppState.viewMode === '3d') {
                const rot = rotate3D(hx, hy, hz);
                hx = rot.x; hy = rot.y; hz = rot.z;
            }

            const sx = sunX + hx * scale;
            const sy = sunY - hy * scale;

            if (k === 0) ctx.moveTo(sx, sy);
            else         ctx.lineTo(sx, sy);
        }

        ctx.closePath();

        ctx.strokeStyle = body.orbitColor || body.color || 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.globalAlpha = CONFIG.ORBIT_OPACITY || 0.6;

        if (AppState.selectedBody && AppState.selectedBody.id === body.id) {
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.9;
        }

        ctx.stroke();
        ctx.globalAlpha = 1;
    });
}

/**
 * Draw celestial bodies at their current positions
 */
function drawBodies(ctx) {
    const scale = AppState.scale;
    const offsetX = AppState.offsetX;
    const offsetY = AppState.offsetY;
    const date = AppState.currentDate;
    
    const sortedBodies = [...AppState.bodies].sort((a, b) => {
        const aDist = a.orbital_elements?.semi_major_axis_au || 0;
        const bDist = b.orbital_elements?.semi_major_axis_au || 0;
        return aDist - bDist;
    });
    
    sortedBodies.forEach(body => {
        if (body.id === 'sun') return;
        
        const position = calculateBodyPosition(body, date);
        if (!position) return;
        
        let x = offsetX + position.x * scale;
        let y = offsetY - position.y * scale;
        
        if (AppState.viewMode === '3d') {
            const rotated = rotate3D(position.x, position.y, position.z || 0);
            x = offsetX + rotated.x * scale;
            y = offsetY - rotated.y * scale;
        }
        
        let radius = calculateBodyRadius(body);
        
        if (AppState.selectedBody?.id === body.id) {
            ctx.beginPath();
            ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
            ctx.strokeStyle = CONFIG.COLORS.highlight;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = body.color;
        ctx.fill();
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
        gradient.addColorStop(0, body.color + 'cc');
        gradient.addColorStop(1, body.color + '00');
        ctx.beginPath();
        ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        if (radius > 5 || scale > 20) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(body.name_de || body.name, x, y + radius + 14);
        }
        
        body._screenX = x;
        body._screenY = y;
        body._screenRadius = radius;
    });
}

/**
 * Draw the Sun at the center
 */
function drawSun(ctx) {
    const x = AppState.offsetX;
    const y = AppState.offsetY;
    const radius = CONFIG.SUN_RADIUS;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 3);
    gradient.addColorStop(0, '#ffd700');
    gradient.addColorStop(0.3, '#ff8c00');
    gradient.addColorStop(0.6, 'rgba(255, 140, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 140, 0, 0)');
    
    ctx.beginPath();
    ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Sonne', x, y + radius + 16);
}

/**
 * Draw Planet-9 search zone
 */
function drawPlanet9Zone(ctx) {
    const scale = AppState.scale;
    const offsetX = AppState.offsetX;
    const offsetY = AppState.offsetY;
    const p9 = AppState.planet9Data?.planet9_prediction;
    
    if (!p9) return;
    
    const a = p9.orbital_elements.semi_major_axis_au;
    const e = p9.orbital_elements.eccentricity;
    
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(155, 89, 182, 0.5)';
    ctx.setLineDash([10, 5]);
    ctx.lineWidth = 2;
    
    for (let angle = 0; angle <= Math.PI * 2; angle += 0.05) {
        const r = a * (1 - e * e) / (1 + e * Math.cos(angle));
        const x = offsetX + r * Math.cos(angle) * scale;
        const y = offsetY - r * Math.sin(angle) * scale;
        
        if (angle === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    
    const p9Pos = calculateBodyPosition({ orbital_elements: p9.orbital_elements }, AppState.currentDate);
    if (p9Pos) {
        const x = offsetX + p9Pos.x * scale;
        const y = offsetY - p9Pos.y * scale;
        
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(155, 89, 182, 0.8)';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'rgba(155, 89, 182, 0.8)';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('?', x, y + 7);
        
        ctx.font = '12px Arial';
        ctx.fillText('Planet 9?', x, y + 45);
    }
}

/**
 * Calculate body position using Kepler elements
 */
function calculateBodyPosition(body, date) {
    const elements = body.orbital_elements;
    if (!elements || elements.semi_major_axis_au === 0) return null;
    
    const a = elements.semi_major_axis_au;
    const e = elements.eccentricity || 0;
    const i = (elements.inclination_deg || 0) * Math.PI / 180;
    const omega = (elements.longitude_ascending_node_deg || 0) * Math.PI / 180;
    const w = (elements.argument_perihelion_deg || 0) * Math.PI / 180;
    const period = elements.orbital_period_days || 365.25;
    const M0 = (elements.mean_anomaly_deg || 0) * Math.PI / 180;
    
    const J2000 = new Date('2000-01-01T12:00:00Z');
    const days = (date - J2000) / (1000 * 60 * 60 * 24);
    
    const n = (2 * Math.PI) / period;
    
    let M = M0 + n * days;
    
    while (M < 0) M += 2 * Math.PI;
    while (M > 2 * Math.PI) M -= 2 * Math.PI;
    
    let E = M;
    for (let iter = 0; iter < 50; iter++) {
        const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        E -= dE;
        if (Math.abs(dE) < 1e-10) break;
    }
    
    const nu = 2 * Math.atan2(
        Math.sqrt(1 + e) * Math.sin(E / 2),
        Math.sqrt(1 - e) * Math.cos(E / 2)
    );
    
    const r = a * (1 - e * Math.cos(E));
    
    const xOrb = r * Math.cos(nu);
    const yOrb = r * Math.sin(nu);
    
    const cosW = Math.cos(w);
    const sinW = Math.sin(w);
    const cosOmega = Math.cos(omega);
    const sinOmega = Math.sin(omega);
    const cosI = Math.cos(i);
    const sinI = Math.sin(i);
    
    const x = (cosOmega * cosW - sinOmega * sinW * cosI) * xOrb +
              (-cosOmega * sinW - sinOmega * cosW * cosI) * yOrb;
    const y = (sinOmega * cosW + cosOmega * sinW * cosI) * xOrb +
              (-sinOmega * sinW + cosOmega * cosW * cosI) * yOrb;
    const z = (sinW * sinI) * xOrb + (cosW * sinI) * yOrb;
    
    return { x, y, z, r };
}

/**
 * Calculate display radius for a body
 */
function calculateBodyRadius(body) {
    const category = body.category;
    let radius = CONFIG.BODY_MIN_RADIUS;
    
    if (category === 'planet') {
        radius = 8;
    } else if (category === 'dwarf_planet') {
        radius = 5;
    } else if (category === 'tno' || category === 'sednoid') {
        radius = 4;
    } else if (category === 'extreme_tno') {
        radius = 3;
    }
    
    const physicalRadius = body.physical_data?.radius_km || 1000;
    if (physicalRadius > 50000) radius = CONFIG.BODY_MAX_RADIUS;
    else if (physicalRadius > 10000) radius = 12;
    else if (physicalRadius > 5000) radius = 10;
    
    return Math.max(CONFIG.BODY_MIN_RADIUS, Math.min(CONFIG.BODY_MAX_RADIUS, radius));
}

/**
 * Rotate point for 3D view
 */
function rotate3D(x, y, z) {
    const rotX = AppState.rotation3D.x;
    const rotY = AppState.rotation3D.y;
    
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;
    
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;
    
    return { x: x1, y: y1, z: z2 };
}

/**
 * Update scale indicator
 */
function updateScaleIndicator() {
    if (DOM.scaleValue) {
        const scale = AppState.scale;
        DOM.scaleValue.textContent = `1 AU = ${scale.toFixed(1)} px`;
    }
}

// =============================================================================
// UI RENDERING
// =============================================================================

/**
 * Render the body list in sidebar
 */
function renderBodyList() {
    if (!DOM.bodyList) return;
    
    const list = DOM.bodyList;
    list.innerHTML = '';
    
    const filteredBodies = AppState.bodies.filter(body => {
        if (AppState.filterCategory !== 'all') {
            if (AppState.filterCategory === 'planets' && body.category !== 'planet') return false;
            if (AppState.filterCategory === 'dwarf_planets' && body.category !== 'dwarf_planet') return false;
            if (AppState.filterCategory === 'tnos' && body.category !== 'tno') return false;
            if (AppState.filterCategory === 'extreme' && body.category !== 'extreme_tno' && body.category !== 'sednoid') return false;
        }
        
        if (AppState.searchQuery) {
            const query = AppState.searchQuery.toLowerCase();
            const name = (body.name_de || body.name).toLowerCase();
            if (!name.includes(query)) return false;
        }
        
        return true;
    });
    
    filteredBodies.forEach(body => {
        const item = document.createElement('div');
        item.className = 'body-item';
        if (AppState.selectedBody?.id === body.id) {
            item.classList.add('selected');
        }
        
        const distance = body.orbital_elements?.semi_major_axis_au || 0;
        const distanceStr = distance < 1 ? `${(distance * 149.6).toFixed(0)} Mio km` : `${distance.toFixed(1)} AU`;
        
        item.innerHTML = `
            <div class="body-color" style="background-color: ${body.color}; color: ${body.color}"></div>
            <div class="body-info">
                <div class="body-name">${body.name_de || body.name}</div>
                <div class="body-distance">${distanceStr}</div>
            </div>
            <span class="body-category-tag">${getCategoryLabel(body.category)}</span>
        `;
        
        item.addEventListener('click', () => selectBody(body));
        item.addEventListener('dblclick', () => focusOnBody(body));
        
        list.appendChild(item);
    });
}

/**
 * Get German label for category
 */
function getCategoryLabel(category) {
    const labels = {
        'planet': 'Planet',
        'dwarf_planet': 'Zwerg',
        'tno': 'TNO',
        'sednoid': 'Sednoid',
        'extreme_tno': 'Extrem',
        'detached': 'Gelöst',
        'scattered': 'Gestreut'
    };
    return labels[category] || category;
}

/**
 * Show info panel for selected body
 */
function showInfoPanel(body) {
    if (!DOM.infoTitle || !DOM.infoContent || !DOM.infoPanel) return;
    
    DOM.infoTitle.textContent = body.name_de || body.name;
    
    const elements = body.orbital_elements || {};
    const physical = body.physical_data || {};
    const position = calculateBodyPosition(body, AppState.currentDate) || {};
    
    let html = `
        <div class="info-body">
            <div class="info-title-section">
                <div class="info-body-icon" style="background-color: ${body.color}; color: ${body.color}"></div>
                <div class="info-body-name">${body.name}</div>
                <div class="info-body-name-de">${body.name_de || body.name}</div>
            </div>
            
            <div class="info-section">
                <h3>📍 Aktuelle Position</h3>
                <div class="info-stats">
                    <div class="stat-box">
                        <span class="stat-label">Entfernung</span>
                        <span class="stat-value">${(position.r || 0).toFixed(2)} AU</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">X-Position</span>
                        <span class="stat-value">${(position.x || 0).toFixed(2)} AU</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Y-Position</span>
                        <span class="stat-value">${(position.y || 0).toFixed(2)} AU</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Z-Position</span>
                        <span class="stat-value">${(position.z || 0).toFixed(3)} AU</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h3>🔄 Bahndaten</h3>
                <div class="info-stats">
                    <div class="stat-box">
                        <span class="stat-label">Große Halbachse</span>
                        <span class="stat-value">${(elements.semi_major_axis_au || 0).toFixed(2)} AU</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Exzentrizität</span>
                        <span class="stat-value">${(elements.eccentricity || 0).toFixed(3)}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Inklination</span>
                        <span class="stat-value">${(elements.inclination_deg || 0).toFixed(1)}°</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Umlaufzeit</span>
                        <span class="stat-value">${formatOrbitalPeriod(elements.orbital_period_days)}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Perihel</span>
                        <span class="stat-value">${(elements.perihelion_au || 0).toFixed(1)} AU</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Aphel</span>
                        <span class="stat-value">${(elements.aphelion_au || 0).toFixed(1)} AU</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h3>⚖️ Physikalische Daten</h3>
                <div class="info-stats">
                    <div class="stat-box">
                        <span class="stat-label">Radius</span>
                        <span class="stat-value">${formatNumber(physical.radius_km)} km</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Masse</span>
                        <span class="stat-value">${formatMass(physical.mass_kg)}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Monde</span>
                        <span class="stat-value">${physical.moons || 0}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Schwerkraft</span>
                        <span class="stat-value">${(physical.surface_gravity_m_s2 || 0).toFixed(2)} m/s²</span>
                    </div>
                </div>
            </div>
    `;
    
    if (body.description_de) {
        html += `
            <div class="info-section">
                <h3>📖 Beschreibung</h3>
                <p class="info-description">${body.description_de}</p>
            </div>
        `;
    }
    
    if (body.fun_fact_de) {
        html += `
            <div class="info-section fun-fact">
                <h3>🌟 Wusstest du?</h3>
                <p>${body.fun_fact_de}</p>
            </div>
        `;
    }
    
    if (body.significance_de) {
        html += `
            <div class="info-section">
                <h3>🔬 Wissenschaftliche Bedeutung</h3>
                <p class="info-description">${body.significance_de}</p>
            </div>
        `;
    }
    
    html += '</div>';
    
    DOM.infoContent.innerHTML = html;
    DOM.infoPanel.classList.add('open');
}

/**
 * Format orbital period in human-readable form
 */
function formatOrbitalPeriod(days) {
    if (!days || days === 0) return '-';
    if (days < 365) return `${days.toFixed(0)} Tage`;
    const years = days / 365.25;
    if (years < 100) return `${years.toFixed(1)} Jahre`;
    return `${years.toFixed(0)} Jahre`;
}

/**
 * Format large numbers with thousand separators
 */
function formatNumber(num) {
    if (!num) return '-';
    return num.toLocaleString('de-DE');
}

/**
 * Format mass in readable form
 */
function formatMass(massKg) {
    if (!massKg) return '-';
    if (massKg >= 1e24) return `${(massKg / 5.972e24).toFixed(2)} Erdmassen`;
    if (massKg >= 1e22) return `${(massKg / 7.342e22).toFixed(1)} Monde`;
    return `${massKg.toExponential(2)} kg`;
}

/**
 * Update time display in header
 */
function updateTimeDisplay() {
    const date = AppState.currentDate;
    
    if (DOM.currentDateEl) {
        const month = date.toLocaleDateString('de-DE', { month: 'long' });
        const year = date.getFullYear();
        DOM.currentDateEl.textContent = `${month} ${year}`;
    }
    
    if (DOM.currentTimeEl) {
        DOM.currentTimeEl.style.display = 'none';
    }
}

/**
 * Show error message
 */
function showError(message) {
    console.error(message);
}

// =============================================================================
// BODY DETECTION AND SELECTION
// =============================================================================

/**
 * Find celestial body at canvas position
 */
function findBodyAtPosition(canvasX, canvasY) {
    if (!DOM.orbitCanvas) return null;
    
    for (let i = AppState.bodies.length - 1; i >= 0; i--) {
        const body = AppState.bodies[i];
        
        if (body._screenX === undefined || body._screenY === undefined) continue;
        
        const dx = canvasX - body._screenX;
        const dy = canvasY - body._screenY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= body._screenRadius + 5) {
            return body;
        }
    }
    
    const sunDx = canvasX - AppState.offsetX;
    const sunDy = canvasY - AppState.offsetY;
    if (Math.sqrt(sunDx * sunDx + sunDy * sunDy) <= CONFIG.SUN_RADIUS) {
        return AppState.bodiesMap['sun'] || null;
    }
    
    return null;
}

/**
 * Auto-focus camera on selected body with smooth transition
 */
function autoFocusOnBody(body) {
    if (!body || !DOM.orbitCanvas) return;
    
    const position = calculateBodyPosition(body, AppState.currentDate);
    if (!position) return;
    
    AppState.offsetX = DOM.orbitCanvas.width / 2 - position.x * AppState.scale;
    AppState.offsetY = DOM.orbitCanvas.height / 2 + position.y * AppState.scale;
    
    render();
}

/**
 * Select a body
 */
function selectBody(body) {
    AppState.selectedBody = body;
    renderBodyList();
    render();
    showInfoPanel(body);
    
    // N-Body: bei aktivem Vergleich Bahn fuer neuen Koerper laden (Sprint A.2)
    if (AppState.showNbody) {
        fetchAndDrawNbody(body.id, AppState.nbodyYears);
    }
}

/**
 * Focus view on a specific body
 */
function focusOnBody(body) {
    const position = calculateBodyPosition(body, AppState.currentDate);
    if (!position || !DOM.orbitCanvas) return;
    
    AppState.offsetX = DOM.orbitCanvas.width / 2 - position.x * AppState.scale;
    AppState.offsetY = DOM.orbitCanvas.height / 2 + position.y * AppState.scale;
    
    const targetScale = Math.min(100, Math.max(5, 200 / (body.orbital_elements?.semi_major_axis_au || 1)));
    AppState.scale = targetScale;
    
    selectBody(body);
    render();
}

// =============================================================================
// UI IDLE MANAGEMENT (AUTO-FADE) - BULLETPROOF
// =============================================================================

/**
 * Reset UI idle timer - called on any user interaction
 */
function resetUIIdleTimer() {
    clearTimeout(AppState.uiIdleTimer);
    
    // Show UI immediately
    if (DOM.app) {
        DOM.app.classList.remove('ui-idle');
        console.log('UI State changed to: VISIBLE');
    }
    
    // Only start timer if playing
    if (AppState.isPlaying) {
        AppState.uiIdleTimer = setTimeout(() => {
            if (DOM.app) {
                DOM.app.classList.add('ui-idle');
                console.log('UI State changed to: HIDDEN');
            }
        }, CONFIG.UI_IDLE_TIMEOUT);
    }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Set up all event listeners with null checks
 */
function setupEventListeners() {
    window.addEventListener('resize', () => {
        resizeCanvas();
        render();
    });
    
    if (DOM.orbitCanvas) {
        DOM.orbitCanvas.addEventListener('mousedown', handleMouseDown);
        DOM.orbitCanvas.addEventListener('mousemove', handleMouseMove);
        DOM.orbitCanvas.addEventListener('mouseup', handleMouseUp);
        DOM.orbitCanvas.addEventListener('mouseleave', handleMouseLeave);
        DOM.orbitCanvas.addEventListener('wheel', handleWheel, { passive: false });
        DOM.orbitCanvas.addEventListener('click', handleClick);
        DOM.orbitCanvas.addEventListener('dblclick', handleDoubleClick);
        
        DOM.orbitCanvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        DOM.orbitCanvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        DOM.orbitCanvas.addEventListener('touchend', handleTouchEnd);
    }
    
    if (DOM.zoomInBtn) DOM.zoomInBtn.addEventListener('click', () => zoom(CONFIG.ZOOM_FACTOR));
    if (DOM.zoomOutBtn) DOM.zoomOutBtn.addEventListener('click', () => zoom(1 / CONFIG.ZOOM_FACTOR));
    if (DOM.zoomResetBtn) DOM.zoomResetBtn.addEventListener('click', resetView);
    
    if (DOM.view2DBtn) DOM.view2DBtn.addEventListener('click', () => setViewMode('2d'));
    if (DOM.view3DBtn) DOM.view3DBtn.addEventListener('click', () => setViewMode('3d'));
    
    if (DOM.timePlayBtn) DOM.timePlayBtn.addEventListener('click', togglePlay);
    if (DOM.timeRewindBtn) DOM.timeRewindBtn.addEventListener('click', () => skipTime(-365));
    if (DOM.timeForwardBtn) DOM.timeForwardBtn.addEventListener('click', () => skipTime(365));
    if (DOM.timeBackBtn) DOM.timeBackBtn.addEventListener('click', () => skipTime(-30));
    if (DOM.timeMonthBackBtn) DOM.timeMonthBackBtn.addEventListener('click', () => skipTime(-30));
    if (DOM.timeMonthForwardBtn) DOM.timeMonthForwardBtn.addEventListener('click', () => skipTime(30));
    
    if (DOM.speedSlider) {
        DOM.speedSlider.addEventListener('input', handleSpeedChange);
        DOM.speedSlider.addEventListener('change', handleSpeedChange);
    }
    
    if (DOM.datePicker) DOM.datePicker.addEventListener('change', handleDateChange);
    if (DOM.todayBtn) DOM.todayBtn.addEventListener('click', goToToday);
    
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('open');
        });
    }
    
    if (DOM.orbitCanvas) {
        DOM.orbitCanvas.addEventListener('touchstart', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        }, { passive: true });
    }
    
    if (DOM.searchInput) DOM.searchInput.addEventListener('input', handleSearch);
    DOM.filterBtns.forEach(btn => {
        btn.addEventListener('click', handleFilterClick);
    });
    if (DOM.planet9Btn) DOM.planet9Btn.addEventListener('click', openPlanet9Panel);
    
    if (DOM.infoClose) DOM.infoClose.addEventListener('click', closeInfoPanel);
    
    if (DOM.planet9Close) DOM.planet9Close.addEventListener('click', closePlanet9Panel);
    if (DOM.showPlanet9OrbitBtn) DOM.showPlanet9OrbitBtn.addEventListener('click', togglePlanet9Orbit);
    
    if (DOM.helpBtn) DOM.helpBtn.addEventListener('click', openHelpModal);
    if (DOM.helpModal) {
        const closeBtn = DOM.helpModal.querySelector('.modal-close');
        if (closeBtn) closeBtn.addEventListener('click', closeHelpModal);
        DOM.helpModal.addEventListener('click', (e) => {
            if (e.target === DOM.helpModal) closeHelpModal();
        });
    }
    
    document.addEventListener('keydown', handleKeyDown);

    // Global listeners for UI Idle Timer
    window.addEventListener('mousemove', resetUIIdleTimer, { passive: true });
    window.addEventListener('touchstart', resetUIIdleTimer, { passive: true });
    window.addEventListener('keydown', resetUIIdleTimer, { passive: true });
    window.addEventListener('click', resetUIIdleTimer, { passive: true });
    
    // N-Body Comparison (Sprint A.2)
    if (DOM.nbodyToggle) {
        DOM.nbodyToggle.addEventListener('click', toggleNbody);
    }
    if (DOM.nbodyYearsSlider) {
        DOM.nbodyYearsSlider.addEventListener('input', handleNbodyYearsChange);
    }
}

/**
 * Handle mouse down for panning
 */
function handleMouseDown(e) {
    AppState.isDragging = true;
    AppState.dragStart = { x: e.clientX, y: e.clientY };
    if (DOM.orbitCanvas) DOM.orbitCanvas.style.cursor = 'grabbing';
}

/**
 * Handle mouse move for panning and hover
 */
function handleMouseMove(e) {
    if (!DOM.orbitCanvas) return;
    
    const rect = DOM.orbitCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (AppState.isDragging) {
        const dx = e.clientX - AppState.dragStart.x;
        const dy = e.clientY - AppState.dragStart.y;
        
        AppState.offsetX += dx;
        AppState.offsetY += dy;
        AppState.dragStart = { x: e.clientX, y: e.clientY };
        
        render();
    } else {
        checkBodyHover(x, y);
        DOM.orbitCanvas.style.cursor = AppState.hoveredBody ? 'pointer' : 'grab';
    }
    
    AppState.lastMousePos = { x, y };
}

/**
 * Handle mouse up
 */
function handleMouseUp() {
    AppState.isDragging = false;
    if (DOM.orbitCanvas) DOM.orbitCanvas.style.cursor = 'grab';
}

/**
 * Handle mouse leave
 */
function handleMouseLeave() {
    AppState.isDragging = false;
    AppState.hoveredBody = null;
    hideTooltip();
    if (DOM.orbitCanvas) DOM.orbitCanvas.style.cursor = 'grab';
}

/**
 * Handle mouse wheel for zooming
 */
function handleWheel(e) {
    e.preventDefault();
    
    if (!DOM.orbitCanvas) return;
    
    const factor = e.deltaY > 0 ? 1 / CONFIG.ZOOM_FACTOR : CONFIG.ZOOM_FACTOR;
    
    const rect = DOM.orbitCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const oldScale = AppState.scale;
    AppState.scale *= factor;
    AppState.scale = Math.max(CONFIG.MIN_SCALE, Math.min(CONFIG.MAX_SCALE, AppState.scale));
    
    const scaleRatio = AppState.scale / oldScale;
    AppState.offsetX = mouseX - (mouseX - AppState.offsetX) * scaleRatio;
    AppState.offsetY = mouseY - (mouseY - AppState.offsetY) * scaleRatio;
    
    render();
}

/**
 * Handle click on canvas
 */
function handleClick(e) {
    if (AppState.isDragging || !DOM.orbitCanvas) return;
    
    const rect = DOM.orbitCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const body = findBodyAtPosition(x, y);
    if (body) {
        selectBody(body);
    }
}

/**
 * Handle double click to focus on body
 */
function handleDoubleClick(e) {
    if (!DOM.orbitCanvas) return;
    
    const rect = DOM.orbitCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const body = findBodyAtPosition(x, y);
    if (body) {
        focusOnBody(body);
    }
}

/**
 * Handle touch start
 */
function handleTouchStart(e) {
    if (e.touches.length === 1) {
        AppState.isDragging = true;
        AppState._touchStartTime = Date.now();
        AppState._touchStartPos = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
        AppState.dragStart = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
    } else if (e.touches.length === 2) {
        AppState.isDragging = false;
        AppState._pinchStartDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        AppState._pinchStartScale = AppState.scale;
    }
}

/**
 * Handle touch move
 */
function handleTouchMove(e) {
    e.preventDefault();
    
    if (e.touches.length === 2 && AppState._pinchStartDist) {
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const ratio = dist / AppState._pinchStartDist;
        AppState.scale = Math.max(CONFIG.MIN_SCALE, Math.min(CONFIG.MAX_SCALE,
            AppState._pinchStartScale * ratio
        ));
        render();
    } else if (e.touches.length === 1 && AppState.isDragging) {
        const dx = e.touches[0].clientX - AppState.dragStart.x;
        const dy = e.touches[0].clientY - AppState.dragStart.y;
        
        AppState.offsetX += dx;
        AppState.offsetY += dy;
        AppState.dragStart = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
        
        render();
    }
}

/**
 * Handle touch end
 */
function handleTouchEnd(e) {
    if (AppState._touchStartTime && AppState._touchStartPos) {
        const dt = Date.now() - AppState._touchStartTime;
        if (dt < 300 && e.changedTouches.length === 1) {
            const dx = Math.abs(e.changedTouches[0].clientX - AppState._touchStartPos.x);
            const dy = Math.abs(e.changedTouches[0].clientY - AppState._touchStartPos.y);
            if (dx < 10 && dy < 10) {
                const rect = DOM.orbitCanvas.getBoundingClientRect();
                const x = e.changedTouches[0].clientX - rect.left;
                const y = e.changedTouches[0].clientY - rect.top;
                const body = findBodyAtPosition(x, y);
                if (body) {
                    selectBody(body);
                }
            }
        }
    }
    AppState.isDragging = false;
    AppState._pinchStartDist = null;
}

/**
 * Check if mouse is hovering over a body
 */
function checkBodyHover(x, y) {
    const body = findBodyAtPosition(x, y);
    
    if (body && AppState.hoveredBody !== body) {
        AppState.hoveredBody = body;
        showTooltip(body, x, y);
    } else if (!body && AppState.hoveredBody) {
        AppState.hoveredBody = null;
        hideTooltip();
    }
}

/**
 * Show tooltip for body
 */
function showTooltip(body, x, y) {
    if (!DOM.tooltip) return;
    
    const tooltip = DOM.tooltip;
    const nameEl = tooltip.querySelector('.tooltip-name');
    const infoEl = tooltip.querySelector('.tooltip-info');
    
    if (nameEl) nameEl.textContent = body.name_de || body.name;
    
    if (infoEl) {
        const distance = body.orbital_elements?.semi_major_axis_au || 0;
        infoEl.textContent = `${distance.toFixed(1)} AU von der Sonne`;
    }
    
    tooltip.style.left = `${x + 15}px`;
    tooltip.style.top = `${y + 15}px`;
    tooltip.classList.remove('hidden');
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    if (DOM.tooltip) DOM.tooltip.classList.add('hidden');
}

/**
 * Zoom the view
 */
function zoom(factor) {
    if (!DOM.orbitCanvas) return;
    
    const centerX = DOM.orbitCanvas.width / 2;
    const centerY = DOM.orbitCanvas.height / 2;
    
    const oldScale = AppState.scale;
    AppState.scale *= factor;
    AppState.scale = Math.max(CONFIG.MIN_SCALE, Math.min(CONFIG.MAX_SCALE, AppState.scale));
    
    const scaleRatio = AppState.scale / oldScale;
    AppState.offsetX = centerX - (centerX - AppState.offsetX) * scaleRatio;
    AppState.offsetY = centerY - (centerY - AppState.offsetY) * scaleRatio;
    
    render();
}

/**
 * Reset view to default
 */
function resetView() {
    AppState.scale = CONFIG.DEFAULT_SCALE;
    centerView();
    render();
}

/**
 * Set view mode (2D/3D)
 */
function setViewMode(mode) {
    AppState.viewMode = mode;
    
    if (DOM.view2DBtn) DOM.view2DBtn.classList.toggle('active', mode === '2d');
    if (DOM.view3DBtn) DOM.view3DBtn.classList.toggle('active', mode === '3d');
    
    render();
}

/**
 * Toggle animation play/pause
 */
function togglePlay() {
    AppState.isPlaying = !AppState.isPlaying;
    
    if (DOM.timePlayBtn) {
        DOM.timePlayBtn.textContent = AppState.isPlaying ? '⏸️' : '▶️';
        DOM.timePlayBtn.title = AppState.isPlaying ? 'Pause' : 'Abspielen';
    }
    
    if (AppState.isPlaying) {
        resetUIIdleTimer();
    } else {
        clearTimeout(AppState.uiIdleTimer);
        // Show UI when paused
        if (DOM.app) DOM.app.classList.remove('ui-idle');
    }
    
    if (AppState.isPlaying) {
        startAnimation();
    } else {
        stopAnimation();
    }
}

/**
 * Start animation loop
 */
function startAnimation() {
    AppState.lastFrameTime = performance.now();
    animate();
}

/**
 * Animation loop - updates planet positions over time
 */
function animate() {
    if (!AppState.isPlaying) return;
    
    const now = performance.now();
    const deltaTime = (now - AppState.lastFrameTime) / 1000; // seconds
    AppState.lastFrameTime = now;
    
    // Update date
    const daysToAdd = AppState.animationSpeed * deltaTime;
    AppState.currentDate = new Date(AppState.currentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    
    updateTimeDisplay();
    render();
    
    AppState.animationFrameId = requestAnimationFrame(animate);
}

/**
 * Stop animation loop
 */
function stopAnimation() {
    if (AppState.animationFrameId) {
        cancelAnimationFrame(AppState.animationFrameId);
        AppState.animationFrameId = null;
    }
}

/**
 * Skip time by days
 */
function skipTime(days) {
    AppState.currentDate = new Date(AppState.currentDate.getTime() + days * 24 * 60 * 60 * 1000);
    updateTimeDisplay();
    render();
}

/**
 * Handle speed slider change
 */
function handleSpeedChange(e) {
    AppState.animationSpeed = parseInt(e.target.value);
    if (DOM.speedValue) {
        DOM.speedValue.textContent = `${AppState.animationSpeed} T/s`;
    }
}

/**
 * Handle date picker change
 */
function handleDateChange(e) {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
        AppState.currentDate = newDate;
        updateTimeDisplay();
        render();
    }
}

/**
 * Go to today's date
 */
function goToToday() {
    AppState.currentDate = new Date();
    if (DOM.datePicker) {
        DOM.datePicker.value = AppState.currentDate.toISOString().split('T')[0];
    }
    updateTimeDisplay();
    render();
}

/**
 * Handle search input
 */
function handleSearch(e) {
    AppState.searchQuery = e.target.value;
    renderBodyList();
}

/**
 * Handle filter button click
 */
function handleFilterClick(e) {
    const btn = e.target;
    const category = btn.dataset.category;
    
    AppState.filterCategory = category;
    
    DOM.filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    renderBodyList();
}

/**
 * Open Planet 9 panel
 */
function openPlanet9Panel() {
    if (DOM.planet9Panel) {
        DOM.planet9Panel.classList.remove('hidden');
    }
}

/**
 * Close Planet 9 panel
 */
function closePlanet9Panel() {
    if (DOM.planet9Panel) {
        DOM.planet9Panel.classList.add('hidden');
    }
}

/**
 * Toggle Planet 9 orbit display
 */
function togglePlanet9Orbit() {
    AppState.showPlanet9 = !AppState.showPlanet9;
    if (DOM.showPlanet9OrbitBtn) {
        DOM.showPlanet9OrbitBtn.textContent = AppState.showPlanet9 ? '🪐 Verstecke Planet 9' : '🪐 Zeige Planet 9 Vorhersage-Orbit';
    }
    render();
}

/**
 * Close info panel
 */
function closeInfoPanel() {
    if (DOM.infoPanel) {
        DOM.infoPanel.classList.remove('open');
    }
}

/**
 * Open help modal
 */
function openHelpModal() {
    if (DOM.helpModal) {
        DOM.helpModal.classList.remove('hidden');
    }
}

/**
 * Close help modal
 */
function closeHelpModal() {
    if (DOM.helpModal) {
        DOM.helpModal.classList.add('hidden');
    }
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyDown(e) {
    if (e.target.tagName === 'INPUT') return;
    
    switch(e.key) {
        case ' ':
            e.preventDefault();
            togglePlay();
            break;
        case 'ArrowRight':
            skipTime(30);
            break;
        case 'ArrowLeft':
            skipTime(-30);
            break;
        case '+':
        case '=':
            zoom(CONFIG.ZOOM_FACTOR);
            break;
        case '-':
            zoom(1 / CONFIG.ZOOM_FACTOR);
            break;
        case 'r':
        case 'R':
            resetView();
            break;
        case 'Escape':
            closeInfoPanel();
            closePlanet9Panel();
            closeHelpModal();
            break;
    }
}

// Start the application
window.addEventListener('DOMContentLoaded', init);

// =============================================================================
// N-BODY COMPARISON MODE (Sprint A.2)
// =============================================================================

function toggleNbody() {
    AppState.showNbody = !AppState.showNbody;
    DOM.nbodyToggle.classList.toggle('active', AppState.showNbody);
    DOM.nbodyConfig.classList.toggle('hidden', !AppState.showNbody);
    
    if (AppState.showNbody && AppState.selectedBody) {
        fetchAndDrawNbody(AppState.selectedBody.id, AppState.nbodyYears);
    } else {
        DOM.driftDisplay.classList.add('hidden');
        render();
    }
}

function handleNbodyYearsChange(e) {
    AppState.nbodyYears = parseInt(e.target.value);
    DOM.nbodyYearsValue.textContent = AppState.nbodyYears;
    
    if (AppState.nbodyDebounce) clearTimeout(AppState.nbodyDebounce);
    AppState.nbodyDebounce = setTimeout(() => {
        if (AppState.showNbody && AppState.selectedBody) {
            fetchAndDrawNbody(AppState.selectedBody.id, AppState.nbodyYears);
        }
    }, 400);
}

async function fetchAndDrawNbody(bodyId, years) {
    const cacheKey = bodyId + '_' + years;
    
    if (AppState.nbodyCache[cacheKey]) {
        updateDriftDisplay(bodyId, years);
        render();
        return;
    }
    
    AppState.nbodyLoading = true;
    DOM.driftDisplay.classList.remove('hidden');
    DOM.driftValue.textContent = 'Lade...';
    const bodyName = AppState.bodiesMap[bodyId] ? AppState.bodiesMap[bodyId].name_de : bodyId;
    DOM.driftBody.textContent = bodyName + ' \u00b7 ' + years + ' Jahre';
    
    const start = new Date();
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + years);
    
    const totalDays = years * 365.25;
    let stepDays = Math.max(1, Math.round(totalDays / 4000));
    if (years > 500) stepDays = Math.max(stepDays, 5);
    const nSteps = Math.floor(totalDays / stepDays);
    const sampleEvery = Math.max(1, Math.floor(nSteps / 200));
    
    const bodies = ['sun', 'jupiter', 'saturn', 'uranus', 'neptune'];
    if (bodies.indexOf(bodyId) === -1) bodies.push(bodyId);
    
    try {
        const response = await fetch(CONFIG.API_BASE + '/simulate/nbody', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                bodies: bodies,
                start_time: start.toISOString().replace(/\.\d+Z$/, ''),
                end_time: end.toISOString().replace(/\.\d+Z$/, ''),
                step_days: stepDays,
                sample_every: sampleEvery,
            }),
        });
        
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        const sim = data.simulation;
        const bodyIdx = sim.body_ids.indexOf(bodyId);
        const sunIdx = sim.body_ids.indexOf('sun');
        
        const points = sim.positions.map(snapshot => {
            const b = snapshot[bodyIdx];
            const s = snapshot[sunIdx];
            return { x: b[0] - s[0], y: b[1] - s[1], z: b[2] - s[2] };
        });
        
        AppState.nbodyCache[cacheKey] = {
            years: years,
            points: points,
            timestamps: sim.timestamps,
            metadata: sim.metadata,
        };
        
        updateDriftDisplay(bodyId, years);
        render();
    } catch (err) {
        console.error('N-Body fetch failed:', err);
        DOM.driftValue.textContent = 'Fehler';
        DOM.driftBody.textContent = err.message;
    } finally {
        AppState.nbodyLoading = false;
    }
}

function updateDriftDisplay(bodyId, years) {
    const cache = AppState.nbodyCache[bodyId + '_' + years];
    if (!cache) return;
    
    const body = AppState.bodiesMap[bodyId];
    if (!body) return;
    
    const endDate = new Date(cache.timestamps[cache.timestamps.length - 1]);
    const keplerPos = calculateBodyPosition(body, endDate);
    if (!keplerPos) {
        DOM.driftValue.textContent = '--';
        return;
    }
    
    const nbodyPos = cache.points[cache.points.length - 1];
    const dx = keplerPos.x - nbodyPos.x;
    const dy = keplerPos.y - nbodyPos.y;
    const dz = keplerPos.z - nbodyPos.z;
    const drift = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    let display;
    if (drift < 0.001) {
        display = (drift * 149597870.7 / 1e6).toFixed(2) + ' Mio km';
    } else if (drift < 0.01) {
        display = drift.toFixed(5) + ' AU';
    } else {
        display = drift.toFixed(4) + ' AU';
    }
    
    DOM.driftValue.textContent = display;
    DOM.driftBody.textContent = body.name_de + ' \u00b7 ' + years + ' Jahre';
    DOM.driftDisplay.classList.remove('hidden');
}

function drawNbodyOrbit(ctx, bodyId) {
    const cache = AppState.nbodyCache[bodyId + '_' + AppState.nbodyYears];
    if (!cache) return;
    
    const body = AppState.bodiesMap[bodyId];
    if (!body) return;
    
    const scale = AppState.scale;
    const sunX = AppState.offsetX;
    const sunY = AppState.offsetY;
    
    ctx.strokeStyle = lightenColor(body.color, 0.4);
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 4]);
    ctx.globalAlpha = 0.85;
    
    ctx.beginPath();
    cache.points.forEach((p, i) => {
        let x = p.x, y = p.y, z = p.z;
        if (AppState.viewMode === '3d') {
            const r = rotate3D(x, y, z);
            x = r.x;
            y = r.y;
        }
        const sx = sunX + x * scale;
        const sy = sunY + y * scale;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1.0;
}

function lightenColor(hex, factor) {
    if (!hex || !hex.startsWith('#') || hex.length !== 7) return hex || '#ffffff';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const mix = (c) => Math.round(c + (255 - c) * factor);
    return 'rgb(' + mix(r) + ', ' + mix(g) + ', ' + mix(b) + ')';
}

