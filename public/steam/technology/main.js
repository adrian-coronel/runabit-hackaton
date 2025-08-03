// ===== CONFIGURACIÓN Y CONSTANTES =====
const cesiumToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyNmZmMDhhMy0wNTI1LTRhZjUtODdkNi1hYjdiMmYzMWZhNWMiLCJpZCI6MzAxMDM5LCJpYXQiOjE3NDY3OTk5MTl9.HOjPZnRwoypLqSTXmCYp2vn0ValjyKcrh3t3VHsKlbo';

// Elementos DOM
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');

// Variables principales
let viewer, camera, infoBox;

// Variables de gestos optimizadas
let currentZoomLevel = 1.0;
let targetZoomLevel = 1.0;
const maxZoomLevel = 10.0;
const minZoomLevel = 0.1;
let smoothedLatitude = 0;
let smoothedLongitude = 0;
let smoothedZoom = 1.0;
let lastIndexPos = null;
let lastHandDetectedTime = Date.now();

// Variables de hover optimizadas
let isHoveringCountry = false;
let lastHoveredEntity = null;
let hoverCooldown = 0;
const HOVER_COOLDOWN_MS = 100; // Reducir frecuencia de hover checking

// Límites de seguridad
const SAFE_LAT_MIN = -85;
const SAFE_LAT_MAX = 85;
const SAFE_LON_MIN = -180;
const SAFE_LON_MAX = 180;
const SAFE_HEIGHT_MIN = 1000000;
const SAFE_HEIGHT_MAX = 50000000;

// ===== OPTIMIZACIONES DE RENDIMIENTO =====

// Cache para datos de países
const countryDataCache = new Map();
const CACHE_DURATION = 300000; // 5 minutos

// Variables de rendimiento
let frameCount = 0;
let lastFpsUpdate = Date.now();
let renderTimes = [];
const MAX_RENDER_SAMPLES = 30;

// Throttling para operaciones costosas
let lastCameraUpdate = 0;
let lastHoverCheck = 0;
let lastFontUpdate = 0;
const CAMERA_UPDATE_INTERVAL = 16; // ~60fps
const HOVER_CHECK_INTERVAL = 50; // 20fps para hover
const FONT_UPDATE_INTERVAL = 200; // 5fps para fuentes

// Pool de objetos para evitar garbage collection
const objectPool = {
    positions: [],
    vectors: [],
    getPosition() {
        return this.positions.pop() || { x: 0, y: 0, z: 0 };
    },
    returnPosition(pos) {
        pos.x = pos.y = pos.z = 0;
        this.positions.push(pos);
    },
    getVector() {
        return this.vectors.pop() || { x: 0, y: 0 };
    },
    returnVector(vec) {
        vec.x = vec.y = 0;
        this.vectors.push(vec);
    }
};

// ===== FUNCIONES DE UTILIDAD OPTIMIZADAS =====

function safeValue(value, min, max, defaultValue = 0) {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        return defaultValue;
    }
    return Math.max(min, Math.min(max, value));
}

// Optimización: Suavizado más eficiente
const landmarkSmoothing = {
    alpha: 0.3,
    leftHand: null,
    rightHand: null
};

let smoothedPinchDistance = 0;
let smoothedIndexPosition = null;
let smoothedRightHandPosition = null;
let lastRightHandY = null;
const pinchSmoothing = 0.4;
const positionSmoothing = 0.25;

// Optimización: Gestión de fuentes más eficiente
const fontSizeCache = new Map();
const maxFontSize = 35;
const minFontSize = 1;
const minHeight = 200000;
const maxHeight = 20000000;

function getDynamicFontSize() {
    const now = Date.now();
    if (now - lastFontUpdate < FONT_UPDATE_INTERVAL) {
        return fontSizeCache.get('current') || `${minFontSize}px sans-serif`;
    }
    
    lastFontUpdate = now;
    const height = viewer.camera.positionCartographic.height;
    const t = Math.min(1, Math.max(0, (height - minHeight) / (maxHeight - minHeight)));
    const fontSize = minFontSize + (1 - t) * (maxFontSize - minFontSize);
    const fontString = `${fontSize.toFixed(1)}px sans-serif`;
    
    fontSizeCache.set('current', fontString);
    return fontString;
}

