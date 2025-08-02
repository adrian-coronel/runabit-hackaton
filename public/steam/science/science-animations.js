// ========== SCIENCE ANIMATIONS - Sistema de Animaciones para Experimentos ==========

export class ScienceAnimations {
    constructor() {
        this.activeAnimations = [];
        this.animationFrameIds = [];
    }
    
    // Mostrar animación de reacción según el tipo
    async showReactionAnimation(container, type) {
        switch(type) {
            case 'bubble':
                return this.bubbleReaction(container);
            case 'layers':
                return this.layerSeparation(container);
            case 'rainbow':
                return this.rainbowMovement(container);
            case 'crystals':
                return this.crystalFormation(container);
            case 'dissolve':
                return this.dissolutionAnimation(container);
            default:
                return this.genericReaction(container);
        }
    }
    
    // Animación de reacción burbujeante (vinagre + bicarbonato)
    async bubbleReaction(container) {
        return new Promise((resolve) => {
            // Cambiar color del contenedor
            container.style.background = 'linear-gradient(145deg, #ffeb3b, #ff9800)';
            container.classList.add('bubble-animation');
            
            // Crear burbujas
            this.createBubbles(container, 30, {
                color: '#ffffff',
                duration: 3000,
                size: { min: 5, max: 20 }
            });
            
            // Efecto de espuma
            this.createFoamEffect(container);
            
            // Sonido de burbujeo (simulado con vibración visual)
            this.createVibrateEffect(container, 2000);
            
            setTimeout(() => {
                container.classList.remove('bubble-animation');
                resolve();
            }, 3000);
        });
    }
    
    // Animación de separación por densidad (agua + aceite)
    async layerSeparation(container) {
        return new Promise((resolve) => {
            const bowlContent = container.querySelector('.bowl-content');
            if (!bowlContent) return resolve();
            
            // Crear capas gradualmente
            bowlContent.innerHTML = `
                <div class="layer-animation">
                    <div class="layer oil-layer"></div>
                    <div class="layer water-layer"></div>
                </div>
            `;
            
            // CSS para las capas
            const style = document.createElement('style');
            style.textContent = `
                .layer-animation {
                    position: absolute;
                    inset: 0;
                    border-radius: 50%;
                    overflow: hidden;
                }
                .layer {
                    position: absolute;
                    left: 0;
                    right: 0;
                    transition: all 2s ease-out;
                }
                .oil-layer {
                    top: 0;
                    height: 40%;
                    background: linear-gradient(180deg, #ff9800, #ff8f00);
                    transform: translateY(-100%);
                }
                .water-layer {
                    bottom: 0;
                    height: 60%;
                    background: linear-gradient(0deg, #2196f3, #03a9f4);
                    transform: translateY(100%);
                }
                .layer-animation.active .oil-layer {
                    transform: translateY(0);
                }
                .layer-animation.active .water-layer {
                    transform: translateY(0);
                }
            `;
            document.head.appendChild(style);
            
            // Activar animación
            setTimeout(() => {
                bowlContent.querySelector('.layer-animation').classList.add('active');
            }, 500);
            
            setTimeout(() => {
                document.head.removeChild(style);
                resolve();
            }, 3000);
        });
    }
    
