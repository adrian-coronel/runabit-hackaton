// ========== ENGINEERING GESTURES - Sistema de Detección de Gestos para Ingeniería ==========

export class EngineeringGestures {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        
        // Estado de gestos
        this.isInitialized = false;
        this.handDetected = false;
        this.isPinching = false;
        this.isDragging = false;
        this.lastPinchTime = 0;
        this.pinchThreshold = 0.08;
        this.dragThreshold = 50; // píxeles
        
        // Posiciones y tracking
        this.currentHandPosition = { x: 0, y: 0 };
        this.lastHandPosition = { x: 0, y: 0 };
        this.pinchStartPosition = null;
        this.dragStartPosition = null;
        
        // Callbacks
        this.onComponentSelect = null;
        this.onComponentDrag = null;
        this.onComponentDrop = null;
        this.onGestureStatusChange = null;
        
        // Configuración de display
        this.mirrorMode = false; // Cambiar a true si se quiere efecto espejo
        
        // Smoothing y filtros
        this.positionHistory = [];
        this.smoothingFactor = 0.7;
        this.maxHistoryLength = 5;
        
        // Debounce para gestos
        this.gestureDebounce = 200; // ms
        this.lastGestureTime = 0;
    }
    
    async init() {
        try {
            console.log('👋 Inicializando detección de gestos para ingeniería...');
            
            // Obtener elementos DOM
            this.videoElement = document.getElementById('webcam');
            this.canvasElement = document.getElementById('gesture-canvas');
            
            if (!this.videoElement || !this.canvasElement) {
                throw new Error('Elementos de video o canvas no encontrados');
            }
            
            this.canvasCtx = this.canvasElement.getContext('2d');
            
            // Configurar MediaPipe Hands
            this.hands = new Hands({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });
            
            this.hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.5
            });
            
            // Configurar callback de resultados
            this.hands.onResults(this.onResults.bind(this));
            
            // Inicializar cámara
            await this.initCamera();
            
            // Configurar canvas
            this.setupCanvas();
            
            this.isInitialized = true;
            console.log('✅ Sistema de gestos inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando gestos:', error);
            throw error;
        }
    }
    
    async initCamera() {
        try {
            // Configurar cámara
            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.hands) {
                        await this.hands.send({ image: this.videoElement });
                    }
                },
                width: 640,
                height: 480
            });
            
            await this.camera.start();
            console.log('📹 Cámara iniciada correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando cámara:', error);
            throw error;
        }
    }
    
    setupCanvas() {
        // Configurar tamaño del canvas
        this.canvasElement.width = window.innerWidth;
        this.canvasElement.height = window.innerHeight;
        
        // Manejar redimensionamiento
        window.addEventListener('resize', () => {
            this.canvasElement.width = window.innerWidth;
            this.canvasElement.height = window.innerHeight;
        });
    }
    
    onResults(results) {
        if (!this.canvasCtx) return;
        
        // Limpiar canvas
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        
        // Verificar si hay manos detectadas
        const currentHandDetected = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
        
        if (currentHandDetected !== this.handDetected) {
            this.handDetected = currentHandDetected;
            this.notifyGestureStatusChange();
        }
        
        if (!this.handDetected) {
            // Si no hay mano, resetear estado
            this.resetGestureState();
            return;
        }
        
        // Procesar primera mano detectada
        const landmarks = results.multiHandLandmarks[0];
        
        // Obtener posiciones clave
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const middleFingerTip = landmarks[12];
        const wrist = landmarks[0];
        
        // Convertir a coordenadas de pantalla
        const screenWidth = this.canvasElement.width;
        const screenHeight = this.canvasElement.height;
        
        const thumbPos = {
            x: this.mirrorMode ? (1 - thumbTip.x) * screenWidth : thumbTip.x * screenWidth,
            y: thumbTip.y * screenHeight
        };
        
        const indexPos = {
            x: this.mirrorMode ? (1 - indexTip.x) * screenWidth : indexTip.x * screenWidth,
            y: indexTip.y * screenHeight
        };
        
        // Actualizar posición actual de la mano
        this.updateHandPosition(thumbPos, indexPos);
        
        // Detectar gesto de pinza
        this.detectPinchGesture(thumbPos, indexPos);
        
        // Manejar arrastre si está activo
        if (this.isDragging) {
            this.handleDrag();
        }
        
        // Dibujar visualizaciones
        this.drawHandVisualization(landmarks);
        this.drawGestureIndicators(thumbPos, indexPos);
    }
    
    updateHandPosition(thumbPos, indexPos) {
        // Calcular punto medio entre pulgar e índice
        const handCenter = {
            x: (thumbPos.x + indexPos.x) / 2,
            y: (thumbPos.y + indexPos.y) / 2
        };
        
        // Aplicar suavizado
        this.currentHandPosition = this.smoothPosition(handCenter);
        
        // Mantener historial de posiciones
        this.positionHistory.push(this.currentHandPosition);
        if (this.positionHistory.length > this.maxHistoryLength) {
            this.positionHistory.shift();
        }
    }
    
    smoothPosition(newPosition) {
        if (this.positionHistory.length === 0) {
            return newPosition;
        }
        
        const lastPosition = this.positionHistory[this.positionHistory.length - 1];
        
        return {
            x: lastPosition.x * this.smoothingFactor + newPosition.x * (1 - this.smoothingFactor),
            y: lastPosition.y * this.smoothingFactor + newPosition.y * (1 - this.smoothingFactor)
        };
    }
    
    detectPinchGesture(thumbPos, indexPos) {
        // Calcular distancia entre pulgar e índice
        const distance = Math.sqrt(
            Math.pow(thumbPos.x - indexPos.x, 2) + 
            Math.pow(thumbPos.y - indexPos.y, 2)
        );
        
        const normalizedDistance = distance / Math.min(this.canvasElement.width, this.canvasElement.height);
        const currentTime = Date.now();
        
        // Detectar inicio de pinza
        if (!this.isPinching && normalizedDistance < this.pinchThreshold) {
            if (currentTime - this.lastGestureTime > this.gestureDebounce) {
                this.startPinch();
                this.lastGestureTime = currentTime;
            }
        }
        // Detectar fin de pinza
        else if (this.isPinching && normalizedDistance > this.pinchThreshold * 1.5) {
            this.endPinch();
        }
    }
    
    startPinch() {
        this.isPinching = true;
        this.pinchStartPosition = { ...this.currentHandPosition };
        this.lastPinchTime = Date.now();
        
        console.log('🤏 Gesto de pinza iniciado');
        
        // Notificar selección de componente
        if (this.onComponentSelect) {
            this.onComponentSelect('selected', this.currentHandPosition);
        }
        
        this.notifyGestureStatusChange();
    }
    
    endPinch() {
        const wasClicking = this.isPinching;
        this.isPinching = false;
        
        console.log('✋ Gesto de pinza terminado');
        
        // Si estaba arrastrando, finalizar arrastre
        if (this.isDragging) {
            this.endDrag();
        }
        
        // Notificar drop si había selección
        if (wasClicking && this.onComponentDrop) {
            this.onComponentDrop(this.currentHandPosition);
        }
        
        this.notifyGestureStatusChange();
    }
    
    handleDrag() {
        if (!this.pinchStartPosition) return;
        
        // Calcular distancia desde el inicio de la pinza
        const dragDistance = Math.sqrt(
            Math.pow(this.currentHandPosition.x - this.pinchStartPosition.x, 2) +
            Math.pow(this.currentHandPosition.y - this.pinchStartPosition.y, 2)
        );
        
        // Iniciar arrastre si se supera el threshold
        if (!this.isDragging && dragDistance > this.dragThreshold) {
            this.startDrag();
        }
        
        // Continuar arrastre
        if (this.isDragging && this.onComponentDrag) {
            this.onComponentDrag(this.currentHandPosition);
        }
    }
    
    startDrag() {
        this.isDragging = true;
        this.dragStartPosition = { ...this.currentHandPosition };
        
        console.log('🖱️ Arrastre iniciado');
        this.notifyGestureStatusChange();
    }
    
    endDrag() {
        this.isDragging = false;
        console.log('🎯 Arrastre terminado');
        this.notifyGestureStatusChange();
    }
    
    resetGestureState() {
        const hadGestures = this.isPinching || this.isDragging;
        
        this.isPinching = false;
        this.isDragging = false;
        this.pinchStartPosition = null;
        this.dragStartPosition = null;
        
        if (hadGestures) {
            this.notifyGestureStatusChange();
        }
    }
    
    notifyGestureStatusChange() {
        if (this.onGestureStatusChange) {
            this.onGestureStatusChange({
                handDetected: this.handDetected,
                pinching: this.isPinching,
                dragging: this.isDragging,
                position: this.currentHandPosition
            });
        }
    }
    
    drawHandVisualization(landmarks) {
        if (!landmarks || !this.canvasCtx) return;
        
        const ctx = this.canvasCtx;
        const width = this.canvasElement.width;
        const height = this.canvasElement.height;
        
        // Configurar estilo
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.fillStyle = '#00FF00';
        
        // Dibujar conexiones de la mano
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4], // Pulgar
            [0, 5], [5, 6], [6, 7], [7, 8], // Índice
            [0, 9], [9, 10], [10, 11], [11, 12], // Medio
            [0, 13], [13, 14], [14, 15], [15, 16], // Anular
            [0, 17], [17, 18], [18, 19], [19, 20], // Meñique
            [5, 9], [9, 13], [13, 17] // Conexiones de la palma
        ];
        
        // Dibujar líneas
        ctx.beginPath();
        for (const [start, end] of connections) {
            const startPoint = landmarks[start];
            const endPoint = landmarks[end];
            
            ctx.moveTo(startPoint.x * width, startPoint.y * height);
            ctx.lineTo(endPoint.x * width, endPoint.y * height);
        }
        ctx.stroke();
        
        // Dibujar puntos clave
        for (let i = 0; i < landmarks.length; i++) {
            const landmark = landmarks[i];
            const x = landmark.x * width;
            const y = landmark.y * height;
            
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        // Destacar pulgar e índice
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(thumbTip.x * width, thumbTip.y * height, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#0000FF';
        ctx.beginPath();
        ctx.arc(indexTip.x * width, indexTip.y * height, 6, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    drawGestureIndicators(thumbPos, indexPos) {
        if (!this.canvasCtx) return;
        
        const ctx = this.canvasCtx;
        
        // Dibujar línea entre pulgar e índice
        ctx.strokeStyle = this.isPinching ? '#00FF00' : '#FFFF00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(thumbPos.x, thumbPos.y);
        ctx.lineTo(indexPos.x, indexPos.y);
        ctx.stroke();
        
        // Dibujar cursor virtual en posición de la mano
        const cursorSize = this.isPinching ? 15 : 10;
        const cursorColor = this.isPinching ? '#00FF00' : '#FFFFFF';
        
        ctx.strokeStyle = cursorColor;
        ctx.fillStyle = cursorColor;
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.arc(this.currentHandPosition.x, this.currentHandPosition.y, cursorSize, 0, 2 * Math.PI);
        ctx.stroke();
        
        if (this.isPinching) {
            ctx.beginPath();
            ctx.arc(this.currentHandPosition.x, this.currentHandPosition.y, cursorSize / 3, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        // Mostrar indicador de arrastre
        if (this.isDragging && this.pinchStartPosition) {
            ctx.strokeStyle = '#FF00FF';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            
            ctx.beginPath();
            ctx.moveTo(this.pinchStartPosition.x, this.pinchStartPosition.y);
            ctx.lineTo(this.currentHandPosition.x, this.currentHandPosition.y);
            ctx.stroke();
            
            ctx.setLineDash([]); // Resetear línea discontinua
        }
        
        // Mostrar información de debug
        this.drawDebugInfo();
    }
    
    drawDebugInfo() {
        if (!this.canvasCtx) return;
        
        const ctx = this.canvasCtx;
        const debugInfo = [
            `Mano: ${this.handDetected ? 'Detectada' : 'No detectada'}`,
            `Pinza: ${this.isPinching ? 'Activa' : 'Inactiva'}`,
            `Arrastre: ${this.isDragging ? 'Activo' : 'Inactivo'}`,
            `Pos: (${Math.round(this.currentHandPosition.x)}, ${Math.round(this.currentHandPosition.y)})`
        ];
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 200, debugInfo.length * 25 + 10);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px monospace';
        
        debugInfo.forEach((info, index) => {
            ctx.fillText(info, 20, 35 + index * 25);
        });
    }
    
    // ========== MÉTODOS PÚBLICOS ==========
    
    isHandDetected() {
        return this.handDetected;
    }
    
    isPinchActive() {
        return this.isPinching;
    }
    
    isDragActive() {
        return this.isDragging;
    }
    
    getCurrentPosition() {
        return { ...this.currentHandPosition };
    }
    
    cleanup() {
        if (this.camera) {
            this.camera.stop();
        }
        if (this.hands) {
            this.hands.close();
        }
        this.isInitialized = false;
        console.log('🧹 Sistema de gestos limpiado');
    }
}