// Optimización: Proveedores de capas con configuración optimizada
const layerProviders = {
    terrain: () => new Cesium.UrlTemplateImageryProvider({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maximumLevel: 16, // Reducido de 18 para mejor rendimiento
        enablePickFeatures: false // Desactivar picking para mejor rendimiento
    }),
    dark: () => new Cesium.UrlTemplateImageryProvider({
        url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
        subdomains: 'abcd',
        maximumLevel: 16,
        enablePickFeatures: false
    }),
    streets: () => new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/',
        maximumLevel: 16,
        enablePickFeatures: false
    })
};

function switchLayer(layerType) {
    try {
        viewer.imageryLayers.removeAll();
        const provider = layerProviders[layerType]();
        viewer.imageryLayers.addImageryProvider(provider);
        
        document.querySelectorAll('.layer-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`input[value="${layerType}"]`).parentElement.classList.add('active');
        
        console.log(`Cambiado a capa ${layerType}`);
    } catch (error) {
        console.error(`Error cambiando a capa ${layerType}:`, error);
        if (layerType !== 'terrain') {
            switchLayer('terrain');
        }
    }
}

// Optimización: Suavizado más eficiente con early return
function smoothLandmarks(landmarks, previousSmoothed, alpha) {
    if (!Array.isArray(landmarks) || landmarks.length < 21) {
        return previousSmoothed || [];
    }

    if (!previousSmoothed) {
        return landmarks.map(lm => lm ? { ...lm } : objectPool.getPosition());
    }

    return landmarks.map((lm, i) => {
        if (!lm || !previousSmoothed[i]) {
            return lm ? { ...lm } : objectPool.getPosition();
        }
        
        const x = typeof lm.x === 'number' ? lm.x : (previousSmoothed[i].x || 0);
        const y = typeof lm.y === 'number' ? lm.y : (previousSmoothed[i].y || 0);
        const z = typeof lm.z === 'number' ? lm.z : (previousSmoothed[i].z || 0);
        
        const result = objectPool.getPosition();
        result.x = previousSmoothed[i].x * (1 - alpha) + x * alpha;
        result.y = previousSmoothed[i].y * (1 - alpha) + y * alpha;
        result.z = previousSmoothed[i].z * (1 - alpha) + z * alpha;
        
        return result;
    });
}

function updateCanvasSize() {
    if (canvasElement.width !== window.innerWidth || canvasElement.height !== window.innerHeight) {
        canvasElement.width = window.innerWidth;
        canvasElement.height = window.innerHeight;
    }
}

// ===== INICIALIZACIÓN OPTIMIZADA =====

async function initWebcam() {
    const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: 1280, 
            height: 720,
            frameRate: { ideal: 30, max: 30 } // Limitar framerate para mejor rendimiento
        } 
    });
    videoElement.srcObject = stream;
    return new Promise((resolve) => {
        videoElement.onloadedmetadata = () => {
            updateCanvasSize();
            resolve();
        };
    });
}