    // Animación de arcoíris en movimiento (jabón + colorante)
    async rainbowMovement(container) {
        return new Promise((resolve) => {
            const bowlContent = container.querySelector('.bowl-content');
            if (!bowlContent) return resolve();
            
            // Crear efecto de colores en movimiento
            bowlContent.innerHTML = `
                <div class="rainbow-animation">
                    <div class="color-swirl" style="--color: #ff0000; --delay: 0s;"></div>
                    <div class="color-swirl" style="--color: #ff8000; --delay: 0.2s;"></div>
                    <div class="color-swirl" style="--color: #ffff00; --delay: 0.4s;"></div>
                    <div class="color-swirl" style="--color: #00ff00; --delay: 0.6s;"></div>
                    <div class="color-swirl" style="--color: #0080ff; --delay: 0.8s;"></div>
                    <div class="color-swirl" style="--color: #8000ff; --delay: 1s;"></div>
                </div>
            `;
            
            // CSS para el efecto arcoíris
            const style = document.createElement('style');
            style.textContent = `
                .rainbow-animation {
                    position: absolute;
                    inset: 0;
                    border-radius: 50%;
                    overflow: hidden;
                }
                .color-swirl {
                    position: absolute;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    background: radial-gradient(circle, var(--color), transparent);
                    animation: swirl 3s ease-in-out var(--delay) infinite;
                }
                @keyframes swirl {
                    0% { 
                        transform: translate(50%, 50%) scale(0) rotate(0deg);
                        opacity: 0;
                    }
                    25% { 
                        transform: translate(20%, 30%) scale(1) rotate(90deg);
                        opacity: 1;
                    }
                    50% { 
                        transform: translate(80%, 70%) scale(1.2) rotate(180deg);
                        opacity: 0.8;
                    }
                    75% { 
                        transform: translate(30%, 80%) scale(0.8) rotate(270deg);
                        opacity: 0.6;
                    }
                    100% { 
                        transform: translate(70%, 20%) scale(0) rotate(360deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
            
            setTimeout(() => {
                document.head.removeChild(style);
                resolve();
            }, 4000);
        });
    }
    
    // Animación de formación de cristales (agua + sal)
    async crystalFormation(container) {
        return new Promise((resolve) => {
            const bowlContent = container.querySelector('.bowl-content');
            if (!bowlContent) return resolve();
            
            // Crear cristales que aparecen gradualmente
            bowlContent.innerHTML = '<div class="crystal-formation"></div>';
            
            const crystalContainer = bowlContent.querySelector('.crystal-formation');
            
            // Crear múltiples cristales
            for (let i = 0; i < 15; i++) {
                setTimeout(() => {
                    this.createCrystal(crystalContainer, i);
                }, i * 200);
            }
            
            setTimeout(() => {
                resolve();
            }, 4000);
        });
    }
    
    // Animación de disolución (agua + azúcar)
    async dissolutionAnimation(container) {
        return new Promise((resolve) => {
            const bowlContent = container.querySelector('.bowl-content');
            if (!bowlContent) return resolve();
            
            // Efecto de disolución gradual
            bowlContent.innerHTML = `
                <div class="dissolution-animation">
                    <div class="dissolving-particles"></div>
                    <div class="solution-color"></div>
                </div>
            `;
            
            const particlesContainer = bowlContent.querySelector('.dissolving-particles');
            const solutionColor = bowlContent.querySelector('.solution-color');
            
            // Crear partículas que se disuelven
            for (let i = 0; i < 20; i++) {
                setTimeout(() => {
                    this.createDissolvingParticle(particlesContainer);
                }, i * 100);
            }
            
            // Cambio gradual de color de la solución
            setTimeout(() => {
                solutionColor.style.background = 'linear-gradient(145deg, #ffc107, #ff8f00)';
                solutionColor.style.opacity = '0.6';
                solutionColor.style.transition = 'all 2s ease-out';
            }, 1000);
            
            setTimeout(() => {
                resolve();
            }, 3500);
        });
    }
    
    // Animación genérica para reacciones no específicas
    async genericReaction(container) {
        return new Promise((resolve) => {
            container.style.background = 'linear-gradient(145deg, #4caf50, #2e7d32)';
            
            // Efecto de pulso suave
            let pulseCount = 0;
            const pulseInterval = setInterval(() => {
                container.style.transform = `scale(${1 + Math.sin(pulseCount * 0.5) * 0.05})`;
                pulseCount++;
                
                if (pulseCount > 20) {
                    clearInterval(pulseInterval);
                    container.style.transform = 'scale(1)';
                    resolve();
                }
            }, 100);
        });
    }
    
    // Crear burbujas flotantes
    createBubbles(container, count, options = {}) {
        const defaults = {
            color: '#ffffff',
            duration: 2000,
            size: { min: 5, max: 15 }
        };
        const config = { ...defaults, ...options };
        
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const bubble = document.createElement('div');
                bubble.className = 'floating-bubble';
                
                const size = Math.random() * (config.size.max - config.size.min) + config.size.min;
                const startX = Math.random() * container.offsetWidth;
                
                bubble.style.cssText = `
                    position: absolute;
                    left: ${startX}px;
                    bottom: 0;
                    width: ${size}px;
                    height: ${size}px;
                    background: ${config.color};
                    border-radius: 50%;
                    opacity: 0.8;
                    pointer-events: none;
                    animation: float-up ${config.duration}ms ease-out forwards;
                `;
                
                container.appendChild(bubble);
                
                setTimeout(() => {
                    if (bubble.parentNode) {
                        bubble.parentNode.removeChild(bubble);
                    }
                }, config.duration);
            }, i * 50);
        }
    }
    
    // Crear efecto de espuma
    createFoamEffect(container) {
        const foam = document.createElement('div');
        foam.className = 'foam-effect';
        foam.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 30%;
            background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.8), transparent);
            border-radius: 50% 50% 0 0;
            animation: foam-bubble 2s ease-in-out infinite;
        `;
        
        container.appendChild(foam);
        
        setTimeout(() => {
            if (foam.parentNode) {
                foam.parentNode.removeChild(foam);
            }
        }, 3000);
    }
    
    // Crear efecto de vibración
    createVibrateEffect(container, duration) {
        let startTime = Date.now();
        const originalTransform = container.style.transform;
        
        const vibrate = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed < duration) {
                const intensity = Math.max(0, 1 - elapsed / duration) * 2;
                const x = (Math.random() - 0.5) * intensity;
                const y = (Math.random() - 0.5) * intensity;
                container.style.transform = `${originalTransform} translate(${x}px, ${y}px)`;
                requestAnimationFrame(vibrate);
            } else {
                container.style.transform = originalTransform;
            }
        };
        
        vibrate();
    }
    
