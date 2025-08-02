// ========== ENGINEERING PHYSICS - Sistema de Simulación Física ==========

export class EngineeringPhysics {
    constructor() {
        this.world = null;
        this.bodies = new Map();
        this.constraints = [];
        this.gravity = { x: 0, y: -9.81, z: 0 };
        this.timeStep = 1/60;
        this.maxSubSteps = 10;
        this.isRunning = false;
        
        // Configuración de materiales
        this.materials = {
            default: {
                friction: 0.4,
                restitution: 0.3,
                density: 1.0
            },
            wood: {
                friction: 0.6,
                restitution: 0.2,
                density: 0.8
            },
            metal: {
                friction: 0.3,
                restitution: 0.5,
                density: 2.5
            },
            plastic: {
                friction: 0.4,
                restitution: 0.4,
                density: 1.2
            }
        };
        
        // Simulación simplificada (sin Cannon.js)
        this.simulatedBodies = [];
        this.lastTime = 0;
    }
    
    async init() {
        try {
            console.log('⚙️ Inicializando sistema de física...');
            
            // Por simplicidad, usar simulación básica sin librerías externas
            this.initSimplePhysics();
            
            this.isRunning = true;
            console.log('✅ Sistema de física inicializado');
            
        } catch (error) {
            console.error('❌ Error inicializando física:', error);
            throw error;
        }
    }
    
    initSimplePhysics() {
        // Inicializar simulación física simplificada
        this.simulatedBodies = [];
        this.lastTime = performance.now();
        
        // Comenzar loop de simulación
        this.startPhysicsLoop();
    }
    
    startPhysicsLoop() {
        const physicsLoop = (currentTime) => {
            if (!this.isRunning) return;
            
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;
            
            // Actualizar simulación
            this.updateSimulation(deltaTime);
            
            requestAnimationFrame(physicsLoop);
        };
        
        requestAnimationFrame(physicsLoop);
    }
    
    updateSimulation(deltaTime) {
        // Integración básica de Euler para posición y velocidad
        for (const body of this.simulatedBodies) {
            if (body.isStatic) continue;
            
            // Aplicar gravedad
            body.velocity.y += this.gravity.y * deltaTime;
            
            // Actualizar posición
            body.position.x += body.velocity.x * deltaTime;
            body.position.y += body.velocity.y * deltaTime;
            body.position.z += body.velocity.z * deltaTime;
            
            // Verificar colisiones con el suelo
            this.checkGroundCollision(body);
            
            // Verificar colisiones entre cuerpos
            this.checkBodyCollisions(body);
            
            // Aplicar amortiguamiento
            body.velocity.x *= 0.99;
            body.velocity.z *= 0.99;
            
            // Actualizar mesh de Three.js si existe
            if (body.mesh) {
                body.mesh.position.copy(body.position);
                body.mesh.rotation.set(body.rotation.x, body.rotation.y, body.rotation.z);
            }
        }
    }
    
    checkGroundCollision(body) {
        const groundLevel = body.size.y / 2; // Mitad de la altura del objeto
        
        if (body.position.y <= groundLevel) {
            body.position.y = groundLevel;
            body.velocity.y = Math.max(0, -body.velocity.y * 0.3); // Rebote amortiguado
            
            // Aplicar fricción horizontal
            body.velocity.x *= 0.8;
            body.velocity.z *= 0.8;
        }
    }
    
    checkBodyCollisions(body1) {
        for (const body2 of this.simulatedBodies) {
            if (body1 === body2) continue;
            
            const collision = this.detectCollision(body1, body2);
            if (collision.isColliding) {
                this.resolveCollision(body1, body2, collision);
            }
        }
    }
    
    detectCollision(body1, body2) {
        // Detección de colisión AABB (Axis-Aligned Bounding Box)
        const dx = Math.abs(body1.position.x - body2.position.x);
        const dy = Math.abs(body1.position.y - body2.position.y);
        const dz = Math.abs(body1.position.z - body2.position.z);
        
        const combinedHalfWidth = (body1.size.x + body2.size.x) / 2;
        const combinedHalfHeight = (body1.size.y + body2.size.y) / 2;
        const combinedHalfDepth = (body1.size.z + body2.size.z) / 2;
        
        const isColliding = dx < combinedHalfWidth && 
                           dy < combinedHalfHeight && 
                           dz < combinedHalfDepth;
        
        return {
            isColliding,
            overlap: {
                x: combinedHalfWidth - dx,
                y: combinedHalfHeight - dy,
                z: combinedHalfDepth - dz
            }
        };
    }
    