function initCesium() {
    Cesium.Ion.defaultAccessToken = cesiumToken;
    
    // Configuración optimizada de Cesium
    viewer = new Cesium.Viewer('cesiumContainer', {
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        animation: false,
        scene3DOnly: true,
        skyBox: false,
        skyAtmosphere: false,
        shouldAnimate: false, // Desactivar animaciones automáticas
        contextOptions: { 
            webgl: { 
                alpha: true,
                antialias: false, // Desactivar antialiasing para mejor rendimiento
                powerPreference: "high-performance"
            } 
        },
        // Optimizaciones adicionales
        requestRenderMode: true, // Solo renderizar cuando sea necesario
        maximumRenderTimeChange: Infinity
    });

    // Optimizaciones de escena
    viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT;
    viewer.scene.globe.enableLighting = false;
    viewer.scene.globe.baseColor = Cesium.Color.TRANSPARENT;
    viewer.scene.globe.showGroundAtmosphere = false;
    viewer.scene.globe.dynamicAtmosphereLighting = false;
    viewer.scene.fog.enabled = false;
    viewer.scene.fxaa = false; // Desactivar FXAA para mejor rendimiento

    camera = viewer.scene.camera;
    
    const initialHeight = 15000000;
    camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(0, 0, initialHeight),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-90), roll: 0 }
    });

    // Configuración de controles optimizada
    const controller = viewer.scene.screenSpaceCameraController;
    controller.enableRotate = true;
    controller.enableZoom = true;
    controller.enableTranslate = false;
    controller.enableTilt = false;
    controller.inertiaSpin = 0; // Desactivar inercia
    controller.inertiaTranslate = 0;
    controller.inertiaZoom = 0;

    infoBox = document.getElementById('infoBox');

    // Configurar eventos de capas
    document.querySelectorAll('input[name="layer"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            switchLayer(e.target.value);
        });
    });

    switchLayer('terrain');

    // Cargar límites de países con optimizaciones
    loadCountryBoundaries();

    // Optimización: Actualizar fuentes solo cuando sea necesario
    viewer.scene.postRender.addEventListener(() => {
        try {
            const now = Date.now();
            if (now - lastFontUpdate >= FONT_UPDATE_INTERVAL) {
                const font = getDynamicFontSize();
                viewer.entities.values.forEach(entity => {
                    if (entity.label && entity.label.font !== font) {
                        entity.label.font = font;
                    }
                });
            }
        } catch (error) {
            console.warn('Error actualizando fuentes:', error);
        }
    });

    // Manejo de errores mejorado
    viewer.scene.renderError.addEventListener(function(scene, error) {
        console.error('Error de renderizado Cesium:', error);
        resetToSafeState();
    });
}

// Optimización: Carga de límites de países más eficiente
async function loadCountryBoundaries() {
    try {
        const dataSource = await Cesium.GeoJsonDataSource.load(
            'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson',
            {
                stroke: Cesium.Color.YELLOW,
                fill: Cesium.Color.TRANSPARENT,
                strokeWidth: 1,
                clampToGround: true // Mejorar rendimiento
            }
        );
        
        viewer.dataSources.add(dataSource);

        // Procesar entidades de forma optimizada
        const entities = dataSource.entities.values;
        const batchSize = 50; // Procesar en lotes para no bloquear el hilo principal
        
        for (let i = 0; i < entities.length; i += batchSize) {
            const batch = entities.slice(i, i + batchSize);
            
            // Usar requestIdleCallback si está disponible
            if (window.requestIdleCallback) {
                window.requestIdleCallback(() => processBatch(batch));
            } else {
                setTimeout(() => processBatch(batch), 0);
            }
        }
        
    } catch (error) {
        console.warn('No se pudieron cargar los límites de países:', error);
    }
}

function processBatch(entities) {
    for (const entity of entities) {
        const name = entity.name || entity.properties?.NAME?.getValue() || 'Desconocido';

        if (!entity.polygon) continue;

        entity._originalStroke = Cesium.Color.YELLOW;
        entity._originalStrokeWidth = 1;
        entity._originalFill = Cesium.Color.TRANSPARENT;

        // Calcular centro de forma más eficiente
        const positions = entity.polygon.hierarchy.getValue(Cesium.JulianDate.now()).positions;
        let latSum = 0, lonSum = 0, count = 0;
        
        // Muestrear solo cada N posiciones para mejor rendimiento
        const sampleRate = Math.max(1, Math.floor(positions.length / 20));
        
        for (let i = 0; i < positions.length; i += sampleRate) {
            const cartographic = Cesium.Cartographic.fromCartesian(positions[i]);
            const lat = Cesium.Math.toDegrees(cartographic.latitude);
            const lon = Cesium.Math.toDegrees(cartographic.longitude);
            
            if (isFinite(lat) && isFinite(lon)) {
                latSum += lat;
                lonSum += lon;
                count++;
            }
        }

        if (count > 0) {
            const lat = safeValue(latSum / count, SAFE_LAT_MIN, SAFE_LAT_MAX);
            const lon = safeValue(lonSum / count, SAFE_LON_MIN, SAFE_LON_MAX);

            const labelEntity = viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(lon, lat),
                label: {
                    text: name,
                    font: getDynamicFontSize(),
                    fillColor: Cesium.Color.WHITE,
                    heightReference: Cesium.HeightReference.NONE,
                    outlineWidth: 0,
                    style: Cesium.LabelStyle.FILL,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY // Optimización de renderizado
                },
                _parentPolygon: entity 
            });

            entity._labelEntity = labelEntity;
        }
    }
}