    // Crear un cristal individual
    createCrystal(container, index) {
        const crystal = document.createElement('div');
        crystal.className = 'crystal';
        
        const size = Math.random() * 8 + 4;
        const x = Math.random() * 80 + 10;
        const y = Math.random() * 80 + 10;
        const rotation = Math.random() * 360;
        
        crystal.style.cssText = `
            position: absolute;
            left: ${x}%;
            top: ${y}%;
            width: ${size}px;
            height: ${size}px;
            background: linear-gradient(45deg, #e3f2fd, #ffffff);
            border: 1px solid #2196f3;
            transform: rotate(${rotation}deg);
            opacity: 0;
            animation: crystal-appear 1s ease-out forwards;
            animation-delay: ${index * 0.1}s;
        `;
        
        // Agregar CSS para la animación si no existe
        if (!document.querySelector('#crystal-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'crystal-animation-styles';
            style.textContent = `
                @keyframes crystal-appear {
                    0% {
                        opacity: 0;
                        transform: scale(0) rotate(${rotation}deg);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1.2) rotate(${rotation}deg);
                    }
                    100% {
                        opacity: 0.9;
                        transform: scale(1) rotate(${rotation}deg);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        container.appendChild(crystal);
    }
    
    // Crear partícula que se disuelve
    createDissolvingParticle(container) {
        const particle = document.createElement('div');
        particle.className = 'dissolving-particle';
        
        const size = Math.random() * 6 + 3;
        const x = Math.random() * 80 + 10;
        const y = Math.random() * 60 + 20;
        
        particle.style.cssText = `
            position: absolute;
            left: ${x}%;
            top: ${y}%;
            width: ${size}px;
            height: ${size}px;
            background: #ffc107;
            border-radius: 2px;
            opacity: 1;
            animation: dissolve-particle 2s ease-out forwards;
        `;
        
        // Agregar CSS para la animación si no existe
        if (!document.querySelector('#dissolve-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'dissolve-animation-styles';
            style.textContent = `
                @keyframes dissolve-particle {
                    0% {
                        opacity: 1;
                        transform: scale(1);
                    }
                    50% {
                        opacity: 0.5;
                        transform: scale(0.8);
                    }
                    100% {
                        opacity: 0;
                        transform: scale(0.2);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        container.appendChild(particle);
        
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 2000);
    }
    
    // Crear efecto de goteo al agregar ingredientes
    createDropEffect(container, color) {
        const drop = document.createElement('div');
        drop.className = 'drop-effect';
        
        const x = Math.random() * container.offsetWidth * 0.6 + container.offsetWidth * 0.2;
        
        drop.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: -20px;
            width: 8px;
            height: 8px;
            background: ${color};
            border-radius: 50%;
            opacity: 0.8;
            animation: drop-fall 1s ease-in forwards;
        `;
        
        // Agregar CSS para la animación si no existe
        if (!document.querySelector('#drop-animation-styles')) {
            const style = document.createElement('style');
            style.id = 'drop-animation-styles';
            style.textContent = `
                @keyframes drop-fall {
                    0% {
                        transform: translateY(0) scale(1);
                        opacity: 0.8;
                    }
                    80% {
                        transform: translateY(${container.offsetHeight + 20}px) scale(1);
                        opacity: 0.8;
                    }
                    100% {
                        transform: translateY(${container.offsetHeight + 20}px) scale(0);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        container.appendChild(drop);
        
        setTimeout(() => {
            if (drop.parentNode) {
                drop.parentNode.removeChild(drop);
            }
        }, 1000);
    }
    
    // Limpiar todas las animaciones activas
    cleanup() {
        this.animationFrameIds.forEach(id => cancelAnimationFrame(id));
        this.animationFrameIds = [];
        this.activeAnimations = [];
        
        // Limpiar estilos dinámicos
        const dynamicStyles = document.querySelectorAll('#crystal-animation-styles, #dissolve-animation-styles, #drop-animation-styles');
        dynamicStyles.forEach(style => {
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        });
    }
    
    // Limpiar animaciones de un contenedor específico
    clearAnimations(container) {
        if (!container) return;
        
        // Remover clases de animación
        const animationClasses = [
            'bubble-animation', 'layer-animation', 'rainbow-animation', 
            'crystal-animation', 'dissolve-animation', 'drop-animation'
        ];
        
        animationClasses.forEach(className => {
            container.classList.remove(className);
        });
        
        // Resetear estilos
        container.style.background = '';
        container.style.transform = '';
        container.style.filter = '';
        
        // Remover elementos dinámicos (burbujas, partículas, etc.)
        const dynamicElements = container.querySelectorAll('.bubble, .particle, .crystal, .drop, .foam');
        dynamicElements.forEach(element => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
    }
}
