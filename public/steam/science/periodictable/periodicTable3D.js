import * as THREE from 'three';
import TWEEN from 'three/addons/libs/tween.module.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { elementsData, categoryConfig, getSelectedElements } from './elementsData.js';

class PeriodicTable3D {
    constructor() {
        this.camera = null;
        this.scene = null;
        this.renderer = null;
        this.controls = null;
        this.objects = [];
        this.targets = { table: [], sphere: [], helix: [], grid: [] };
        this.selectedElements = new Set();
        this.elementObjects = new Map(); // Mapeo de símbolo a objeto 3D

        this.init();
        this.setupControls();
        this.createElementControlPanel();
        this.animate();
    }

    init() {
        // Configurar cámara
        this.camera = new THREE.PerspectiveCamera(
            40,
            window.innerWidth / window.innerHeight,
            1,
            10000
        );
        this.camera.position.z = 3000;

        // Crear escena
        this.scene = new THREE.Scene();

        // Inicializar con todos los elementos seleccionados
        elementsData.forEach(element => {
            this.selectedElements.add(element.symbol);
        });

        this.createElements();
        this.setupRenderer();
        this.setupTrackballControls();
        this.setupEventListeners();

        // Empezar en vista de tabla
        this.transform(this.targets.table, 2000);
    }

    createElements() {
        // Limpiar objetos existentes
        this.objects.forEach(obj => {
            this.scene.remove(obj);
        });
        this.objects = [];
        this.targets = { table: [], sphere: [], helix: [], grid: [] };
        this.elementObjects.clear();

        const elementsToShow = Array.from(this.selectedElements)
            .map(symbol => elementsData.find(el => el.symbol === symbol))
            .filter(Boolean);

        elementsToShow.forEach((elementData, index) => {
            const element = this.createElementDiv(elementData);
            const objectCSS = new CSS3DObject(element);

            // Posición inicial aleatoria
            objectCSS.position.x = Math.random() * 4000 - 2000;
            objectCSS.position.y = Math.random() * 4000 - 2000;
            objectCSS.position.z = Math.random() * 4000 - 2000;

            this.scene.add(objectCSS);
            this.objects.push(objectCSS);
            this.elementObjects.set(elementData.symbol, objectCSS);

            // Crear posiciones objetivo para diferentes layouts
            this.createTargetPositions(elementData, index, elementsToShow.length);
        });
    }

    createElementDiv(elementData) {
        const element = document.createElement('div');
        element.className = `element ${elementData.category}`;
        element.style.backgroundColor = categoryConfig[elementData.category]?.color || 'rgba(0,127,127,0.4)';

        // Número atómico
        const number = document.createElement('div');
        number.className = 'number';
        number.textContent = elementData.number;
        element.appendChild(number);

        // Símbolo
        const symbol = document.createElement('div');
        symbol.className = 'symbol';
        symbol.textContent = elementData.symbol;
        element.appendChild(symbol);

        // Detalles (nombre y peso)
        const details = document.createElement('div');
        details.className = 'details';
        details.innerHTML = `${elementData.name}<br>${elementData.weight}`;
        element.appendChild(details);

        return element;
    }

    createTargetPositions(elementData, index, totalElements) {
        // Posición en tabla periódica
        const tableObject = new THREE.Object3D();
        tableObject.position.x = (elementData.group * 140) - 1330;
        tableObject.position.y = -(elementData.period * 180) + 990;
        this.targets.table.push(tableObject);

        // Posición en esfera
        const sphereObject = new THREE.Object3D();
        const phi = Math.acos(-1 + (2 * index) / totalElements);
        const theta = Math.sqrt(totalElements * Math.PI) * phi;
        sphereObject.position.setFromSphericalCoords(800, phi, theta);

        const vector = new THREE.Vector3();
        vector.copy(sphereObject.position).multiplyScalar(2);
        sphereObject.lookAt(vector);
        this.targets.sphere.push(sphereObject);

        // Posición en hélice
        const helixObject = new THREE.Object3D();
        const helixTheta = index * 0.175 + Math.PI;
        const y = -(index * 8) + 450;
        helixObject.position.setFromCylindricalCoords(900, helixTheta, y);

        vector.x = helixObject.position.x * 2;
        vector.y = helixObject.position.y;
        vector.z = helixObject.position.z * 2;
        helixObject.lookAt(vector);
        this.targets.helix.push(helixObject);

        // Posición en rejilla
        const gridObject = new THREE.Object3D();
        gridObject.position.x = ((index % 5) * 400) - 800;
        gridObject.position.y = (-(Math.floor(index / 5) % 5) * 400) + 800;
        gridObject.position.z = Math.floor(index / 25) * 1000 - 2000;
        this.targets.grid.push(gridObject);
    }

    setupRenderer() {
        this.renderer = new CSS3DRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('container').appendChild(this.renderer.domElement);
    }

    setupTrackballControls() {
        this.controls = new TrackballControls(this.camera, this.renderer.domElement);
        this.controls.minDistance = 500;
        this.controls.maxDistance = 6000;
        this.controls.addEventListener('change', () => this.render());
    }