// ===== FUNCIONES DE DETECCIÓN Y GESTIÓN OPTIMIZADAS =====

function calculateDistance(a, b) {
    if (!a || !b || typeof a.x !== 'number' || typeof a.y !== 'number' || 
        typeof b.x !== 'number' || typeof b.y !== 'number') {
        return 0;
    }
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Optimización: Dibujo de landmarks más eficiente
function drawLandmarks(landmarks, isLeft, isPinching = false, isHovering = false) {
    if (!Array.isArray(landmarks) || landmarks.length < 21) return;
    
    try {
        const importantLandmarks = [4, 8];
        
        for (const i of importantLandmarks) {
            const lm = landmarks[i];
            if (!lm) continue;
            
            let radius = 6;
            if (isPinching) {
                radius = 10;
            } else if (!isLeft && i === 8 && isHovering) {
                radius = 15;
            }
            
            const x = lm.x * canvasElement.width;
            const y = lm.y * canvasElement.height;
            
            canvasCtx.beginPath();
            canvasCtx.arc(x, y, radius, 0, 2 * Math.PI);
            
            if (isPinching) {
                canvasCtx.fillStyle = '#FF69B4';
                canvasCtx.fill();
            } else if (!isLeft && i === 8 && isHovering) {
                canvasCtx.fillStyle = '#FF69B4';
                canvasCtx.fill();
                canvasCtx.strokeStyle = '#000000';
                canvasCtx.lineWidth = 3;
                canvasCtx.stroke();
            } else {
                canvasCtx.fillStyle = '#FFFFFF';
                canvasCtx.fill();
                canvasCtx.strokeStyle = '#000000';
                canvasCtx.lineWidth = 1;
                canvasCtx.stroke();
            }
        }

        // Dibujar etiquetas
        const wrist = landmarks[0];
        if (wrist) {
            const labelY = wrist.y * canvasElement.height + 40;
            const labelX = wrist.x * canvasElement.width;
            
            canvasCtx.save();
            canvasCtx.translate(labelX, labelY);
            canvasCtx.scale(-1, 1);
            
            canvasCtx.font = '32px monospace';
            canvasCtx.fillStyle = '#FFFFFF';
            canvasCtx.strokeStyle = '#000000';
            canvasCtx.lineWidth = 3;
            canvasCtx.textAlign = 'center';
            
            const labelText = isLeft ? 'ROTAR ↻' : 'ZOOM ⭥';
            
            canvasCtx.strokeText(labelText, 0, 0);
            canvasCtx.fillText(labelText, 0, 0);
            
            canvasCtx.restore();
        }
        
    } catch (err) {
        console.warn('Error en drawLandmarks:', err);
    }
}

async function initMediaPipeHands() {
    const hands = new Hands({ 
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` 
    });
    
    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 0, // Usar modelo más simple para mejor rendimiento
        minDetectionConfidence: 0.5, // Aumentar threshold para mejor estabilidad
        minTrackingConfidence: 0.5,
    });
    
    await hands.initialize();
    return hands;
}

// Optimización: Actualización de cámara con throttling
function updateCameraPosition(lon, lat, zoom) {
    const now = Date.now();
    if (now - lastCameraUpdate < CAMERA_UPDATE_INTERVAL) {
        return true; // Skip update but return success
    }
    
    lastCameraUpdate = now;
    
    try {
        const safeLon = (typeof lon === 'number' && isFinite(lon)) ? lon : 0;
        const safeLat = safeValue(lat, SAFE_LAT_MIN, SAFE_LAT_MAX, 0);
        const safeZoom = safeValue(zoom, minZoomLevel, maxZoomLevel, 1.0);
        const safeHeight = safeValue(15000000 * safeZoom, SAFE_HEIGHT_MIN, SAFE_HEIGHT_MAX, 15000000);

        const destination = Cesium.Cartesian3.fromDegrees(safeLon, safeLat, safeHeight);
        
        if (!destination || !isFinite(destination.x) || !isFinite(destination.y) || !isFinite(destination.z)) {
            console.warn('Destino inválido, omitiendo actualización de cámara');
            return false;
        }

        camera.setView({
            destination: destination,
            orientation: {
                heading: 0,
                pitch: Cesium.Math.toRadians(-90),
                roll: 0
            }
        });
        
        // Forzar renderizado
        viewer.scene.requestRender();
        
        return true;
    } catch (error) {
        console.error('Error actualizando posición de cámara:', error);
        return false;
    }
}

// Optimización: Hover con throttling y cache
async function handleCountryHover(landmarks) {
    const now = Date.now();
    
    // Throttling para reducir frecuencia de checks
    if (now - lastHoverCheck < HOVER_CHECK_INTERVAL) {
        return;
    }
    lastHoverCheck = now;
    
    const infoBox = document.getElementById('infoBox');

    if (!landmarks || landmarks.length < 9) {
        clearHoverEffect();
        return;
    }

    const indexTip = landmarks[8];
    const screenPosition = new Cesium.Cartesian2(
        (1 - indexTip.x) * canvasElement.width, 
        indexTip.y * canvasElement.height
    );
    
    const pickedObject = viewer.scene.pick(screenPosition);

    let currentEntity = null;
    if (pickedObject && pickedObject.id) {
        if (pickedObject.id._parentPolygon) {
            currentEntity = pickedObject.id._parentPolygon;
        } else {
            currentEntity = pickedObject.id;
        }
    }

    if (currentEntity && currentEntity.polygon) {
        isHoveringCountry = true;
        
        if (currentEntity !== lastHoveredEntity) {
            clearHoverEffect();
            lastHoveredEntity = currentEntity;

            // Aplicar estilo de hover
            currentEntity.polygon.material = Cesium.Color.HOTPINK.withAlpha(0.3);
            currentEntity.polygon.outline = true;
            currentEntity.polygon.outlineColor = Cesium.Color.HOTPINK;
            currentEntity.polygon.outlineWidth = 3;
            
            const countryName = currentEntity.name || currentEntity.properties?.NAME?.getValue();

            if (countryName) {
                await fetchCountryData(countryName, infoBox);
            }
        }

    } else {
        isHoveringCountry = false;
        clearHoverEffect();
    }
}

function clearHoverEffect() {
    if (lastHoveredEntity && lastHoveredEntity.polygon) {
        lastHoveredEntity.polygon.material = lastHoveredEntity._originalFill;
        lastHoveredEntity.polygon.outline = true;
        lastHoveredEntity.polygon.outlineColor = lastHoveredEntity._originalStroke;
        lastHoveredEntity.polygon.outlineWidth = lastHoveredEntity._originalStrokeWidth;
    }
    lastHoveredEntity = null;
    document.getElementById('infoBox').style.display = 'none';
}

// Optimización: Cache de datos de países
async function fetchCountryData(countryName, infoBox) {
    const cacheKey = countryName.toLowerCase();
    const now = Date.now();
    
    // Verificar cache
    if (countryDataCache.has(cacheKey)) {
        const cached = countryDataCache.get(cacheKey);
        if (now - cached.timestamp < CACHE_DURATION) {
            infoBox.innerHTML = cached.data;
            infoBox.style.display = 'block';
            return;
        }
    }
    
    try {
        const response = await fetch(
            `https://restcountries.com/v3.1/name/${countryName}?fields=name,capital,population,currencies,region,flags`
        );
        const data = await response.json();
        
        if (data.length > 0) {
            const country = data[0];
            const currency = Object.values(country.currencies)[0];
            const html = `
                <img src="${country.flags.svg}" alt="Bandera de ${country.name.common}" style="width:100px;border: 2px solid #000;">
                <br><strong>${country.name.common}</strong>
                <br>Capital: ${country.capital[0]}
                <br>Población: ${country.population.toLocaleString()}
                <br>Moneda: ${currency.name} (${currency.symbol})
                <br>Región: ${country.region}
            `;
            
            // Guardar en cache
            countryDataCache.set(cacheKey, {
                data: html,
                timestamp: now
            });
            
            infoBox.innerHTML = html;
            infoBox.style.display = 'block';
        }
    } catch (error) {
        console.error('Error obteniendo datos del país:', error);
        const fallbackHtml = `<strong>${countryName}</strong><br>No se pudieron obtener datos.`;
        infoBox.innerHTML = fallbackHtml;
        infoBox.style.display = 'block';
    }
}

// ===== FUNCIÓN PRINCIPAL DE RESULTADOS OPTIMIZADA =====

function onResults(results) {
    const startTime = performance.now();
    
    try {
        canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
        updateCanvasSize();

        const now = Date.now();
        let rightDetected = false;
        let leftDetected = false;

        if (!results || !results.multiHandLandmarks || !Array.isArray(results.multiHandLandmarks)) {
            return;
        }

        if (results.multiHandLandmarks.length > 0) {
            lastHandDetectedTime = now;

            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                try {
                    const rawLandmarks = results.multiHandLandmarks[i];
                    
                    if (!Array.isArray(rawLandmarks) || rawLandmarks.length < 21) {
                        continue;
                    }

                    if (!results.multiHandedness || !results.multiHandedness[i] || !results.multiHandedness[i].label) {
                        continue;
                    }

                    const isLeft = results.multiHandedness[i].label === 'Left';

                    // Suavizado optimizado
                    let smoothedLandmarks;
                    if (isLeft) {
                        landmarkSmoothing.leftHand = smoothLandmarks(
                            rawLandmarks, 
                            landmarkSmoothing.leftHand, 
                            landmarkSmoothing.alpha
                        );
                        smoothedLandmarks = landmarkSmoothing.leftHand;
                    } else {
                        landmarkSmoothing.rightHand = smoothLandmarks(
                            rawLandmarks, 
                            landmarkSmoothing.rightHand, 
                            landmarkSmoothing.alpha
                        );
                        smoothedLandmarks = landmarkSmoothing.rightHand;
                    }

                    if (!smoothedLandmarks || smoothedLandmarks.length < 21) {
                        continue;
                    }

                    let isPinching = false;

                    // Procesamiento específico por mano
                    if (!isLeft) {
                        // Mano derecha - Zoom
                        const thumb = smoothedLandmarks[4];
                        const index = smoothedLandmarks[8];
                        
                        if (thumb && index) {
                            const rawPinch = calculateDistance(thumb, index);
                            smoothedPinchDistance = smoothedPinchDistance * (1 - pinchSmoothing) + rawPinch * pinchSmoothing;
                            
                            if (smoothedPinchDistance < 0.08) {
                                isPinching = true;
                                const indexTip = smoothedLandmarks[8];
                                
                                if (indexTip && typeof indexTip.x === 'number' && typeof indexTip.y === 'number') {
                                    if (!smoothedRightHandPosition) {
                                        smoothedRightHandPosition = objectPool.getVector();
                                        smoothedRightHandPosition.x = indexTip.x;
                                        smoothedRightHandPosition.y = indexTip.y;
                                    } else {
                                        smoothedRightHandPosition.x = smoothedRightHandPosition.x * (1 - positionSmoothing) + indexTip.x * positionSmoothing;
                                        smoothedRightHandPosition.y = smoothedRightHandPosition.y * (1 - positionSmoothing) + indexTip.y * positionSmoothing;
                                    }
                                    
                                    if (lastRightHandY !== null) {
                                        const deltaY = smoothedRightHandPosition.y - lastRightHandY;
                                        const zoomSpeed = 5.0;
                                        const newTargetZoom = targetZoomLevel + deltaY * zoomSpeed;
                                        targetZoomLevel = safeValue(newTargetZoom, minZoomLevel, maxZoomLevel, targetZoomLevel);
                                    }
                                    lastRightHandY = smoothedRightHandPosition.y;
                                    rightDetected = true;
                                }
                            } else {
                                lastRightHandY = null;
                                if (smoothedRightHandPosition) {
                                    objectPool.returnVector(smoothedRightHandPosition);
                                    smoothedRightHandPosition = null;
                                }
                            }
                        }

                        // Hover solo si es necesario
                        handleCountryHover(smoothedLandmarks);
                        
                    } else {
                        // Mano izquierda - Rotación
                        const indexTip = smoothedLandmarks[8];
                        const thumbTip = smoothedLandmarks[4];
                        
                        if (indexTip && thumbTip) {
                            const pinchDistance = calculateDistance(indexTip, thumbTip);

                            if (pinchDistance < 0.08) {
                                isPinching = true;
                                
                                if (typeof indexTip.x === 'number' && typeof indexTip.y === 'number') {
                                    if (!smoothedIndexPosition) {
                                        smoothedIndexPosition = objectPool.getVector();
                                        smoothedIndexPosition.x = indexTip.x;
                                        smoothedIndexPosition.y = indexTip.y;
                                    } else {
                                        smoothedIndexPosition.x = smoothedIndexPosition.x * (1 - positionSmoothing) + indexTip.x * positionSmoothing;
                                        smoothedIndexPosition.y = smoothedIndexPosition.y * (1 - positionSmoothing) + indexTip.y * positionSmoothing;
                                    }

                                    if (lastIndexPos) {
                                        const deltaX = smoothedIndexPosition.x - lastIndexPos.x;
                                        const deltaY = smoothedIndexPosition.y - lastIndexPos.y;
                                        
                                        if (typeof deltaX === 'number' && typeof deltaY === 'number' && 
                                            Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5 &&
                                            isFinite(deltaX) && isFinite(deltaY)) {
                                            
                                            const baseRotationSpeed = 240;
                                            const zoomFactor = Math.max(0.1, Math.min(2.0, smoothedZoom));
                                            const rotationSpeed = baseRotationSpeed * zoomFactor;
                                            
                                            const newLon = smoothedLongitude + deltaX * rotationSpeed;
                                            const newLat = smoothedLatitude + deltaY * (rotationSpeed * 0.5);
                                            
                                            smoothedLongitude = newLon;
                                            smoothedLatitude = safeValue(newLat, SAFE_LAT_MIN, SAFE_LAT_MAX, smoothedLatitude);
                                        }
                                    }
                                    
                                    if (!lastIndexPos) {
                                        lastIndexPos = objectPool.getVector();
                                    }
                                    lastIndexPos.x = smoothedIndexPosition.x;
                                    lastIndexPos.y = smoothedIndexPosition.y;
                                    leftDetected = true;
                                }
                            } else {
                                if (lastIndexPos) {
                                    objectPool.returnVector(lastIndexPos);
                                    lastIndexPos = null;
                                }
                                if (smoothedIndexPosition) {
                                    objectPool.returnVector(smoothedIndexPosition);
                                    smoothedIndexPosition = null;
                                }
                            }
                        }
                    }

                    // Dibujar landmarks
                    drawLandmarks(smoothedLandmarks, isLeft, isPinching, !isLeft && isHoveringCountry);
                    
                } catch (handError) {
                    console.warn(`Error procesando mano ${i}:`, handError);
                    continue;
                }
            }
        } else {
            // Limpiar cuando no hay manos detectadas
            resetHandTracking();
        }

        // Actualizar zoom
        if (now - lastHandDetectedTime < 500) {
            if (typeof targetZoomLevel === 'number' && isFinite(targetZoomLevel)) {
                const newZoom = currentZoomLevel + (targetZoomLevel - currentZoomLevel) * 0.1;
                currentZoomLevel = safeValue(newZoom, minZoomLevel, maxZoomLevel, currentZoomLevel);
                smoothedZoom = currentZoomLevel;
            }
        }

        // Actualizar posición de cámara
        if (typeof smoothedLongitude === 'number' && typeof smoothedLatitude === 'number' && 
            typeof smoothedZoom === 'number' && isFinite(smoothedLongitude) && 
            isFinite(smoothedLatitude) && isFinite(smoothedZoom)) {
            
            updateCameraPosition(smoothedLongitude, smoothedLatitude, smoothedZoom);
        }
        
    } catch (error) {
        console.error('Error en onResults:', error);
        resetToSafeState();
    }
    
    // Actualizar estadísticas de rendimiento
    updatePerformanceStats(startTime);
}

