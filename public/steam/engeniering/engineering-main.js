// ========== ENGINEERING MAIN - Controlador Principal del Laboratorio de Ingeniería ==========

import { EngineeringStructures } from './engineering-structures.js';
import { EngineeringCircuits } from './engineering-circuits.js';
import { EngineeringGestures } from './engineering-gestures.js';
import { EngineeringPhysics } from './engineering-physics.js';
import robotShapeIntegration from '../../robot/robotShapeIntegration.js';

class EngineeringApp {
    constructor() {
        // Inicializar Socket.io
        this.socket = io();
        
        // Subsistemas
        this.structures = null;
        this.circuits = null;
        this.gestures = null;
        this.physics = null;
        this.robot = null;
        
        // Estado de la aplicación
        this.currentActivity = 'structures'; // 'structures' o 'circuits'
        this.currentProject = 0;
        this.isDragging = false;
        this.selectedComponent = null;
        
        // Elementos DOM
        this.elements = {
            webcam: document.getElementById('webcam'),
            gestureCanvas: document.getElementById('gesture-canvas'),
            threeCanvas: document.getElementById('three-canvas'),
            constructionArea: document.getElementById('construction-area'),
            toolbox: document.getElementById('toolbox'),
            blocksPanel: document.getElementById('blocks-panel'),
            componentsPanel: document.getElementById('components-panel'),
            challengePanel: document.getElementById('challenge-panel'),
            challengeTitle: document.getElementById('challenge-title'),
            challengeDescription: document.getElementById('challenge-description'),
            heightReq: document.getElementById('height-req'),
            stabilityReq: document.getElementById('stability-req'),
            stabilityFill: document.getElementById('stability-fill'),
            stabilityText: document.getElementById('stability-text'),
            blocksCount: document.getElementById('blocks-count'),
            currentProject: document.getElementById('current-project'),
            totalProjects: document.getElementById('total-projects'),
            projectQuestion: document.getElementById('project-question'),
            structuresBtn: document.getElementById('structures-btn'),
            circuitsBtn: document.getElementById('circuits-btn'),
            resultOverlay: document.getElementById('result-overlay'),
            resultTitle: document.getElementById('result-title'),
            resultExplanation: document.getElementById('result-explanation'),
            resultAnimation: document.getElementById('result-animation'),
            loadingIndicator: document.getElementById('loading-indicator'),
            loadingStatus: document.getElementById('loading-status'),
            helpPanel: document.getElementById('help-panel'),
            helpButton: document.getElementById('help-button')
        };
        
        // Proyectos y desafíos
        this.projects = {
            structures: [
                {
                    id: 'tower-challenge',
                    title: '🏗️ Desafío: Torre Estable',
                    question: '¿Puedes construir una torre estable?',
                    description: 'Construye una torre de al menos 5 bloques de altura que sea estable y no se caiga.',
                    requirements: {
                        height: 5,
                        stability: 70
                    },
                    hint: 'Una base ancha y centro de masa bajo ayudan a la estabilidad'
                },
                {
                    id: 'bridge-challenge',
                    title: '🌉 Desafío: Puente Resistente',
                    question: '¿Puedes construir un puente que soporte peso?',
                    description: 'Construye un puente que conecte dos puntos y pueda soportar una carga.',
                    requirements: {
                        span: 6,
                        stability: 80
                    },
                    hint: 'Los triángulos y vigas proporcionan gran resistencia estructural'
                }
            ],
            circuits: [
                {
                    id: 'simple-circuit',
                    title: '⚡ Circuito Básico',
                    question: '¿Puedes encender una bombilla?',
                    description: 'Crea un circuito simple que encienda una bombilla usando una batería.',
                    requirements: {
                        components: ['battery', 'bulb', 'wire'],
                        connected: true
                    },
                    hint: 'La corriente debe fluir desde el polo positivo al negativo'
                },
                {
                    id: 'switch-circuit',
                    title: '🔘 Circuito con Interruptor',
                    question: '¿Puedes controlar cuando se enciende?',
                    description: 'Agrega un interruptor para controlar cuándo se enciende la bombilla.',
                    requirements: {
                        components: ['battery', 'bulb', 'switch', 'wire'],
                        switchable: true
                    },
                    hint: 'El interruptor debe interrumpir el flujo de corriente'
                }
            ]
        };
        
        this.isInitialized = false;
    }
    
