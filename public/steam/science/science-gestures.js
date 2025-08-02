// ========== SCIENCE GESTURES - Sistema de Detección de Gestos para Laboratorio ==========

export class ScienceGestures {
    constructor(videoElement, canvasElement) {
        this.videoElement = videoElement;
        this.canvasElement = canvasElement;
        this.canvasCtx = canvasElement.getContext('2d');
        
        // Estado de manos y gestos
        this.hands = null;
        this.camera = null;
        this.isActive = false;
        
        // Estado de gestos
        this.leftHand = null;
        this.rightHand = null;
        this.gestureState = {
            leftHand: false,
            rightHand: false,
            gestureDetected: false
        };
        
        // Sistema de pinch y arrastre
        this.pinchState = {
            isPinching: false,
            startPosition: null,
            currentPosition: null,
            selectedIngredient: null,
            threshold: 0.08 // Distancia mínima para pinch
        };
        
        // Cursor virtual para feedback visual
        this.virtualCursor = {
            position: { x: 0, y: 0 },
            visible: false,
            color: '#4CAF50',
            size: 15
        };
        
        // Callbacks para eventos de arrastre
        this.onIngredientSelect = null;
        this.onIngredientDrag = null;
        this.onIngredientDrop = null;
        this.onGestureStatusChange = null;
        
        // Sistema de suavizado para estabilizar gestos
        this.smoothing = {
            positions: [],
            maxHistory: 5
        };
    }
    
    async init() {
        try {
            console.log('🤲 Iniciando sistema de gestos...');
            
            // Inicializar webcam
            await this.initWebcam();
            
            // Configurar MediaPipe Hands
            await this.setupMediaPipeHands();
            
            // Configurar canvas
            this.updateCanvasSize();
            
            console.log('✅ Sistema de gestos inicializado');
            this.isActive = true;
            
        } catch (error) {
            console.error('❌ Error al inicializar gestos:', error);
            throw error;
        }
    }
    