// ===== FUNCIONES DE UTILIDAD Y LIMPIEZA =====

function resetHandTracking() {
    landmarkSmoothing.leftHand = null;
    landmarkSmoothing.rightHand = null;
    
    if (smoothedIndexPosition) {
        objectPool.returnVector(smoothedIndexPosition);
        smoothedIndexPosition = null;
    }
    if (smoothedRightHandPosition) {
        objectPool.returnVector(smoothedRightHandPosition);
        smoothedRightHandPosition = null;
    }
    if (lastIndexPos) {
        objectPool.returnVector(lastIndexPos);
        lastIndexPos = null;
    }
    
    lastRightHandY = null;
    handleCountryHover(null);
}

function resetToSafeState() {
    resetHandTracking();
    
    smoothedLatitude = safeValue(smoothedLatitude, SAFE_LAT_MIN, SAFE_LAT_MAX, 0);
    smoothedLongitude = (typeof smoothedLongitude === 'number' && isFinite(smoothedLongitude)) ? smoothedLongitude : 0;
    smoothedZoom = safeValue(smoothedZoom, minZoomLevel, maxZoomLevel, 1.0);
    currentZoomLevel = smoothedZoom;
    targetZoomLevel = smoothedZoom;
    isHoveringCountry = false;
    
    if (camera) {
        updateCameraPosition(0, 0, 1.0);
    }
}