    async init() {
        try {
            console.log('🚀 Inicializando Laboratorio de Ingeniería...');
            
            // Validar elementos DOM
            this.validateDOMElements();
            
            // Inicializar subsistemas
            this.updateLoadingStatus('Inicializando física...');
            this.physics = new EngineeringPhysics();
            await this.physics.init();
            
            this.updateLoadingStatus('Configurando estructuras...');
            this.structures = new EngineeringStructures(this.elements.threeCanvas, this.physics);
            await this.structures.init();
            
            this.updateLoadingStatus('Configurando circuitos...');
            this.circuits = new EngineeringCircuits(this.elements.threeCanvas);
            await this.circuits.init();
            
            this.updateLoadingStatus('Inicializando gestos...');
            this.gestures = new EngineeringGestures();
            
            // Configurar callbacks de gestos
            this.gestures.onComponentSelect = this.onComponentSelect.bind(this);
            this.gestures.onComponentDrag = this.onComponentDrag.bind(this);
            this.gestures.onComponentDrop = this.onComponentDrop.bind(this);
            this.gestures.onGestureStatusChange = this.onGestureStatusChange.bind(this);
            
            await this.gestures.init();
            
            // Inicializar robot
            this.updateLoadingStatus('Inicializando robot...');
            await this.initRobot();
            
            // Configurar event listeners
            this.setupEventListeners();
            
            // Cargar primer proyecto
            this.updateLoadingStatus('Cargando proyecto...');
            this.loadProject(0);
            
            // Ocultar indicador de carga
            this.hideLoadingIndicator();
            
            this.isInitialized = true;
            console.log('✅ Laboratorio de Ingeniería inicializado correctamente');
            
            // Robot saluda al inicializar
            if (this.robot) {
                this.robot.speak('¡Bienvenido al laboratorio de ingeniería! Vamos a construir cosas increíbles.');
            }
            
        } catch (error) {
            console.error('❌ Error inicializando laboratorio:', error);
            this.showError('Error al inicializar el laboratorio: ' + error.message);
        }
    }
    
    validateDOMElements() {
        const requiredElements = [
            'webcam', 'gestureCanvas', 'threeCanvas', 'constructionArea',
            'toolbox', 'challengePanel', 'stabilityFill', 'blocksCount'
        ];
        
        for (const elementKey of requiredElements) {
            if (!this.elements[elementKey]) {
                throw new Error(`Elemento DOM requerido no encontrado: ${elementKey}`);
            }
        }
        
        console.log('✅ Todos los elementos DOM validados');
    }
    
    async initRobot() {
        try {
            // Inicializar integración del robot
            const success = await robotShapeIntegration.init();
            if (success) {
                this.robot = {
                    speak: (text) => {
                        console.log('🤖 Robot dice:', text);
                        // Aquí se podría integrar síntesis de voz
                    },
                    showReaction: (reaction) => {
                        console.log('🤖 Robot reacción:', reaction);
                        if (robotShapeIntegration && robotShapeIntegration.isEnabled) {
                            switch (reaction) {
                                case 'excited':
                                    robotShapeIntegration.celebrateSuccess();
                                    break;
                                case 'thinking':
                                    robotShapeIntegration.showApproval();
                                    break;
                                case 'ready':
                                    robotShapeIntegration.greetUser();
                                    break;
                            }
                        }
                    }
                };
                console.log('✅ Robot inicializado correctamente');
            } else {
                console.warn('⚠️ No se pudo inicializar el robot');
            }
        } catch (error) {
            console.error('❌ Error inicializando robot:', error);
        }
    }
    
