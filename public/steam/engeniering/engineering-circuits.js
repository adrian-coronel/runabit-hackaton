// ========== ENGINEERING CIRCUITS - Sistema de Circuitos Eléctricos ==========

export class EngineeringCircuits {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.components = [];
        this.wires = [];
        this.dragPreview = null;
        this.isVisible = false;
        
        // Configuración de componentes
        this.componentTypes = {
            battery: {
                name: 'Batería',
                size: { x: 1.5, y: 0.5, z: 0.8 },
                color: 0xFFC107,
                voltage: 9, // 9V
                type: 'power',
                connections: 2
            },
            bulb: {
                name: 'Bombilla',
                size: { x: 0.6, y: 1, z: 0.6 },
                color: 0xFFEB3B,
                resistance: 100,
                type: 'load',
                connections: 2
            },
            switch: {
                name: 'Interruptor',
                size: { x: 1, y: 0.3, z: 0.6 },
                color: 0x607D8B,
                state: false, // abierto/cerrado
                type: 'control',
                connections: 2
            },
            wire: {
                name: 'Cable',
                size: { x: 0.1, y: 0.1, z: 1 },
                color: 0x4CAF50,
                resistance: 0.1,
                type: 'connector',
                connections: 2
            },
            motor: {
                name: 'Motor',
                size: { x: 1, y: 1, z: 1 },
                color: 0x9C27B0,
                resistance: 50,
                type: 'load',
                connections: 2
            },
            resistor: {
                name: 'Resistencia',
                size: { x: 0.8, y: 0.3, z: 0.3 },
                color: 0x795548,
                resistance: 220,
                type: 'resistor',
                connections: 2
            }
        };
        
        // Grid y área de construcción
        this.gridSize = 0.5;
        this.circuitArea = {
            x: { min: -6, max: 6 },
            y: { min: 0, max: 1 },
            z: { min: -4, max: 4 }
        };
        