// ===== ESTADÍSTICAS DE RENDIMIENTO =====

function updatePerformanceStats(startTime) {
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    renderTimes.push(renderTime);
    if (renderTimes.length > MAX_RENDER_SAMPLES) {
        renderTimes.shift();
    }
    
    frameCount++;
    const now = Date.now();
    
    if (now - lastFpsUpdate >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
        const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
        
        document.getElementById('fps').textContent = fps;
        document.getElementById('render-time').textContent = avgRenderTime.toFixed(1);
        
        frameCount = 0;
        lastFpsUpdate = now;
    }
}

// ===== INICIALIZACIÓN PRINCIPAL =====

async function startApp() {
    try {
        console.log('Iniciando aplicación optimizada...');
        await initWebcam();
        console.log('Webcam inicializada');
        
        initCesium();
        console.log('Cesium inicializado');
        
        const hands = await initMediaPipeHands();
        console.log('MediaPipe Hands inicializado');
        
        hands.onResults(onResults);

        const cameraUtils = new Camera(videoElement, {
            onFrame: async () => {
                try {
                    await hands.send({ image: videoElement });
                } catch (error) {
                    console.warn('Error enviando frame a MediaPipe:', error);
                }
            },
            width: 1280, 
            height: 720
        });
        
        cameraUtils.start();
        console.log('Aplicación iniciada con éxito');
        
    } catch (error) {
        console.error('Error iniciando aplicación:', error);
        alert('Error al iniciar la aplicación. Por favor verifica los permisos de cámara y recarga la página.');
    }
}

// ===== MANEJO DE ERRORES GLOBALES =====

window.addEventListener('error', function(event) {
    console.error('Error global:', event.error);
    
    if (event.error && event.error.message && event.error.message.includes('Array')) {
        try {
            resetToSafeState();
        } catch (resetError) {
            console.error('Error al resetear después de error global:', resetError);
        }
    }
});

// Optimización: Limpiar cache periódicamente
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of countryDataCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            countryDataCache.delete(key);
        }
    }
}, 60000); // Limpiar cada minuto

// ===== INICIO DE LA APLICACIÓN =====

startApp();