    async initWebcam() {
        try {
            console.log('📹 Solicitando acceso a la webcam...');
            
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: "user",
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 }
                }
            });
            
            this.videoElement.srcObject = stream;
            
            return new Promise((resolve, reject) => {
                this.videoElement.onloadedmetadata = () => {
                    console.log('✅ Webcam inicializada correctamente');
                    console.log(`📐 Resolución: ${this.videoElement.videoWidth}x${this.videoElement.videoHeight}`);
                    resolve();
                };
                
                this.videoElement.onerror = (error) => {
                    console.error('❌ Error en el elemento de video:', error);
                    reject(error);
                };
                
                // Timeout para evitar esperas indefinidas
                setTimeout(() => {
                    reject(new Error('Timeout al cargar la webcam'));
                }, 10000);
            });
            
        } catch (error) {
            console.error('❌ Error al acceder a la webcam:', error);
            
            if (error.name === 'NotAllowedError') {
                throw new Error('Por favor, permite el acceso a la cámara para usar el laboratorio virtual.');
            } else if (error.name === 'NotFoundError') {
                throw new Error('No se encontró ninguna cámara conectada.');
            } else if (error.name === 'NotReadableError') {
                throw new Error('La cámara está siendo usada por otra aplicación.');
            } else {
                throw new Error(`Error de cámara: ${error.message}`);
            }
        }
    }
    
    async setupMediaPipeHands() {
        try {
            console.log('🤖 Configurando MediaPipe Hands...');
            
            // Verificar que MediaPipe esté disponible
            if (typeof Hands === 'undefined') {
                throw new Error('MediaPipe Hands no está disponible. Verifica la conexión a internet.');
            }
            
            // Inicializar MediaPipe Hands
            this.hands = new Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
            });
            
            // Configurar opciones de detección
            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5,
            });
            
            // Configurar callback de resultados
            this.hands.onResults((results) => {
                try {
                    this.processHandResults(results);
                } catch (error) {
                    console.error('❌ Error procesando resultados de manos:', error);
                }
            });
            
            // Verificar que Camera esté disponible
            if (typeof Camera === 'undefined') {
                throw new Error('MediaPipe Camera no está disponible. Verifica la conexión a internet.');
            }
            
            // Inicializar cámara de MediaPipe
            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.isActive && this.hands) {
                        try {
                            await this.hands.send({ image: this.videoElement });
                        } catch (error) {
                            console.error('❌ Error enviando frame a MediaPipe:', error);
                        }
                    }
                },
                width: 1280,
                height: 720
            });
            
            await this.camera.start();
            console.log('✅ MediaPipe Hands configurado correctamente');
            
        } catch (error) {
            console.error('❌ Error configurando MediaPipe:', error);
            throw error;
        }
    }
    
    processHandResults(results) {
        // Limpiar canvas
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        // Resetear estado
        this.leftHand = null;
        this.rightHand = null;
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // Procesar manos detectadas
            this.processDetectedHands(results);
            
            // Detectar gestos de pinch
            this.detectPinchGestures();
            
            // Dibujar landmarks y cursor virtual
            this.drawHandLandmarks(results.multiHandLandmarks);
            this.drawVirtualCursor();
            
        } else {
            // No hay manos detectadas
            this.handleNoHands();
        }
        
        // Actualizar estado de gestos
        this.updateGestureState();
    }
    
    processDetectedHands(results) {
        const hands = results.multiHandLandmarks;
        const handedness = results.multiHandedness;
        
        for (let i = 0; i < hands.length; i++) {
            const landmarks = hands[i];
            const label = handedness[i].label;
            
            // MediaPipe devuelve "Left" y "Right" desde la perspectiva de la imagen
            // pero queremos desde la perspectiva del usuario
            if (label === "Right") {
                this.leftHand = landmarks; // La mano derecha en la imagen es la izquierda del usuario
            } else {
                this.rightHand = landmarks; // La mano izquierda en la imagen es la derecha del usuario
            }
        }
    }
    
    detectPinchGestures() {
        // Detectar pinch con la mano derecha (principal para interacción)
        if (this.rightHand) {
            const isPinching = this.detectPinch(this.rightHand);
            const handPosition = this.getHandPosition(this.rightHand);
            
            if (isPinching && !this.pinchState.isPinching) {
                // Inicio de pinch
                this.startPinch(handPosition);
            } else if (isPinching && this.pinchState.isPinching) {
                // Continuar pinch (arrastre)
                this.continuePinch(handPosition);
            } else if (!isPinching && this.pinchState.isPinching) {
                // Fin de pinch (soltar)
                this.endPinch(handPosition);
            }
            
            // Actualizar cursor virtual
            this.virtualCursor.position = handPosition;
            this.virtualCursor.visible = true;
            this.virtualCursor.color = isPinching ? '#FF6B35' : '#4CAF50';
        } else {
            // No hay mano derecha, ocultar cursor
            this.virtualCursor.visible = false;
            if (this.pinchState.isPinching) {
                this.endPinch(null);
            }
        }
    }
    
    detectPinch(landmarks) {
        // Obtener posiciones de dedos clave para pinch
        const thumbTip = landmarks[4];      // Punta del pulgar
        const indexTip = landmarks[8];      // Punta del índice
        
        // Calcular distancia entre pulgar e índice
        const distance = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) + 
            Math.pow(thumbTip.y - indexTip.y, 2)
        );
        
        return distance < this.pinchState.threshold;
    }
    
    getHandPosition(landmarks) {
        // Usar posición del índice como referencia principal
        const indexTip = landmarks[8];
        
        // Convertir coordenadas normalizadas a píxeles
        const x = (1 - indexTip.x) * this.canvasElement.width; // Invertir X para efecto espejo
        const y = indexTip.y * this.canvasElement.height;
        
        // Aplicar suavizado
        return this.smoothPosition({ x, y });
    }
    
    smoothPosition(position) {
        this.smoothing.positions.push(position);
        
        if (this.smoothing.positions.length > this.smoothing.maxHistory) {
            this.smoothing.positions.shift();
        }
        
        // Promedio de posiciones para suavizar
        const avgX = this.smoothing.positions.reduce((sum, pos) => sum + pos.x, 0) / this.smoothing.positions.length;
        const avgY = this.smoothing.positions.reduce((sum, pos) => sum + pos.y, 0) / this.smoothing.positions.length;
        
        return { x: avgX, y: avgY };
    }
    
    startPinch(position) {
        this.pinchState.isPinching = true;
        this.pinchState.startPosition = position;
        this.pinchState.currentPosition = position;
        
        // Buscar ingrediente bajo el cursor
        const ingredient = this.getIngredientUnderPosition(position);
        
        if (ingredient) {
            this.pinchState.selectedIngredient = ingredient;
            
            // Callback de selección
            if (this.onIngredientSelect) {
                this.onIngredientSelect(ingredient);
            }
            
            console.log('🤏 Pinch iniciado en:', ingredient);
        }
    }
    
    continuePinch(position) {
        this.pinchState.currentPosition = position;
        
        if (this.pinchState.selectedIngredient) {
            // Callback de arrastre
            if (this.onIngredientDrag) {
                this.onIngredientDrag(this.pinchState.selectedIngredient, position);
            }
        }
    }
    
    endPinch(position) {
        if (this.pinchState.selectedIngredient && position) {
            // Callback de soltar
            if (this.onIngredientDrop) {
                this.onIngredientDrop(this.pinchState.selectedIngredient, position);
            }
            
            console.log('🤲 Pinch terminado:', this.pinchState.selectedIngredient);
        }
        
        // Resetear estado de pinch
        this.pinchState.isPinching = false;
        this.pinchState.startPosition = null;
        this.pinchState.currentPosition = null;
        this.pinchState.selectedIngredient = null;
    }
    
    getIngredientUnderPosition(position) {
        // Obtener todos los ingredientes
        const ingredientElements = document.querySelectorAll('.ingredient-bowl');
        
        for (const element of ingredientElements) {
            const rect = element.getBoundingClientRect();
            
            // Verificar si la posición está dentro del elemento
            if (position.x >= rect.left && 
                position.x <= rect.right && 
                position.y >= rect.top && 
                position.y <= rect.bottom) {
                
                return element.dataset.ingredient;
            }
        }
        
        return null;
    }
    
    handleNoHands() {
        this.virtualCursor.visible = false;
        
        if (this.pinchState.isPinching) {
            this.endPinch(null);
        }
    }
    
    updateGestureState() {
        const newState = {
            leftHand: this.leftHand !== null,
            rightHand: this.rightHand !== null,
            gestureDetected: this.pinchState.isPinching
        };
        
        // Solo notificar si hay cambios
        if (JSON.stringify(newState) !== JSON.stringify(this.gestureState)) {
            this.gestureState = newState;
            
            if (this.onGestureStatusChange) {
                this.onGestureStatusChange(this.gestureState);
            }
        }
    }
    
    drawHandLandmarks(handsLandmarks) {
        for (const landmarks of handsLandmarks) {
            // Dibujar conexiones de la mano
            this.drawHandConnections(landmarks);
            
            // Dibujar puntos de referencia
            this.drawLandmarkPoints(landmarks);
        }
    }
    
    drawHandConnections(landmarks) {
        const connections = [
            // Pulgar
            [0, 1], [1, 2], [2, 3], [3, 4],
            // Índice
            [0, 5], [5, 6], [6, 7], [7, 8],
            // Medio
            [0, 9], [9, 10], [10, 11], [11, 12],
            // Anular
            [0, 13], [13, 14], [14, 15], [15, 16],
            // Meñique
            [0, 17], [17, 18], [18, 19], [19, 20]
        ];
        
        this.canvasCtx.strokeStyle = 'rgba(76, 175, 80, 0.6)';
        this.canvasCtx.lineWidth = 2;
        
        connections.forEach(([startIdx, endIdx]) => {
            const start = landmarks[startIdx];
            const end = landmarks[endIdx];
            
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(
                (1 - start.x) * this.canvasElement.width,
                start.y * this.canvasElement.height
            );
            this.canvasCtx.lineTo(
                (1 - end.x) * this.canvasElement.width,
                end.y * this.canvasElement.height
            );
            this.canvasCtx.stroke();
        });
    }
    
    drawLandmarkPoints(landmarks) {
        // Puntos importantes (puntas de dedos)
        const importantPoints = [4, 8, 12, 16, 20]; // Puntas de todos los dedos
        
        landmarks.forEach((landmark, index) => {
            const x = (1 - landmark.x) * this.canvasElement.width;
            const y = landmark.y * this.canvasElement.height;
            
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(x, y, importantPoints.includes(index) ? 6 : 3, 0, 2 * Math.PI);
            this.canvasCtx.fillStyle = importantPoints.includes(index) ? '#FF6B35' : 'rgba(76, 175, 80, 0.8)';
            this.canvasCtx.fill();
            
            // Destacar pulgar e índice para pinch
            if (index === 4 || index === 8) {
                this.canvasCtx.strokeStyle = '#FFC107';
                this.canvasCtx.lineWidth = 2;
                this.canvasCtx.stroke();
            }
        });
    }
    
    drawVirtualCursor() {
        if (!this.virtualCursor.visible) return;
        
        const { x, y } = this.virtualCursor.position;
        const size = this.virtualCursor.size;
        
        // Cursor principal
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(x, y, size, 0, 2 * Math.PI);
        this.canvasCtx.fillStyle = this.virtualCursor.color + '80'; // Semi-transparente
        this.canvasCtx.fill();
        
        // Borde del cursor
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(x, y, size, 0, 2 * Math.PI);
        this.canvasCtx.strokeStyle = this.virtualCursor.color;
        this.canvasCtx.lineWidth = 3;
        this.canvasCtx.stroke();
        
        // Punto central
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(x, y, 3, 0, 2 * Math.PI);
        this.canvasCtx.fillStyle = this.virtualCursor.color;
        this.canvasCtx.fill();
        
        // Efecto de pinch
        if (this.pinchState.isPinching) {
            this.canvasCtx.beginPath();
            this.canvasCtx.arc(x, y, size + 5, 0, 2 * Math.PI);
            this.canvasCtx.strokeStyle = '#FF6B35';
            this.canvasCtx.lineWidth = 2;
            this.canvasCtx.setLineDash([5, 5]);
            this.canvasCtx.stroke();
            this.canvasCtx.setLineDash([]);
        }
    }
    
    updateCanvasSize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.canvasElement.width = width;
        this.canvasElement.height = height;
        
        // Asegurar que el canvas esté posicionado correctamente
        this.canvasElement.style.width = width + 'px';
        this.canvasElement.style.height = height + 'px';
        
        console.log(`📐 Canvas redimensionado: ${width}x${height}`);
    }
    
    // Métodos públicos para control
    pause() {
        this.isActive = false;
        console.log('⏸️ Sistema de gestos pausado');
    }
    
    resume() {
        this.isActive = true;
        console.log('▶️ Sistema de gestos reanudado');
    }
    
    destroy() {
        this.isActive = false;
        
        if (this.camera) {
            this.camera.stop();
        }
        
        if (this.videoElement.srcObject) {
            this.videoElement.srcObject.getTracks().forEach(track => track.stop());
        }
        
        console.log('🗑️ Sistema de gestos destruido');
    }
    
    // Configuración de callbacks
    setCallbacks(callbacks) {
        this.onIngredientSelect = callbacks.onIngredientSelect || null;
        this.onIngredientDrag = callbacks.onIngredientDrag || null;
        this.onIngredientDrop = callbacks.onIngredientDrop || null;
        this.onGestureStatusChange = callbacks.onGestureStatusChange || null;
    }
    
    // Ajustar sensibilidad del pinch
    setPinchSensitivity(threshold) {
        this.pinchState.threshold = Math.max(0.02, Math.min(0.15, threshold));
        console.log('🤏 Sensibilidad de pinch ajustada a:', this.pinchState.threshold);
    }
}
