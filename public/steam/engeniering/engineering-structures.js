// ========== ENGINEERING STRUCTURES - Sistema de Construcción 3D ==========

export class EngineeringStructures {
    constructor(canvas, physics) {
        this.canvas = canvas;
        this.physics = physics;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.blocks = [];
        this.dragPreview = null;
        this.isVisible = true;
        
        // Configuración de bloques
        this.blockTypes = {
            cube: {
                name: 'Cubo',
                size: { x: 1, y: 1, z: 1 },
                color: 0x4CAF50,
                mass: 1,
                strength: 100
            },
            brick: {
                name: 'Ladrillo',
                size: { x: 2, y: 0.5, z: 1 },
                color: 0xFF5722,
                mass: 2,
                strength: 150
            },
            beam: {
                name: 'Viga',
                size: { x: 4, y: 0.5, z: 0.5 },
                color: 0x795548,
                mass: 3,
                strength: 200
            },
            plate: {
                name: 'Placa',
                size: { x: 2, y: 0.2, z: 2 },
                color: 0x9E9E9E,
                mass: 1.5,
                strength: 80
            },
            triangle: {
                name: 'Triángulo',
                size: { x: 1, y: 1, z: 1 },
                color: 0xE91E63,
                mass: 0.8,
                strength: 120
            },
            cylinder: {
                name: 'Cilindro',
                size: { x: 1, y: 2, z: 1 },
                color: 0x3F51B5,
                mass: 1.2,
                strength: 110
            }
        };
        
        // Grid y snapping
        this.gridSize = 0.5;
        this.buildArea = {
            x: { min: -5, max: 5 },
            y: { min: 0, max: 10 },
            z: { min: -5, max: 5 }
        };
    }
    