        // Sistema de circuitos
        this.circuit = {
            nodes: new Map(),
            connections: [],
            powered: false,
            current: 0
        };
    }
    
    async init() {
        try {
            console.log('⚡ Inicializando sistema de circuitos...');
            
            // Crear escena separada para circuitos
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x0a0a0a);
            
            // Configurar cámara (vista superior para circuitos)
            this.camera = new THREE.PerspectiveCamera(
                60,
                this.canvas.clientWidth / this.canvas.clientHeight,
                0.1,
                100
            );
            this.camera.position.set(0, 8, 0);
            this.camera.lookAt(0, 0, 0);
            
            // Crear renderer compartido pero oculto inicialmente
            this.renderer = new THREE.WebGLRenderer({ 
                canvas: this.canvas,
                antialias: true,
                alpha: true
            });
            this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // Configurar iluminación para circuitos
            this.setupCircuitLighting();
            
            // Crear tablero de circuitos
            this.createCircuitBoard();
            
            // Configurar controles
            this.setupControls();
            
            console.log('✅ Sistema de circuitos inicializado');
            
        } catch (error) {
            console.error('❌ Error inicializando circuitos:', error);
            throw error;
        }
    }
    
    setupCircuitLighting() {
        // Luz ambiental suave
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Luz direccional desde arriba
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 10, 0);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);
    }
    
    createCircuitBoard() {
        // Crear tablero base
        const boardGeometry = new THREE.BoxGeometry(12, 0.1, 8);
        const boardMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x1B5E20,
            transparent: true,
            opacity: 0.9
        });
        const board = new THREE.Mesh(boardGeometry, boardMaterial);
        board.position.y = 0;
        board.receiveShadow = true;
        this.scene.add(board);
        
        // Crear grid de conexiones (como protoboard)
        this.createConnectionGrid();
    }
    
    createConnectionGrid() {
        const gridHelper = new THREE.GridHelper(12, 24, 0x888888, 0x444444);
        gridHelper.position.y = 0.051;
        this.scene.add(gridHelper);
        
        // Añadir puntos de conexión visuales
        const dotGeometry = new THREE.CircleGeometry(0.05, 8);
        const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xCCCCCC });
        
        for (let x = -5.5; x <= 5.5; x += 0.5) {
            for (let z = -3.5; z <= 3.5; z += 0.5) {
                const dot = new THREE.Mesh(dotGeometry, dotMaterial);
                dot.position.set(x, 0.052, z);
                dot.rotation.x = -Math.PI / 2;
                this.scene.add(dot);
            }
        }
    }
    
    setupControls() {
        // Controles específicos para vista de circuitos
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.canvas);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.target.set(0, 0, 0);
            this.controls.maxPolarAngle = Math.PI / 3; // Limitar rotación vertical
            this.controls.minDistance = 5;
            this.controls.maxDistance = 15;
        }
    }
    
    placeComponent(componentType, position) {
        if (!this.componentTypes[componentType]) {
            console.error('❌ Tipo de componente no válido:', componentType);
            return false;
        }
        
        // Convertir posición de pantalla a mundo 3D
        const worldPosition = this.screenToWorld(position);
        if (!worldPosition) return false;
        
        // Snap a grid
        const snappedPosition = this.snapToGrid(worldPosition);
        
        // Verificar si la posición es válida
        if (!this.isValidPosition(snappedPosition, componentType)) {
            console.log('⚠️ Posición no válida para colocar componente');
            return false;
        }
        
        // Crear componente
        const component = this.createComponent(componentType, snappedPosition);
        if (component) {
            this.components.push(component);
            this.scene.add(component.mesh);
            
            // Añadir al circuito
            this.addToCircuit(component);
            
            // Auto-conectar si es un cable
            if (componentType === 'wire') {
                this.autoConnectWire(component);
            }
            
            console.log(`⚡ Componente ${componentType} colocado en:`, snappedPosition);
            return true;
        }
        
        return false;
    }
    
    createComponent(type, position) {
        const config = this.componentTypes[type];
        if (!config) return null;
        
        let geometry;
        let material;
        
        // Crear geometría según el tipo
        switch (type) {
            case 'battery':
                geometry = new THREE.BoxGeometry(config.size.x, config.size.y, config.size.z);
                material = new THREE.MeshLambertMaterial({ color: config.color });
                break;
                
            case 'bulb':
                geometry = new THREE.SphereGeometry(config.size.x / 2, 16, 16);
                material = new THREE.MeshLambertMaterial({ 
                    color: config.color,
                    transparent: true,
                    opacity: 0.8
                });
                break;
                
            case 'switch':
                geometry = new THREE.BoxGeometry(config.size.x, config.size.y, config.size.z);
                material = new THREE.MeshLambertMaterial({ color: config.color });
                break;
                
            case 'wire':
                geometry = new THREE.CylinderGeometry(
                    config.size.x / 2,
                    config.size.x / 2,
                    config.size.z,
                    8
                );
                material = new THREE.MeshLambertMaterial({ color: config.color });
                break;
                
            case 'motor':
                geometry = new THREE.CylinderGeometry(
                    config.size.x / 2,
                    config.size.x / 2,
                    config.size.y,
                    16
                );
                material = new THREE.MeshLambertMaterial({ color: config.color });
                break;
                
            case 'resistor':
                geometry = new THREE.CylinderGeometry(
                    config.size.x / 2,
                    config.size.x / 2,
                    config.size.z,
                    8
                );
                material = new THREE.MeshLambertMaterial({ color: config.color });
                break;
                
            default:
                geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
                material = new THREE.MeshLambertMaterial({ color: 0x666666 });
        }
        
        // Crear mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.position.y += config.size.y / 2; // Elevar sobre el tablero
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Añadir etiqueta
        this.addComponentLabel(mesh, config.name);
        
        const component = {
            id: Date.now() + Math.random(),
            type: type,
            mesh: mesh,
            position: position.clone(),
            config: config,
            connections: [],
            state: type === 'switch' ? false : true,
            powered: false
        };
        
        // Añadir interactividad para interruptores
        if (type === 'switch') {
            this.addSwitchInteractivity(component);
        }
        
        return component;
    }
    
    addComponentLabel(mesh, label) {
        // Crear etiqueta de texto (simplificada)
        const labelDiv = document.createElement('div');
        labelDiv.textContent = label;
        labelDiv.style.cssText = `
            position: absolute;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            pointer-events: none;
            z-index: 1000;
        `;
        
        // Posicionar etiqueta (esto requeriría CSS2DRenderer para mejor implementación)
        mesh.userData.label = labelDiv;
    }
    
    addSwitchInteractivity(switchComponent) {
        // Añadir capacidad de cambiar estado del interruptor
        switchComponent.toggle = () => {
            switchComponent.state = !switchComponent.state;
            
            // Cambiar apariencia visual
            if (switchComponent.state) {
                switchComponent.mesh.material.color.setHex(0x4CAF50); // Verde cuando está cerrado
            } else {
                switchComponent.mesh.material.color.setHex(0x607D8B); // Gris cuando está abierto
            }
            
            // Recalcular circuito
            this.updateCircuit();
            
            console.log(`🔘 Interruptor ${switchComponent.state ? 'cerrado' : 'abierto'}`);
        };
    }
    
    screenToWorld(screenPosition) {
        if (!this.camera || !this.canvas) return null;
        
        // Normalizar coordenadas de pantalla
        const rect = this.canvas.getBoundingClientRect();
        const x = ((screenPosition.x - rect.left) / rect.width) * 2 - 1;
        const y = -((screenPosition.y - rect.top) / rect.height) * 2 + 1;
        
        // Crear raycaster
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera({ x, y }, this.camera);
        
        // Intersección con plano Y=0 (tablero)
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        
        if (raycaster.ray.intersectPlane(plane, intersection)) {
            return intersection;
        }
        
        return null;
    }
    
    snapToGrid(position) {
        return new THREE.Vector3(
            Math.round(position.x / this.gridSize) * this.gridSize,
            0,
            Math.round(position.z / this.gridSize) * this.gridSize
        );
    }
    
    isValidPosition(position, componentType) {
        const config = this.componentTypes[componentType];
        if (!config) return false;
        
        // Verificar límites del área de circuito
        if (position.x < this.circuitArea.x.min || position.x > this.circuitArea.x.max ||
            position.z < this.circuitArea.z.min || position.z > this.circuitArea.z.max) {
            return false;
        }
        
        // Verificar colisiones con otros componentes
        for (const component of this.components) {
            const distance = position.distanceTo(component.position);
            if (distance < this.gridSize) {
                return false;
            }
        }
        
        return true;
    }
    
    updateDragPreview(componentType, position) {
        // Remover preview anterior
        if (this.dragPreview) {
            this.scene.remove(this.dragPreview);
            this.dragPreview = null;
        }
        
        // Crear nuevo preview
        const worldPosition = this.screenToWorld(position);
        if (!worldPosition) return;
        
        const snappedPosition = this.snapToGrid(worldPosition);
        const config = this.componentTypes[componentType];
        
        if (config) {
            // Crear geometría preview similar al componente real
            let geometry;
            switch (componentType) {
                case 'bulb':
                    geometry = new THREE.SphereGeometry(config.size.x / 2, 8, 8);
                    break;
                case 'wire':
                case 'motor':
                case 'resistor':
                    geometry = new THREE.CylinderGeometry(
                        config.size.x / 2,
                        config.size.x / 2,
                        Math.max(config.size.y, config.size.z),
                        8
                    );
                    break;
                default:
                    geometry = new THREE.BoxGeometry(
                        config.size.x,
                        config.size.y,
                        config.size.z
                    );
            }
            
            // Material semitransparente
            const material = new THREE.MeshLambertMaterial({
                color: config.color,
                transparent: true,
                opacity: 0.5
            });
            
            this.dragPreview = new THREE.Mesh(geometry, material);
            this.dragPreview.position.copy(snappedPosition);
            this.dragPreview.position.y += config.size.y / 2;
            
            // Verificar si la posición es válida
            const isValid = this.isValidPosition(snappedPosition, componentType);
            this.dragPreview.material.color.setHex(isValid ? config.color : 0xFF0000);
            
            this.scene.add(this.dragPreview);
        }
    }
    
    addToCircuit(component) {
        // Añadir nodos del componente al mapa de circuito
        const nodeId1 = `${component.id}_1`;
        const nodeId2 = `${component.id}_2`;
        
        this.circuit.nodes.set(nodeId1, {
            componentId: component.id,
            position: component.position.clone(),
            voltage: 0,
            connected: []
        });
        
        this.circuit.nodes.set(nodeId2, {
            componentId: component.id,
            position: component.position.clone(),
            voltage: 0,
            connected: []
        });
        
        component.nodes = [nodeId1, nodeId2];
    }
    
    autoConnectWire(wireComponent) {
        // Buscar componentes cercanos para auto-conectar
        const nearbyComponents = this.findNearbyComponents(wireComponent.position, 1.0);
        
        if (nearbyComponents.length >= 2) {
            // Conectar los dos primeros componentes encontrados
            this.createConnection(nearbyComponents[0], nearbyComponents[1], wireComponent);
        }
    }
    
    findNearbyComponents(position, radius) {
        return this.components.filter(component => {
            const distance = position.distanceTo(component.position);
            return distance <= radius && component.type !== 'wire';
        });
    }
    
    createConnection(component1, component2, wireComponent) {
        const connection = {
            id: Date.now() + Math.random(),
            from: component1.id,
            to: component2.id,
            wire: wireComponent ? wireComponent.id : null,
            resistance: wireComponent ? wireComponent.config.resistance : 0.1
        };
        
        this.circuit.connections.push(connection);
        
        // Crear cable visual
        if (wireComponent) {
            this.createVisualWire(component1.position, component2.position, wireComponent);
        }
        
        this.updateCircuit();
        console.log('🔌 Conexión creada entre componentes');
    }
    
    createVisualWire(pos1, pos2, wireComponent) {
        // Crear geometría de cable curvado
        const curve = new THREE.QuadraticBezierCurve3(
            pos1.clone().add(new THREE.Vector3(0, 0.1, 0)),
            new THREE.Vector3((pos1.x + pos2.x) / 2, 0.3, (pos1.z + pos2.z) / 2),
            pos2.clone().add(new THREE.Vector3(0, 0.1, 0))
        );
        
        const points = curve.getPoints(20);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: wireComponent.config.color,
            linewidth: 3
        });
        
        const wireLine = new THREE.Line(geometry, material);
        wireComponent.wireLine = wireLine;
        this.scene.add(wireLine);
    }
    
    updateCircuit() {
        // Resetear estado de componentes
        this.components.forEach(component => {
            component.powered = false;
        });
        
        // Encontrar fuentes de alimentación (baterías)
        const batteries = this.components.filter(c => c.type === 'battery');
        
        if (batteries.length === 0) {
            this.circuit.powered = false;
            this.circuit.current = 0;
            return;
        }
        
        // Análisis simple de circuito
        const battery = batteries[0]; // Usar primera batería
        const circuitPath = this.findCircuitPath(battery);
        
        if (circuitPath.length > 0) {
            this.circuit.powered = true;
            this.circuit.current = this.calculateCurrent(circuitPath);
            
            // Alimentar componentes en el camino
            circuitPath.forEach(componentId => {
                const component = this.components.find(c => c.id === componentId);
                if (component) {
                    component.powered = true;
                    this.updateComponentVisuals(component);
                }
            });
        } else {
            this.circuit.powered = false;
            this.circuit.current = 0;
        }
        
        console.log('🔋 Circuito actualizado:', {
            powered: this.circuit.powered,
            current: this.circuit.current
        });
    }
    
    findCircuitPath(battery) {
        // Implementación simplificada de búsqueda de camino cerrado
        const visited = new Set();
        const path = [];
        
        const dfs = (componentId, targetId = battery.id) => {
            if (visited.has(componentId)) {
                return componentId === targetId && path.length > 2;
            }
            
            visited.add(componentId);
            path.push(componentId);
            
            // Buscar conexiones desde este componente
            const connections = this.circuit.connections.filter(
                conn => conn.from === componentId || conn.to === componentId
            );
            
            for (const connection of connections) {
                const nextId = connection.from === componentId ? connection.to : connection.from;
                const nextComponent = this.components.find(c => c.id === nextId);
                
                // Verificar interruptores
                if (nextComponent && nextComponent.type === 'switch' && !nextComponent.state) {
                    continue; // Saltar si el interruptor está abierto
                }
                
                if (dfs(nextId, targetId)) {
                    return true;
                }
            }
            
            path.pop();
            return false;
        };
        
        if (dfs(battery.id)) {
            return path;
        }
        
        return [];
    }
    
    calculateCurrent(circuitPath) {
        // Cálculo simplificado usando ley de Ohm
        const battery = this.components.find(c => c.type === 'battery');
        if (!battery) return 0;
        
        let totalResistance = 0;
        
        circuitPath.forEach(componentId => {
            const component = this.components.find(c => c.id === componentId);
            if (component && component.config.resistance) {
                totalResistance += component.config.resistance;
            }
        });
        
        return totalResistance > 0 ? battery.config.voltage / totalResistance : 0;
    }
    
    updateComponentVisuals(component) {
        if (!component.powered) return;
        
        switch (component.type) {
            case 'bulb':
                // Hacer que la bombilla brille
                component.mesh.material.emissive.setHex(0x444400);
                component.mesh.material.color.setHex(0xFFFF88);
                
                // Añadir animación de parpadeo
                this.addGlowEffect(component.mesh);
                break;
                
            case 'motor':
                // Hacer que el motor gire
                this.addRotationAnimation(component.mesh);
                break;
                
            case 'wire':
                // Cambiar color del cable para mostrar flujo de corriente
                if (component.wireLine) {
                    component.wireLine.material.color.setHex(0x00FF00);
                    this.addCurrentFlowEffect(component.wireLine);
                }
                break;
        }
    }
    
    addGlowEffect(mesh) {
        // Efecto de brillo para bombillas
        const glowAnimation = () => {
            const time = Date.now() * 0.005;
            const intensity = 0.1 + 0.05 * Math.sin(time);
            mesh.material.emissive.setRGB(intensity, intensity, 0);
        };
        
        mesh.userData.animationLoop = glowAnimation;
    }
    
    addRotationAnimation(mesh) {
        // Animación de rotación para motores
        const rotateAnimation = () => {
            mesh.rotation.y += 0.1;
        };
        
        mesh.userData.animationLoop = rotateAnimation;
    }
    
    addCurrentFlowEffect(wireLine) {
        // Efecto de flujo de corriente en cables
        // Esto podría implementarse con shaders para un efecto más avanzado
        const flowAnimation = () => {
            const time = Date.now() * 0.003;
            const opacity = 0.7 + 0.3 * Math.sin(time);
            wireLine.material.opacity = opacity;
        };
        
        wireLine.userData.animationLoop = flowAnimation;
    }
    
    getCircuitStatus() {
        const componentTypes = this.components.map(c => c.type);
        const uniqueTypes = [...new Set(componentTypes)];
        
        return {
            components: uniqueTypes,
            componentCount: this.components.length,
            connected: this.circuit.powered,
            current: this.circuit.current,
            voltage: this.circuit.powered ? 9 : 0 // Voltaje de la batería
        };
    }
    
    clearScene() {
        // Remover todos los componentes
        for (const component of this.components) {
            this.scene.remove(component.mesh);
            if (component.wireLine) {
                this.scene.remove(component.wireLine);
            }
        }
        this.components = [];
        this.wires = [];
        
        // Limpiar circuito
        this.circuit.nodes.clear();
        this.circuit.connections = [];
        this.circuit.powered = false;
        this.circuit.current = 0;
        
        // Remover preview
        if (this.dragPreview) {
            this.scene.remove(this.dragPreview);
            this.dragPreview = null;
        }
        
        console.log('🧹 Escena de circuitos limpiada');
    }
    
    show() {
        this.isVisible = true;
        // Cambiar renderer a escena de circuitos
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
        console.log('👁️ Vista de circuitos activada');
    }
    
    hide() {
        this.isVisible = false;
        console.log('🙈 Vista de circuitos oculta');
    }
    
    // Loop de renderizado para animaciones
    update() {
        if (!this.isVisible) return;
        
        // Actualizar animaciones de componentes
        this.components.forEach(component => {
            if (component.mesh.userData.animationLoop) {
                component.mesh.userData.animationLoop();
            }
            if (component.wireLine && component.wireLine.userData.animationLoop) {
                component.wireLine.userData.animationLoop();
            }
        });
        
        // Actualizar controles
        if (this.controls) {
            this.controls.update();
        }
        
        // Renderizar escena
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}
