// ========== SCIENCE MAIN - Controlador Principal del Laboratorio Virtual ==========

import { ScienceExperiments } from './science-experiments.js';
import { ScienceGestures } from './science-gestures.js';
import { ScienceAnimations } from './science-animations.js';
import robotShapeIntegration from '../../robot/robotShapeIntegration.js';

class ScienceApp {
    constructor() {
        // Inicializar Socket.io
        this.socket = io();
        
        this.experiments = null;
        this.gestures = null;
        this.animations = null;
        this.robot = null;
        
        // Estado de la aplicación
        this.currentExperimentIndex = 0;
        this.selectedIngredients = [];
        this.isExperimentActive = false;
        this.isDragging = false;
        
        // Elementos DOM
        this.elements = {
            webcam: document.getElementById('webcam'),
            gestureCanvas: document.getElementById('gesture-canvas'),
            mixingBowl: document.getElementById('mixing-bowl'),
            bowlContent: document.getElementById('bowl-content'),
            experimentQuestion: document.getElementById('experiment-question'),
            currentExperiment: document.getElementById('current-experiment'),
            totalExperiments: document.getElementById('total-experiments'),
            resultPanel: document.getElementById('result-overlay'),
            resultTitle: document.getElementById('result-title'),
            resultExplanation: document.getElementById('result-explanation'),
            resultAnimation: document.getElementById('result-animation'),
            helpPanel: document.getElementById('help-panel'),
            helpButton: document.getElementById('help-button'),
            nextExperimentBtn: document.getElementById('next-experiment'),
            tryAgainBtn: document.getElementById('try-again'),
            closeHelpBtn: document.getElementById('close-help'),
            gestureIndicator: document.getElementById('gesture-indicator'),
            gestureText: document.getElementById('gesture-text'),
            dotLeft: document.getElementById('dot-left'),
            dotRight: document.getElementById('dot-right'),
            loadingIndicator: document.getElementById('loading-indicator'),
            loadingStatus: document.getElementById('loading-status')
        };
        
        // Socket.io para comunicación con el robot
        this.socket = io();
        
        this.init();
    }
    
    async init() {
        console.log('🧪 Iniciando Laboratorio Virtual de Ciencias...');
        
        try {
            // Mostrar indicador de carga
            this.updateLoadingStatus('Verificando elementos...');
            
            // Verificar que todos los elementos DOM existen
            this.verifyDOMElements();
            
            // Inicializar módulos
            this.updateLoadingStatus('Inicializando experimentos...');
            this.experiments = new ScienceExperiments();
            this.animations = new ScienceAnimations();
            
            // Configurar eventos primero
            this.updateLoadingStatus('Configurando eventos...');
            this.setupEventListeners();
            
            // Inicializar sistema de gestos (incluye webcam)
            this.updateLoadingStatus('Configurando cámara...');
            console.log('📹 Inicializando sistema de gestos...');
            this.gestures = new ScienceGestures(this.elements.webcam, this.elements.gestureCanvas);
            
            // Configurar callbacks de gestos
            this.gestures.onIngredientSelect = this.onIngredientSelect.bind(this);
            this.gestures.onIngredientDrag = this.onIngredientDrag.bind(this);
            this.gestures.onIngredientDrop = this.onIngredientDrop.bind(this);
            this.gestures.onGestureStatusChange = this.onGestureStatusChange.bind(this);
            
            // Inicializar webcam y gestos
            this.updateLoadingStatus('Iniciando detección de manos...');
            await this.gestures.init();
            
            // Cargar primer experimento
            this.updateLoadingStatus('Cargando experimento...');
            this.loadExperiment(0);
            
            // Inicializar robot
            this.updateLoadingStatus('Inicializando robot...');
            await this.initRobot();
            
            // Ocultar indicador de carga
            this.hideLoadingIndicator();
            
            console.log('✅ Laboratorio Virtual inicializado correctamente');
            
        } catch (error) {
            console.error('❌ Error al inicializar el laboratorio:', error);
            this.hideLoadingIndicator();
            this.showError(error.message || 'Error al inicializar la webcam. Por favor, permite el acceso a la cámara.');
        }
    }
    
    updateLoadingStatus(status) {
        if (this.elements.loadingStatus) {
            this.elements.loadingStatus.textContent = status;
        }
        console.log('📡', status);
    }
    