    setupControls() {
        const buttons = {
            tableBtn: 'table',
            sphereBtn: 'sphere',
            helixBtn: 'helix',
            gridBtn: 'grid'
        };

        Object.entries(buttons).forEach(([buttonId, targetName]) => {
            const button = document.getElementById(buttonId);
            if (button) {
                button.addEventListener('click', () => {
                    this.setActiveButton(button);
                    this.transform(this.targets[targetName], 2000);
                });
            }
        });

        // Configurar botones de control de elementos
        const showSelectedBtn = document.getElementById('showSelectedBtn');
        const showAllBtn = document.getElementById('showAllBtn');
        const hideAllBtn = document.getElementById('hideAllBtn');

        if (showSelectedBtn) {
            showSelectedBtn.addEventListener('click', () => this.showSelectedElements());
        }

        if (showAllBtn) {
            showAllBtn.addEventListener('click', () => this.showAllElements());
        }

        if (hideAllBtn) {
            hideAllBtn.addEventListener('click', () => this.hideAllElements());
        }
    }

    setActiveButton(activeButton) {
        document.querySelectorAll('#controls button').forEach(btn => {
            btn.classList.remove('active');
        });
        activeButton.classList.add('active');
    }

    createElementControlPanel() {
        const elementList = document.getElementById('elementList');
        if (!elementList) return;

        elementList.innerHTML = '';

        // Agrupar por categorías
        const categorizedElements = {};
        elementsData.forEach(element => {
            if (!categorizedElements[element.category]) {
                categorizedElements[element.category] = [];
            }
            categorizedElements[element.category].push(element);
        });

        // Crear controles por categoría
        Object.entries(categorizedElements).forEach(([category, elements]) => {
            const categoryDiv = document.createElement('div');
            categoryDiv.style.marginBottom = '15px';

            const categoryHeader = document.createElement('h4');
            categoryHeader.textContent = categoryConfig[category]?.name || category;
            categoryHeader.style.color = '#8ff';
            categoryHeader.style.margin = '10px 0 5px 0';
            categoryHeader.style.fontSize = '14px';
            categoryDiv.appendChild(categoryHeader);

            elements.forEach(element => {
                const controlDiv = document.createElement('div');
                controlDiv.className = 'element-control';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `element_${element.symbol}`;
                checkbox.checked = this.selectedElements.has(element.symbol);
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.selectedElements.add(element.symbol);
                    } else {
                        this.selectedElements.delete(element.symbol);
                    }
                });

                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.textContent = `${element.symbol} - ${element.name}`;

                controlDiv.appendChild(checkbox);
                controlDiv.appendChild(label);
                categoryDiv.appendChild(controlDiv);
            });

            elementList.appendChild(categoryDiv);
        });
    }

    showSelectedElements() {
        this.createElements();
        this.transform(this.targets.table, 1500);
    }

    showAllElements() {
        elementsData.forEach(element => {
            this.selectedElements.add(element.symbol);
            const checkbox = document.getElementById(`element_${element.symbol}`);
            if (checkbox) checkbox.checked = true;
        });
        this.createElements();
        this.transform(this.targets.table, 1500);
    }

    hideAllElements() {
        this.selectedElements.clear();
        document.querySelectorAll('#elementList input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        this.createElements();
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
    }

    transform(targets, duration) {
        TWEEN.removeAll();

        for (let i = 0; i < this.objects.length; i++) {
            const object = this.objects[i];
            const target = targets[i];

            if (!target) continue;

            new TWEEN.Tween(object.position)
                .to({
                    x: target.position.x,
                    y: target.position.y,
                    z: target.position.z
                }, Math.random() * duration + duration)
                .easing(TWEEN.Easing.Exponential.InOut)
                .start();

            new TWEEN.Tween(object.rotation)
                .to({
                    x: target.rotation.x,
                    y: target.rotation.y,
                    z: target.rotation.z
                }, Math.random() * duration + duration)
                .easing(TWEEN.Easing.Exponential.InOut)
                .start();
        }

        new TWEEN.Tween(this)
            .to({}, duration * 2)
            .onUpdate(() => this.render())
            .start();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.render();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        TWEEN.update();
        this.controls.update();
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    // Métodos públicos para control externo
    addElement(symbol) {
        this.selectedElements.add(symbol);
        const checkbox = document.getElementById(`element_${symbol}`);
        if (checkbox) checkbox.checked = true;
        this.createElements();
    }

    removeElement(symbol) {
        this.selectedElements.delete(symbol);
        const checkbox = document.getElementById(`element_${symbol}`);
        if (checkbox) checkbox.checked = false;
        this.createElements();
    }

    showOnlyCategory(category) {
        this.selectedElements.clear();
        elementsData.forEach(element => {
            if (element.category === category) {
                this.selectedElements.add(element.symbol);
            }
        });
        this.updateCheckboxes();
        this.createElements();
    }

    updateCheckboxes() {
        document.querySelectorAll('#elementList input[type="checkbox"]').forEach(cb => {
            const symbol = cb.id.replace('element_', '');
            cb.checked = this.selectedElements.has(symbol);
        });
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.periodicTable3D = new PeriodicTable3D();
});

export default PeriodicTable3D;