    async init() {
        try {
            console.log('🏗️ Inicializando sistema de estructuras...');
            
            // Crear escena Three.js
            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x1a1a2e);
            
            // Configurar cámara
            this.camera = new THREE.PerspectiveCamera(
                75,
                this.canvas.clientWidth / this.canvas.clientHeight,
                0.1,
                1000
            );
            this.camera.position.set(8, 6, 8);
            this.camera.lookAt(0, 0, 0);
            
            // Configurar renderer
            this.renderer = new THREE.WebGLRenderer({ 
                canvas: this.canvas,
                antialias: true,
                alpha: true
            });
            this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // Añadir luces
            this.setupLighting();
            
            // Crear grid de construcción
            this.createBuildGrid();
            
            // Configurar controles
            this.setupControls();
            
            // Iniciar loop de renderizado
            this.startRenderLoop();
            
            console.log('✅ Sistema de estructuras inicializado');
            
        } catch (error) {
            console.error('❌ Error inicializando estructuras:', error);
            throw error;
        }
    }
    
    setupLighting() {
        // Luz ambiental
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Luz direccional (sol)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        this.scene.add(directionalLight);
        
        // Luz de relleno
        const fillLight = new THREE.DirectionalLight(0x87CEEB, 0.3);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);
    }
    
    createBuildGrid() {
        // Crear grid del suelo
        const gridHelper = new THREE.GridHelper(20, 40, 0x444444, 0x222222);
        gridHelper.position.y = 0;
        this.scene.add(gridHelper);
        
        // Crear plataforma base
        const baseGeometry = new THREE.BoxGeometry(10, 0.1, 10);
        const baseMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x333333,
            transparent: true,
            opacity: 0.8
        });
        const basePlatform = new THREE.Mesh(baseGeometry, baseMaterial);
        basePlatform.position.y = -0.05;
        basePlatform.receiveShadow = true;
        this.scene.add(basePlatform);
    }
    
    setupControls() {
        // Configurar controles orbitales si están disponibles
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.canvas);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.target.set(0, 2, 0);
        }
        
        // Manejar redimensionamiento
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });
    }
    
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    }
    
    startRenderLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            
            if (this.controls) {
                this.controls.update();
            }
            
            // Actualizar física
            if (this.physics) {
                this.physics.update();
            }
            
            // Renderizar solo si es visible
            if (this.isVisible && this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        };
        
        animate();
    }
    
    placeComponent(blockType, position) {
        if (!this.blockTypes[blockType]) {
            console.error('❌ Tipo de bloque no válido:', blockType);
            return false;
        }
        
        // Convertir posición de pantalla a mundo 3D
        const worldPosition = this.screenToWorld(position);
        if (!worldPosition) return false;
        
        // Snap a grid
        const snappedPosition = this.snapToGrid(worldPosition);
        
        // Verificar si la posición es válida
        if (!this.isValidPosition(snappedPosition, blockType)) {
            console.log('⚠️ Posición no válida para colocar bloque');
            return false;
        }
        
        // Crear bloque
        const block = this.createBlock(blockType, snappedPosition);
        if (block) {
            this.blocks.push(block);
            this.scene.add(block.mesh);
            
            // Añadir a simulación física
            if (this.physics) {
                this.physics.addBlock(block);
            }
            
            console.log(`🧱 Bloque ${blockType} colocado en:`, snappedPosition);
            return true;
        }
        
        return false;
    }
    
    createBlock(type, position) {
        const blockConfig = this.blockTypes[type];
        if (!blockConfig) return null;
        
        let geometry;
        
        // Crear geometría según el tipo
        switch (type) {
            case 'cube':
                geometry = new THREE.BoxGeometry(
                    blockConfig.size.x,
                    blockConfig.size.y,
                    blockConfig.size.z
                );
                break;
            case 'brick':
            case 'beam':
            case 'plate':
                geometry = new THREE.BoxGeometry(
                    blockConfig.size.x,
                    blockConfig.size.y,
                    blockConfig.size.z
                );
                break;
            case 'triangle':
                geometry = new THREE.ConeGeometry(
                    blockConfig.size.x / 2,
                    blockConfig.size.y,
                    4
                );
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(
                    blockConfig.size.x / 2,
                    blockConfig.size.x / 2,
                    blockConfig.size.y,
                    16
                );
                break;
            default:
                geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        
        // Material con colores y sombras
        const material = new THREE.MeshLambertMaterial({
            color: blockConfig.color,
            transparent: true,
            opacity: 0.9
        });
        
        // Crear mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Añadir borde
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 0.3
        });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        mesh.add(wireframe);
        
        return {
            id: Date.now() + Math.random(),
            type: type,
            mesh: mesh,
            position: position.clone(),
            config: blockConfig,
            connections: []
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
        
        // Intersección con plano Y=0 (suelo)
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
            Math.max(0, Math.round(position.y / this.gridSize) * this.gridSize),
            Math.round(position.z / this.gridSize) * this.gridSize
        );
    }
    
    isValidPosition(position, blockType) {
        const blockConfig = this.blockTypes[blockType];
        if (!blockConfig) return false;
        
        // Verificar límites del área de construcción
        if (position.x < this.buildArea.x.min || position.x > this.buildArea.x.max ||
            position.y < this.buildArea.y.min || position.y > this.buildArea.y.max ||
            position.z < this.buildArea.z.min || position.z > this.buildArea.z.max) {
            return false;
        }
        
        // Verificar colisiones con otros bloques
        const blockSize = blockConfig.size;
        const blockBounds = {
            min: {
                x: position.x - blockSize.x / 2,
                y: position.y - blockSize.y / 2,
                z: position.z - blockSize.z / 2
            },
            max: {
                x: position.x + blockSize.x / 2,
                y: position.y + blockSize.y / 2,
                z: position.z + blockSize.z / 2
            }
        };
        
        for (const block of this.blocks) {
            const otherSize = block.config.size;
            const otherBounds = {
                min: {
                    x: block.position.x - otherSize.x / 2,
                    y: block.position.y - otherSize.y / 2,
                    z: block.position.z - otherSize.z / 2
                },
                max: {
                    x: block.position.x + otherSize.x / 2,
                    y: block.position.y + otherSize.y / 2,
                    z: block.position.z + otherSize.z / 2
                }
            };
            
            // Verificar intersección
            if (this.boundsIntersect(blockBounds, otherBounds)) {
                return false;
            }
        }
        
        return true;
    }
    
    boundsIntersect(bounds1, bounds2) {
        return (bounds1.min.x < bounds2.max.x && bounds1.max.x > bounds2.min.x) &&
               (bounds1.min.y < bounds2.max.y && bounds1.max.y > bounds2.min.y) &&
               (bounds1.min.z < bounds2.max.z && bounds1.max.z > bounds2.min.z);
    }
    
    updateDragPreview(blockType, position) {
        // Remover preview anterior
        if (this.dragPreview) {
            this.scene.remove(this.dragPreview);
            this.dragPreview = null;
        }
        
        // Crear nuevo preview
        const worldPosition = this.screenToWorld(position);
        if (!worldPosition) return;
        
        const snappedPosition = this.snapToGrid(worldPosition);
        const blockConfig = this.blockTypes[blockType];
        
        if (blockConfig) {
            // Crear geometría preview
            let geometry;
            switch (blockType) {
                case 'triangle':
                    geometry = new THREE.ConeGeometry(
                        blockConfig.size.x / 2,
                        blockConfig.size.y,
                        4
                    );
                    break;
                case 'cylinder':
                    geometry = new THREE.CylinderGeometry(
                        blockConfig.size.x / 2,
                        blockConfig.size.x / 2,
                        blockConfig.size.y,
                        16
                    );
                    break;
                default:
                    geometry = new THREE.BoxGeometry(
                        blockConfig.size.x,
                        blockConfig.size.y,
                        blockConfig.size.z
                    );
            }
            
            // Material semitransparente
            const material = new THREE.MeshLambertMaterial({
                color: blockConfig.color,
                transparent: true,
                opacity: 0.5,
                wireframe: false
            });
            
            this.dragPreview = new THREE.Mesh(geometry, material);
            this.dragPreview.position.copy(snappedPosition);
            
            // Verificar si la posición es válida
            const isValid = this.isValidPosition(snappedPosition, blockType);
            this.dragPreview.material.color.setHex(isValid ? blockConfig.color : 0xFF0000);
            
            this.scene.add(this.dragPreview);
        }
    }
    
    getStructureStatus() {
        // Calcular estadísticas de la estructura
        const blockCount = this.blocks.length;
        let maxHeight = 0;
        let totalMass = 0;
        let centerOfMass = new THREE.Vector3(0, 0, 0);
        
        // Calcular propiedades físicas
        for (const block of this.blocks) {
            const blockTop = block.position.y + block.config.size.y / 2;
            maxHeight = Math.max(maxHeight, blockTop);
            totalMass += block.config.mass;
            
            // Contribuir al centro de masa
            centerOfMass.add(
                block.position.clone().multiplyScalar(block.config.mass)
            );
        }
        
        if (totalMass > 0) {
            centerOfMass.divideScalar(totalMass);
        }
        
        // Calcular estabilidad
        const stability = this.calculateStability(centerOfMass, maxHeight);
        
        return {
            blockCount,
            height: Math.max(0, Math.round(maxHeight * 2)), // Convertir a bloques
            stability: Math.max(0, Math.min(100, stability)),
            centerOfMass,
            totalMass
        };
    }
    
    calculateStability(centerOfMass, height) {
        if (this.blocks.length === 0) return 0;
        
        // Factores de estabilidad
        let stabilityScore = 100;
        
        // Penalizar centro de masa desplazado del centro
        const centerOffset = Math.sqrt(centerOfMass.x * centerOfMass.x + centerOfMass.z * centerOfMass.z);
        stabilityScore -= centerOffset * 20;
        
        // Penalizar altura excesiva sin base adecuada
        const baseBlocks = this.blocks.filter(block => block.position.y < 1).length;
        const heightPenalty = Math.max(0, (height - baseBlocks * 2) * 5);
        stabilityScore -= heightPenalty;
        
        // Bonificar distribución uniforme de bloques
        const distributionBonus = Math.min(20, baseBlocks * 2);
        stabilityScore += distributionBonus;
        
        // Verificar conexiones estructurales
        const connectionBonus = this.calculateConnectionBonus();
        stabilityScore += connectionBonus;
        
        return Math.max(0, Math.min(100, stabilityScore));
    }
    
    calculateConnectionBonus() {
        // Bonificar bloques bien conectados
        let bonus = 0;
        
        for (const block of this.blocks) {
            const connections = this.findConnectedBlocks(block);
            bonus += Math.min(10, connections.length * 2);
        }
        
        return Math.min(30, bonus);
    }
    
    findConnectedBlocks(block) {
        const connections = [];
        const tolerance = 0.1;
        
        for (const otherBlock of this.blocks) {
            if (otherBlock === block) continue;
            
            const distance = block.position.distanceTo(otherBlock.position);
            const maxDistance = Math.max(
                block.config.size.x + otherBlock.config.size.x,
                block.config.size.y + otherBlock.config.size.y,
                block.config.size.z + otherBlock.config.size.z
            ) / 2 + tolerance;
            
            if (distance <= maxDistance) {
                connections.push(otherBlock);
            }
        }
        
        return connections;
    }
    
    clearScene() {
        // Remover todos los bloques
        for (const block of this.blocks) {
            this.scene.remove(block.mesh);
            if (this.physics) {
                this.physics.removeBlock(block);
            }
        }
        this.blocks = [];
        
        // Remover preview
        if (this.dragPreview) {
            this.scene.remove(this.dragPreview);
            this.dragPreview = null;
        }
        
        console.log('🧹 Escena de estructuras limpiada');
    }
    
    show() {
        this.isVisible = true;
        if (this.canvas) {
            this.canvas.style.display = 'block';
        }
        console.log('👁️ Vista de estructuras activada');
    }
    
    hide() {
        this.isVisible = false;
        if (this.canvas) {
            this.canvas.style.display = 'none';
        }
        console.log('🙈 Vista de estructuras oculta');
    }
}