    hideLoadingIndicator() {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.display = 'none';
        }
    }
    
    verifyDOMElements() {
        for (const [key, element] of Object.entries(this.elements)) {
            if (!element) {
                console.error(`❌ Elemento DOM no encontrado: ${key}`);
            }
        }
    }
    
    showError(message) {
        // Mostrar error en la interfaz
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #f44336;
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 1000;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        errorDiv.innerHTML = `
            <h3>🚨 Error</h3>
            <p>${message}</p>
            <button onclick="location.reload()" style="
                background: white;
                color: #f44336;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                margin-top: 10px;
                cursor: pointer;
            ">Recargar Página</button>
        `;
        document.body.appendChild(errorDiv);
    }
    
    async initRobot() {
        try {
            // Importar sistema de robot
            const { RobotManager } = await import('../../robot/robotManager.js');
            this.robot = new RobotManager();
            
            const success = await this.robot.init('robot-container');
            
            if (success) {
                console.log('🤖 Robot iniciado correctamente');
                
                // Configurar eventos del robot
                this.socket.on('robot-response', (data) => {
                    console.log('🤖 Respuesta del robot:', data);
                });
                
                // Animación de bienvenida del robot
                setTimeout(() => {
                    this.robot.showReaction('welcome');
                    this.robot.speak('¡Hola! Soy tu asistente de laboratorio. ¡Hagamos experimentos increíbles!');
                }, 1000);
                
            } else {
                console.warn('⚠️ No se pudo inicializar el robot');
            }
            
        } catch (error) {
            console.error('❌ Error al cargar el robot:', error);
        }
    }
    
    setupEventListeners() {
        // Botones principales
        if (this.elements.nextExperimentBtn) {
            this.elements.nextExperimentBtn.addEventListener('click', () => {
                this.nextExperiment();
            });
        }
        
        if (this.elements.tryAgainBtn) {
            this.elements.tryAgainBtn.addEventListener('click', () => {
                this.resetExperiment();
            });
        }
        
        // Sistema de ayuda
        if (this.elements.helpButton) {
            this.elements.helpButton.addEventListener('click', () => {
                this.showHelp();
                // Auto-cerrar después de 8 segundos
                setTimeout(() => {
                    this.hideHelp();
                }, 8000);
            });
        }
        
        // Cerrar paneles con ESC - REMOVIDO para experiencia sin teclado
        // document.addEventListener('keydown', (e) => {
        //     if (e.key === 'Escape') {
        //         this.hideHelp();
        //         if (!this.isExperimentActive) {
        //             this.hideResults();
        //         }
        //     }
        // });
        
        // Eventos táctiles para ingredientes (respaldo)
        document.querySelectorAll('.ingredient-bowl').forEach(bowl => {
            bowl.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.onIngredientSelect(bowl.dataset.ingredient);
            });
            
            bowl.addEventListener('click', (e) => {
                if (!this.gestures || !this.gestures.isActive) {
                    this.onIngredientSelect(bowl.dataset.ingredient);
                }
            });
        });
        
        // Redimensionamiento de ventana
        window.addEventListener('resize', () => {
            if (this.gestures) {
                this.gestures.updateCanvasSize();
            }
        });
    }
    
    loadExperiment(index) {
        const experiment = this.experiments.getExperiment(index);
        if (!experiment) {
            console.error('❌ Experimento no encontrado:', index);
            return;
        }
        
        this.currentExperimentIndex = index;
        this.selectedIngredients = [];
        this.isExperimentActive = false;
        
        // Actualizar interfaz
        if (this.elements.experimentQuestion) {
            this.elements.experimentQuestion.textContent = experiment.question;
        }
        if (this.elements.currentExperiment) {
            this.elements.currentExperiment.textContent = index + 1;
        }
        if (this.elements.totalExperiments) {
            this.elements.totalExperiments.textContent = this.experiments.getTotalExperiments();
        }
        
        // Limpiar estado visual
        this.resetVisualState();
        
        // Notificar al robot sobre el nuevo experimento
        if (this.robot) {
            this.robot.showReaction('thinking');
            this.robot.speak(`Nuevo experimento: ${experiment.question}`);
        }
        
        // Emitir evento al servidor
        this.socket.emit('experiment-loaded', {
            index: index,
            question: experiment.question,
            timestamp: Date.now()
        });
        
        console.log('🧪 Experimento cargado:', experiment.question);
    }
    
    onIngredientSelect(ingredientId) {
        if (this.isExperimentActive || this.selectedIngredients.length >= 2) {
            return;
        }
        
        const ingredientElement = document.querySelector(`[data-ingredient="${ingredientId}"]`);
        if (!ingredientElement) return;
        
        // Verificar si ya está seleccionado
        if (this.selectedIngredients.includes(ingredientId)) {
            return;
        }
        
        // Agregar ingrediente seleccionado
        this.selectedIngredients.push(ingredientId);
        ingredientElement.classList.add('selected');
        
        // Feedback del robot
        if (this.robot) {
            this.robot.showReaction('interested');
            this.robot.speak(`${this.getIngredientName(ingredientId)} seleccionado`);
        }
        
        // Actualizar indicador de gestos
        this.updateGestureText(`${this.selectedIngredients.length}/2 ingredientes seleccionados`);
        
        console.log('🧪 Ingrediente seleccionado:', ingredientId);
    }
    
    onIngredientDrag(ingredientId, position) {
        if (this.isExperimentActive) return;
        
        const ingredientElement = document.querySelector(`[data-ingredient="${ingredientId}"]`);
        if (!ingredientElement) return;
        
        // Agregar clase de arrastre
        ingredientElement.classList.add('dragging');
        this.isDragging = true;
        
        // Verificar si está sobre la zona de mezcla
        if (this.elements.mixingBowl) {
            const mixingRect = this.elements.mixingBowl.getBoundingClientRect();
            const isOverMixing = this.isPositionOverElement(position, mixingRect);
            
            // Feedback visual
            if (isOverMixing) {
                this.elements.mixingBowl.classList.add('active');
            } else {
                this.elements.mixingBowl.classList.remove('active');
            }
        }
        
        this.updateGestureText('Arrastrando ingrediente...');
    }
    
    onIngredientDrop(ingredientId, position) {
        if (this.isExperimentActive) return;
        
        const ingredientElement = document.querySelector(`[data-ingredient="${ingredientId}"]`);
        if (!ingredientElement) return;
        
        // Remover clase de arrastre
        ingredientElement.classList.remove('dragging');
        this.isDragging = false;
        if (this.elements.mixingBowl) {
            this.elements.mixingBowl.classList.remove('active');
        }
        
        // Verificar si se soltó sobre la zona de mezcla
        if (this.elements.mixingBowl) {
            const mixingRect = this.elements.mixingBowl.getBoundingClientRect();
            const isOverMixing = this.isPositionOverElement(position, mixingRect);
            
            if (isOverMixing && this.selectedIngredients.includes(ingredientId)) {
                this.addIngredientToMix(ingredientId);
                
                // Si tenemos 2 ingredientes, procesar experimento
                if (this.selectedIngredients.length === 2) {
                    setTimeout(() => {
                        this.processExperiment();
                    }, 500);
                }
            }
        }
        
        this.updateGestureText('Usa gestos de pinch para arrastrar');
    }
    
    addIngredientToMix(ingredientId) {
        // Agregar efecto visual al bowl
        if (this.elements.bowlContent) {
            const bowl = this.elements.bowlContent;
            const ingredientClass = `ingredient-${ingredientId}`;
            
            if (!bowl.classList.contains(ingredientClass)) {
                bowl.classList.add(ingredientClass);
                
                // Crear efecto de goteo
                if (this.animations && this.elements.mixingBowl) {
                    this.animations.createDropEffect(this.elements.mixingBowl, this.getIngredientColor(ingredientId));
                }
            }
        }
        
        console.log('🧪 Ingrediente agregado a la mezcla:', ingredientId);
    }
    
    async processExperiment() {
        if (this.isExperimentActive || this.selectedIngredients.length !== 2) {
            return;
        }
        
        this.isExperimentActive = true;
        
        const [ingredient1, ingredient2] = this.selectedIngredients;
        const result = this.experiments.processIngredients(this.currentExperimentIndex, ingredient1, ingredient2);
        
        console.log('🧪 Procesando experimento:', { ingredient1, ingredient2, result });
        
        // Mostrar animación de reacción
        if (this.animations && this.elements.mixingBowl) {
            await this.animations.showReactionAnimation(this.elements.mixingBowl, result.type);
        }
        
        // Feedback del robot y progresión
        if (result.success) {
            // ✅ EXPERIMENTO CORRECTO
            console.log('✅ Experimento exitoso!');
            
            // Robot hace thumbsUp
            if (robotShapeIntegration) {
                robotShapeIntegration.handleHandGesture('thumbsUp');
            }
            
            // Enviar "A" por socket (como en tecnología)
            this.socket.emit("lenvantarceja", { 
                tipo: 'A', 
                experimento: this.currentExperimentIndex,
                timestamp: Date.now() 
            });
            
            // Feedback del robot
            if (this.robot) {
                this.robot.showReaction('excited');
                this.robot.speak('¡Excelente! ¡La reacción fue exitosa!');
            }
            
            // Mostrar resultado exitoso
            this.showSuccessResult(result);
            
            // Avanzar automáticamente al siguiente experimento después de 4 segundos
            setTimeout(() => {
                if (this.robot) {
                    this.robot.speak('Pasemos al siguiente experimento');
                }
                setTimeout(() => {
                    this.nextExperiment();
                }, 1500);
            }, 4000);
            
        } else {
            // ❌ EXPERIMENTO INCORRECTO
            console.log('❌ Experimento incorrecto');
            
            // Feedback del robot
            if (this.robot) {
                this.robot.showReaction('thinking');
                this.robot.speak('Hmm, esa combinación no parece correcta. ¡Intenta otra vez!');
            }
            
            // Mostrar resultado incorrecto
            this.showErrorResult(result);
            
            // Limpiar automáticamente después de 3 segundos
            setTimeout(() => {
                this.resetExperiment();
            }, 3000);
        }
        
        // Emitir evento al servidor
        this.socket.emit('experiment-completed', {
            experimentIndex: this.currentExperimentIndex,
            ingredients: this.selectedIngredients,
            result: result,
            timestamp: Date.now()
        });
    }
    
    showSuccessResult(result) {
        if (this.elements.resultPanel) {
            this.elements.resultPanel.innerHTML = `
                <div class="result-content success">
                    <div class="result-icon">✅</div>
                    <h3>¡Experimento Exitoso!</h3>
                    <p><strong>${result.title}</strong></p>
                    <p>${result.explanation}</p>
                    <div class="result-animation">${result.animation || ''}</div>
                </div>
            `;
            this.elements.resultPanel.classList.remove('hidden');
            this.elements.resultPanel.classList.add('success');
            this.elements.resultPanel.classList.remove('error');
        }
    }
    
    showErrorResult(result) {
        if (this.elements.resultPanel) {
            this.elements.resultPanel.innerHTML = `
                <div class="result-content error">
                    <div class="result-icon">❌</div>
                    <h3>Combinación Incorrecta</h3>
                    <p>Esa no es la combinación correcta para este experimento.</p>
                    <p class="hint">💡 Pista: ${this.experiments.getExperiment(this.currentExperimentIndex).hint || 'Intenta con otros ingredientes'}</p>
                </div>
            `;
            this.elements.resultPanel.classList.remove('hidden');
            this.elements.resultPanel.classList.add('error');
            this.elements.resultPanel.classList.remove('success');
        }
    }

    showResults(result) {
        if (this.elements.resultTitle) {
            this.elements.resultTitle.textContent = result.title;
        }
        if (this.elements.resultExplanation) {
            this.elements.resultExplanation.textContent = result.explanation;
        }
        if (this.elements.resultAnimation) {
            this.elements.resultAnimation.innerHTML = result.animation;
        }
        
        // Configurar botones según el resultado
        if (result.success) {
            if (this.elements.nextExperimentBtn) {
                this.elements.nextExperimentBtn.style.display = 'inline-block';
            }
            if (this.elements.tryAgainBtn) {
                this.elements.tryAgainBtn.style.display = 'none';
            }
        } else {
            if (this.elements.nextExperimentBtn) {
                this.elements.nextExperimentBtn.style.display = 'none';
            }
            if (this.elements.tryAgainBtn) {
                this.elements.tryAgainBtn.style.display = 'inline-block';
            }
        }
        
        if (this.elements.resultPanel) {
            this.elements.resultPanel.classList.remove('hidden');
        }
    }
    
    hideResults() {
        if (this.elements.resultPanel) {
            this.elements.resultPanel.classList.add('hidden');
        }
    }
    
    resetExperiment() {
        // Ocultar resultados
        this.hideResults();
        
        // Limpiar ingredientes seleccionados
        this.selectedIngredients = [];
        this.isExperimentActive = false;
        
        // Limpiar estado visual
        this.resetVisualState();
        
        // Limpiar el contenido del bowl
        if (this.elements.bowlContent) {
            this.elements.bowlContent.className = 'bowl-content';
            this.elements.bowlContent.innerHTML = '';
        }
        
        // Resetear animaciones
        if (this.animations && this.elements.mixingBowl) {
            this.animations.clearAnimations(this.elements.mixingBowl);
        }
        
        // Robot vuelve a estado listo
        if (this.robot) {
            this.robot.showReaction('ready');
            this.robot.speak('¡Vamos a intentarlo de nuevo!');
        }
        
        console.log('🔄 Experimento reseteado');
    }
    
    nextExperiment() {
        this.hideResults();
        
        const nextIndex = this.currentExperimentIndex + 1;
        if (nextIndex < this.experiments.getTotalExperiments()) {
            this.loadExperiment(nextIndex);
        } else {
            // Completar todos los experimentos
            this.showCompletionMessage();
        }
    }
    
    showCompletionMessage() {
        // Mensaje de finalización solo con el robot, sin panel modal
        if (this.robot) {
            this.robot.showReaction('celebrate');
            this.robot.speak('¡Increíble trabajo! ¡Has completado todos los experimentos! Reiniciando laboratorio...');
            
            // Reiniciar automáticamente después de 4 segundos
            setTimeout(() => {
                this.loadExperiment(0);
                this.robot.speak('¡Empecemos de nuevo con más experimentos!');
            }, 4000);
        }
    }
    
    resetVisualState() {
        // Limpiar selecciones
        document.querySelectorAll('.ingredient-bowl').forEach(bowl => {
            bowl.classList.remove('selected', 'dragging');
        });
        
        // Limpiar bowl de mezcla
        if (this.elements.bowlContent) {
            this.elements.bowlContent.className = 'bowl-content';
        }
        if (this.elements.mixingBowl) {
            this.elements.mixingBowl.classList.remove('active');
        }
        
        // Actualizar indicadores
        this.updateGestureText('Usa gestos de pinch para arrastrar');
    }
    
    onGestureStatusChange(status) {
        // Actualizar indicadores de gestos
        if (this.elements.dotLeft) {
            this.elements.dotLeft.classList.toggle('active', status.leftHand);
        }
        if (this.elements.dotRight) {
            this.elements.dotRight.classList.toggle('active', status.rightHand);
        }
        
        if (status.gestureDetected) {
            this.updateGestureText('Gesto detectado');
        } else if (!this.isDragging) {
            this.updateGestureText('Usa gestos de pinch para arrastrar');
        }
    }
    
    updateGestureText(text) {
        if (this.elements.gestureText) {
            this.elements.gestureText.textContent = text;
        }
    }
    
    showHelp() {
        if (this.elements.helpPanel) {
            this.elements.helpPanel.classList.remove('hidden');
        }
    }
    
    hideHelp() {
        if (this.elements.helpPanel) {
            this.elements.helpPanel.classList.add('hidden');
        }
    }
    
    // Utilidades
    getIngredientName(ingredientId) {
        const names = {
            vinagre: 'Vinagre',
            bicarbonato: 'Bicarbonato',
            jabon: 'Jabón',
            agua: 'Agua',
            aceite: 'Aceite',
            azucar: 'Azúcar',
            sal: 'Sal',
            colorante: 'Colorante'
        };
        return names[ingredientId] || ingredientId;
    }
    
    getIngredientColor(ingredientId) {
        const colors = {
            vinagre: '#ffeb3b',
            bicarbonato: '#ffffff',
            jabon: '#e1f5fe',
            agua: '#2196f3',
            aceite: '#ff9800',
            azucar: '#ffc107',
            sal: '#f5f5f5',
            colorante: '#e91e63'
        };
        return colors[ingredientId] || '#cccccc';
    }
    
    isPositionOverElement(position, elementRect) {
        return position.x >= elementRect.left &&
               position.x <= elementRect.right &&
               position.y >= elementRect.top &&
               position.y <= elementRect.bottom;
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Iniciando aplicación de ciencias...');
    window.scienceApp = new ScienceApp();
});

// Exportar para uso en otros módulos
export { ScienceApp };