    resolveCollision(body1, body2, collision) {
        if (body1.isStatic && body2.isStatic) return;
        
        // Encontrar la dirección de menor penetración
        const overlap = collision.overlap;
        let separationAxis = 'y'; // Por defecto separar verticalmente
        let minOverlap = overlap.y;
        
        if (overlap.x < minOverlap) {
            separationAxis = 'x';
            minOverlap = overlap.x;
        }
        if (overlap.z < minOverlap) {
            separationAxis = 'z';
            minOverlap = overlap.z;
        }
        
        // Separar los cuerpos
        const separation = minOverlap / 2;
        
        if (!body1.isStatic && !body2.isStatic) {
            // Ambos cuerpos se mueven
            const direction = body1.position[separationAxis] > body2.position[separationAxis] ? 1 : -1;
            body1.position[separationAxis] += direction * separation;
            body2.position[separationAxis] -= direction * separation;
            
            // Intercambiar velocidades (colisión elástica simplificada)
            const temp = body1.velocity[separationAxis];
            body1.velocity[separationAxis] = body2.velocity[separationAxis] * 0.8;
            body2.velocity[separationAxis] = temp * 0.8;
        } else if (!body1.isStatic) {
            // Solo body1 se mueve
            const direction = body1.position[separationAxis] > body2.position[separationAxis] ? 1 : -1;
            body1.position[separationAxis] += direction * minOverlap;
            body1.velocity[separationAxis] = -body1.velocity[separationAxis] * 0.5;
        } else if (!body2.isStatic) {
            // Solo body2 se mueve
            const direction = body2.position[separationAxis] > body1.position[separationAxis] ? 1 : -1;
            body2.position[separationAxis] += direction * minOverlap;
            body2.velocity[separationAxis] = -body2.velocity[separationAxis] * 0.5;
        }
    }
    
    addBlock(block) {
        // Crear cuerpo físico para el bloque
        const physicsBody = {
            id: block.id,
            mesh: block.mesh,
            position: block.position.clone(),
            velocity: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            angularVelocity: { x: 0, y: 0, z: 0 },
            size: block.config.size,
            mass: block.config.mass,
            isStatic: false,
            material: this.materials.default,
            block: block
        };
        
        this.simulatedBodies.push(physicsBody);
        this.bodies.set(block.id, physicsBody);
        
        console.log(`⚙️ Bloque añadido a simulación física: ${block.type}`);
        return physicsBody;
    }
    
    removeBlock(block) {
        const bodyIndex = this.simulatedBodies.findIndex(body => body.id === block.id);
        if (bodyIndex !== -1) {
            this.simulatedBodies.splice(bodyIndex, 1);
            this.bodies.delete(block.id);
            console.log(`⚙️ Bloque removido de simulación física: ${block.type}`);
        }
    }
    
    getBlockStability(blockId) {
        const body = this.bodies.get(blockId);
        if (!body) return 0;
        
        // Calcular estabilidad basada en:
        // 1. Velocidad (menor velocidad = más estable)
        // 2. Posición (cerca del suelo = más estable)
        // 3. Soporte (bloques debajo = más estable)
        
        const velocityMagnitude = Math.sqrt(
            body.velocity.x * body.velocity.x +
            body.velocity.y * body.velocity.y +
            body.velocity.z * body.velocity.z
        );
        
        const stabilityFromVelocity = Math.max(0, 100 - velocityMagnitude * 50);
        const stabilityFromHeight = Math.max(0, 100 - body.position.y * 10);
        const supportStability = this.calculateSupportStability(body);
        
        return Math.min(100, (stabilityFromVelocity + stabilityFromHeight + supportStability) / 3);
    }
    