    setupEventListeners() {
        // Botones de actividad
        this.elements.structuresBtn?.addEventListener('click', () => {
            this.switchActivity('structures');
        });
        
        this.elements.circuitsBtn?.addEventListener('click', () => {
            this.switchActivity('circuits');
        });
        
        // Botón de ayuda
        this.elements.helpButton?.addEventListener('click', () => {
            this.toggleHelp();
        });
        
        // Selección de componentes
        document.querySelectorAll('.block-item, .component-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.selectComponent(item.dataset.block || item.dataset.component);
            });
        });
        
        // Cerrar ayuda con click fuera
        this.elements.helpPanel?.addEventListener('click', (e) => {
            if (e.target === this.elements.helpPanel) {
                this.toggleHelp();
            }
        });
        
        console.log('✅ Event listeners configurados');
    }
    
    switchActivity(activity) {
        if (this.currentActivity === activity) return;
        
        this.currentActivity = activity;
        
        // Actualizar botones
        this.elements.structuresBtn?.classList.toggle('active', activity === 'structures');
        this.elements.circuitsBtn?.classList.toggle('active', activity === 'circuits');
        
        // Mostrar/ocultar paneles
        this.elements.blocksPanel?.classList.toggle('active', activity === 'structures');
        this.elements.componentsPanel?.classList.toggle('active', activity === 'circuits');
        
        // Cambiar escena 3D
        if (activity === 'structures') {
            this.structures?.show();
            this.circuits?.hide();
        } else {
            this.circuits?.show();
            this.structures?.hide();
        }
        
        // Cargar primer proyecto de la actividad
        this.loadProject(0);
        
        // Feedback del robot
        if (this.robot) {
            const message = activity === 'structures' 
                ? '¡Excelente! Vamos a construir estructuras increíbles.'
                : '¡Genial! Vamos a crear circuitos eléctricos.';
            this.robot.speak(message);
        }
        
        console.log(`🔄 Cambiado a actividad: ${activity}`);
    }
    
    loadProject(index) {
        const projects = this.projects[this.currentActivity];
        if (index >= projects.length) {
            this.completeAllProjects();
            return;
        }
        
        this.currentProject = index;
        const project = projects[index];
        
        // Actualizar UI
        if (this.elements.projectQuestion) {
            this.elements.projectQuestion.textContent = project.question;
        }
        if (this.elements.challengeTitle) {
            this.elements.challengeTitle.textContent = project.title;
        }
        if (this.elements.challengeDescription) {
            this.elements.challengeDescription.textContent = project.description;
        }
        if (this.elements.currentProject) {
            this.elements.currentProject.textContent = (index + 1).toString();
        }
        if (this.elements.totalProjects) {
            this.elements.totalProjects.textContent = projects.length.toString();
        }
        
        // Limpiar escena actual
        if (this.currentActivity === 'structures') {
            this.structures?.clearScene();
            this.updateStructureStatus();
        } else {
            this.circuits?.clearScene();
            this.updateCircuitStatus();
        }
        
        // Feedback del robot
        if (this.robot) {
            this.robot.speak(`Nuevo desafío: ${project.description}`);
        }
        
        console.log(`📋 Proyecto cargado: ${project.title}`);
    }
    
    selectComponent(componentId) {
        this.selectedComponent = componentId;
        
        // Actualizar UI de selección
        document.querySelectorAll('.block-item, .component-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        const selectedItem = document.querySelector(`[data-block="${componentId}"], [data-component="${componentId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('selected');
            selectedItem.classList.add('pulse');
            setTimeout(() => selectedItem.classList.remove('pulse'), 2000);
        }
        
        console.log(`🎯 Componente seleccionado: ${componentId}`);
    }
    
    // ========== CALLBACKS DE GESTOS ==========
    
    onComponentSelect(componentId, position) {
        if (!this.selectedComponent) {
            console.log('⚠️ No hay componente seleccionado');
            return;
        }
        
        console.log(`🤏 Seleccionando ${this.selectedComponent} en:`, position);
        this.isDragging = true;
        
        // Activar indicador de arrastre
        const dragIndicator = document.getElementById('drag-gesture');
        if (dragIndicator) {
            dragIndicator.classList.add('active');
        }
    }
    
    onComponentDrag(position) {
        if (!this.isDragging || !this.selectedComponent) return;
        
        // Actualizar posición del componente virtual
        if (this.currentActivity === 'structures') {
            this.structures?.updateDragPreview(this.selectedComponent, position);
        } else {
            this.circuits?.updateDragPreview(this.selectedComponent, position);
        }
    }
    
    onComponentDrop(position) {
        if (!this.isDragging || !this.selectedComponent) return;
        
        console.log(`📍 Soltando ${this.selectedComponent} en:`, position);
        
        // Colocar componente
        let success = false;
        if (this.currentActivity === 'structures') {
            success = this.structures?.placeComponent(this.selectedComponent, position);
            if (success) {
                this.updateStructureStatus();
                this.checkStructureCompletion();
            }
        } else {
            success = this.circuits?.placeComponent(this.selectedComponent, position);
            if (success) {
                this.updateCircuitStatus();
                this.checkCircuitCompletion();
            }
        }
        
        if (success) {
            // Enviar "A" por socket cuando se coloca exitosamente
            this.socket.emit("lenvantarceja", { 
                tipo: 'A', 
                actividad: this.currentActivity,
                componente: this.selectedComponent,
                proyecto: this.currentProject,
                timestamp: Date.now() 
            });
            
            // Robot hace thumbsUp
            if (robotShapeIntegration) {
                robotShapeIntegration.handleHandGesture('thumbsUp');
            }
            
            // Feedback del robot
            if (this.robot) {
                this.robot.speak('¡Excelente colocación!');
                this.robot.showReaction('excited');
            }
        }
        
        this.isDragging = false;
        
        // Desactivar indicador de arrastre
        const dragIndicator = document.getElementById('drag-gesture');
        if (dragIndicator) {
            dragIndicator.classList.remove('active');
        }
    }
    
    onGestureStatusChange(status) {
        // Actualizar indicadores de gestos
        const handIndicator = document.getElementById('hand-detected');
        const pinchIndicator = document.getElementById('pinch-gesture');
        
        if (handIndicator) {
            handIndicator.classList.toggle('active', status.handDetected);
        }
        if (pinchIndicator) {
            pinchIndicator.classList.toggle('active', status.pinching);
        }
    }
    
    // ========== ACTUALIZACIÓN DE ESTADO ==========
    
    updateStructureStatus() {
        if (!this.structures) return;
        
        const status = this.structures.getStructureStatus();
        
        // Actualizar barra de estabilidad
        if (this.elements.stabilityFill) {
            this.elements.stabilityFill.style.width = `${status.stability}%`;
        }
        if (this.elements.stabilityText) {
            this.elements.stabilityText.textContent = `${Math.round(status.stability)}%`;
        }
        
        // Actualizar contador de bloques
        if (this.elements.blocksCount) {
            this.elements.blocksCount.textContent = status.blockCount.toString();
        }
        
        // Actualizar requisitos
        const project = this.projects.structures[this.currentProject];
        if (project && project.requirements) {
            this.updateRequirement('height-req', status.height >= project.requirements.height);
            this.updateRequirement('stability-req', status.stability >= project.requirements.stability);
        }
    }
    
    updateCircuitStatus() {
        if (!this.circuits) return;
        
        const status = this.circuits.getCircuitStatus();
        
        // Actualizar información del circuito
        console.log('🔌 Estado del circuito:', status);
        
        // Actualizar requisitos
        const project = this.projects.circuits[this.currentProject];
        if (project && project.requirements) {
            const hasComponents = project.requirements.components.every(comp => 
                status.components.includes(comp)
            );
            this.updateRequirement('components-req', hasComponents);
            this.updateRequirement('connected-req', status.connected);
        }
    }
    
    updateRequirement(reqId, completed) {
        const reqElement = document.getElementById(reqId);
        if (reqElement) {
            reqElement.classList.toggle('completed', completed);
            const statusElement = reqElement.querySelector('.req-status');
            if (statusElement) {
                statusElement.textContent = completed ? '✅' : '❌';
            }
        }
    }
    
    // ========== VERIFICACIÓN DE COMPLETITUD ==========
    
    checkStructureCompletion() {
        const project = this.projects.structures[this.currentProject];
        if (!project || !this.structures) return;
        
        const status = this.structures.getStructureStatus();
        const heightCompleted = status.height >= project.requirements.height;
        const stabilityCompleted = status.stability >= project.requirements.stability;
        
        if (heightCompleted && stabilityCompleted) {
            this.completeProject();
        }
    }
    
    checkCircuitCompletion() {
        const project = this.projects.circuits[this.currentProject];
        if (!project || !this.circuits) return;
        
        const status = this.circuits.getCircuitStatus();
        const hasComponents = project.requirements.components.every(comp => 
            status.components.includes(comp)
        );
        
        if (hasComponents && status.connected) {
            this.completeProject();
        }
    }
    
    completeProject() {
        const project = this.projects[this.currentActivity][this.currentProject];
        
        console.log('🎉 ¡Proyecto completado!', project.title);
        
        // Mostrar resultado
        this.showResult({
            title: '¡Proyecto Completado!',
            explanation: `Has completado exitosamente: ${project.title}`,
            success: true
        });
        
        // Feedback del robot
        if (this.robot) {
            this.robot.speak('¡Increíble! Has completado el desafío perfectamente.');
            this.robot.showReaction('excited');
        }
        
        // Robot hace thumbsUp
        if (robotShapeIntegration) {
            robotShapeIntegration.handleHandGesture('thumbsUp');
        }
        
        // Enviar evento de completitud por socket
        this.socket.emit("lenvantarceja", { 
            tipo: 'A', 
            evento: 'proyecto_completado',
            actividad: this.currentActivity,
            proyecto: this.currentProject,
            timestamp: Date.now() 
        });
        
        // Avanzar al siguiente proyecto después de 4 segundos
        setTimeout(() => {
            this.hideResult();
            setTimeout(() => {
                this.loadProject(this.currentProject + 1);
            }, 1000);
        }, 4000);
    }
    
    completeAllProjects() {
        console.log('🎊 ¡Todos los proyectos completados!');
        
        this.showResult({
            title: '¡Felicitaciones!',
            explanation: `Has completado todos los desafíos de ${this.currentActivity === 'structures' ? 'Estructuras' : 'Circuitos'}. ¡Eres un ingeniero increíble!`,
            success: true
        });
        
        if (this.robot) {
            this.robot.speak('¡Felicitaciones! Eres un verdadero ingeniero. Has dominado todos los desafíos.');
            this.robot.showReaction('excited');
        }
    }
    
    // ========== UI Y UTILIDADES ==========
    
    showResult(result) {
        if (this.elements.resultTitle) {
            this.elements.resultTitle.textContent = result.title;
        }
        if (this.elements.resultExplanation) {
            this.elements.resultExplanation.textContent = result.explanation;
        }
        if (this.elements.resultAnimation) {
            this.elements.resultAnimation.textContent = result.success ? '🎉' : '🤔';
        }
        if (this.elements.resultOverlay) {
            this.elements.resultOverlay.classList.remove('hidden');
        }
    }
    
    hideResult() {
        if (this.elements.resultOverlay) {
            this.elements.resultOverlay.classList.add('hidden');
        }
    }
    
    toggleHelp() {
        if (this.elements.helpPanel) {
            this.elements.helpPanel.classList.toggle('hidden');
        }
    }
    
    updateLoadingStatus(status) {
        if (this.elements.loadingStatus) {
            this.elements.loadingStatus.textContent = status;
        }
        console.log('📊', status);
    }
    
    hideLoadingIndicator() {
        if (this.elements.loadingIndicator) {
            this.elements.loadingIndicator.style.display = 'none';
        }
    }
    
    showError(message) {
        console.error('❌', message);
        alert(`Error: ${message}`);
    }
}

// ========== INICIALIZACIÓN ==========

// Crear instancia global de la aplicación
const engineeringApp = new EngineeringApp();

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        engineeringApp.init();
    });
} else {
    engineeringApp.init();
}

// Exportar para uso global
window.engineeringApp = engineeringApp;
export default engineeringApp;