    calculateSupportStability(body) {
        // Verificar cuántos bloques están debajo de este
        let supportCount = 0;
        const supportThreshold = body.size.y + 0.1; // Tolerancia
        
        for (const otherBody of this.simulatedBodies) {
            if (otherBody === body) continue;
            
            // Verificar si está debajo y cerca horizontalmente
            const isBelow = otherBody.position.y < body.position.y - supportThreshold;
            const horizontalDistance = Math.sqrt(
                Math.pow(body.position.x - otherBody.position.x, 2) +
                Math.pow(body.position.z - otherBody.position.z, 2)
            );
            
            if (isBelow && horizontalDistance < Math.max(body.size.x, body.size.z)) {
                supportCount++;
            }
        }
        
        return Math.min(100, supportCount * 25);
    }
    
    calculateOverallStability() {
        if (this.simulatedBodies.length === 0) return 100;
        
        let totalStability = 0;
        let weightedSum = 0;
        
        for (const body of this.simulatedBodies) {
            const stability = this.getBlockStability(body.id);
            const weight = body.mass;
            
            totalStability += stability * weight;
            weightedSum += weight;
        }
        
        return weightedSum > 0 ? totalStability / weightedSum : 0;
    }
    
    getCenterOfMass() {
        if (this.simulatedBodies.length === 0) {
            return { x: 0, y: 0, z: 0 };
        }
        
        let totalMass = 0;
        let centerOfMass = { x: 0, y: 0, z: 0 };
        
        for (const body of this.simulatedBodies) {
            centerOfMass.x += body.position.x * body.mass;
            centerOfMass.y += body.position.y * body.mass;
            centerOfMass.z += body.position.z * body.mass;
            totalMass += body.mass;
        }
        
        if (totalMass > 0) {
            centerOfMass.x /= totalMass;
            centerOfMass.y /= totalMass;
            centerOfMass.z /= totalMass;
        }
        
        return centerOfMass;
    }
    
    simulateStressTest() {
        // Aplicar fuerzas aleatorias pequeñas para probar estabilidad
        for (const body of this.simulatedBodies) {
            if (body.isStatic) continue;
            
            // Aplicar fuerza lateral pequeña
            const forceX = (Math.random() - 0.5) * 0.1;
            const forceZ = (Math.random() - 0.5) * 0.1;
            
            body.velocity.x += forceX;
            body.velocity.z += forceZ;
        }
        
        console.log('🧪 Prueba de estrés aplicada a la estructura');
    }
    
    applyForce(blockId, force) {
        const body = this.bodies.get(blockId);
        if (!body || body.isStatic) return;
        
        // Aplicar fuerza como cambio de velocidad
        body.velocity.x += force.x / body.mass;
        body.velocity.y += force.y / body.mass;
        body.velocity.z += force.z / body.mass;
    }
    
    setGravity(gravity) {
        this.gravity = { ...gravity };
        console.log('🌍 Gravedad actualizada:', this.gravity);
    }
    
    pause() {
        this.isRunning = false;
        console.log('⏸️ Simulación física pausada');
    }
    
    resume() {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.startPhysicsLoop();
        console.log('▶️ Simulación física reanudada');
    }
    
    reset() {
        this.simulatedBodies = [];
        this.bodies.clear();
        this.constraints = [];
        console.log('🔄 Simulación física reseteada');
    }
    
    update() {
        // Este método se llama desde el loop principal
        // La actualización real se hace en updateSimulation
        if (!this.isRunning) return;
        
        // Verificar si algún cuerpo se ha caído fuera del área
        for (const body of this.simulatedBodies) {
            if (body.position.y < -10) {
                // Eliminar cuerpos que han caído muy bajo
                this.removeBlock(body.block);
            }
        }
    }
    
    getPhysicsStats() {
        return {
            bodyCount: this.simulatedBodies.length,
            isRunning: this.isRunning,
            gravity: this.gravity,
            centerOfMass: this.getCenterOfMass(),
            overallStability: this.calculateOverallStability()
        };
    }
    
    cleanup() {
        this.pause();
        this.reset();
        console.log('🧹 Sistema de física limpiado');
    }
}
