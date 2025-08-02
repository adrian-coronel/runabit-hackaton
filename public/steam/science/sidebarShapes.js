// cardSystem.js
// Sistema de tarjetas 3D interactivas posicionadas en la parte inferior

// Definición de las tarjetas educativas disponibles
export const CARDS = [
  // Primera fila - movidas más arriba
  {
    id: "card-1",
    title: "H",
    color: 0xE6E6E6, // Hidrógeno (gris claro)
    position: { x: -6, y: -1, z: 0 }
  },
  {
    id: "card-2",
    title: "He",
    color: 0xD9FFFF, // Helio (celeste)
    position: { x: 6, y: -1, z: 0 }
  },
  // Segunda fila
  {
    id: "card-3",
    title: "Li",
    color: 0xCC80FF, // Litio (violeta claro)
    position: { x: -6, y: -2.5, z: 0 }
  },
  {
    id: "card-4",
    title: "Be",
    color: 0xC2FF00, // Berilio (verde lima)
    position: { x: -4, y: -2.5, z: 0 }
  },
  {
    id: "card-5",
    title: "B",
    color: 0xFFB5B5, // Boro (rosado claro)
    position: { x: -2, y: -2.5, z: 0 }
  },
  {
    id: "card-6",
    title: "C",
    color: 0x909090, // Carbono (gris)
    position: { x: 0, y: -2.5, z: 0 }
  },
  {
    id: "card-7",
    title: "N",
    color: 0x3050F8, // Nitrógeno (azul)
    position: { x: 2, y: -2.5, z: 0 }
  },
  {
    id: "card-8",
    title: "O",
    color: 0xFF0D0D, // Oxígeno (rojo)
    position: { x: 4, y: -2.5, z: 0 }
  },
  {
    id: "card-9",
    title: "F",
    color: 0x90E050, // Flúor (verde claro)
    position: { x: 6, y: -2.5, z: 0 }
  },
  // Tercera fila
  {
    id: "card-10",
    title: "Na",
    color: 0xAB5CF2, // Sodio (violeta)
    position: { x: -6, y: -4, z: 0 }
  },
  {
    id: "card-11",
    title: "Mg",
    color: 0x8AFF00, // Magnesio (verde)
    position: { x: -4, y: -4, z: 0 }
  },
  {
    id: "card-12",
    title: "Al",
    color: 0xBFA6A6, // Aluminio (gris rosado)
    position: { x: -2, y: -4, z: 0 }
  },
  {
    id: "card-13",
    title: "Si",
    color: 0xF0C8A0, // Silicio (beige)
    position: { x: 0, y: -4, z: 0 }
  },
  {
    id: "card-14",
    title: "P",
    color: 0xFF8000, // Fósforo (naranja)
    position: { x: 2, y: -4, z: 0 }
  },
  {
    id: "card-15",
    title: "S",
    color: 0xFFFF30, // Azufre (amarillo)
    position: { x: 4, y: -4, z: 0 }
  },
  {
    id: "card-16",
    title: "Cl",
    color: 0x1FF01F, // Cloro (verde fuerte)
    position: { x: 6, y: -4, z: 0 }
  }
];

// Array para almacenar las tarjetas 3D en la escena
let cardMeshes = [];
let selectedCard = null;

// Crear todas las tarjetas 3D en la escena
export function createCards(scene) {
  CARDS.forEach(cardData => {
    const card = createCard(cardData);
    scene.add(card);
    cardMeshes.push(card);
  });
}

// Crear una tarjeta 3D individual con efecto 3D mejorado
function createCard(cardData) {
  const group = new THREE.Group();
  
  // Crear geometría con profundidad para efecto 3D
  const cardGeometry = new THREE.BoxGeometry(1.8, 1.2, 0.15); // Añadido profundidad
  
  // Material principal de la tarjeta con sombreado
  const cardMaterial = new THREE.MeshLambertMaterial({ 
    color: cardData.color,
    transparent: true,
    opacity: 0.9
  });
  
  const cardMesh = new THREE.Mesh(cardGeometry, cardMaterial);
  
  // Crear borde/marco 3D
  const edgeGeometry = new THREE.EdgesGeometry(cardGeometry);
  const edgeMaterial = new THREE.LineBasicMaterial({ 
    color: 0x333333, 
    linewidth: 2 
  });
  const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
  
  // Posicionar la tarjeta
  group.position.set(cardData.position.x, cardData.position.y, cardData.position.z);
  
  // Crear texto usando Canvas2D con letras más grandes
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 512; // Aumentado para mejor resolución
  canvas.height = 256;
  
  // Crear fondo transparente
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  // Configurar el texto con tamaño mucho más grande
  context.fillStyle = '#000000'; // Texto negro
  context.font = 'bold 120px Arial'; // Texto mucho más grande
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  
  // Añadir sombra al texto para mejor legibilidad
  context.shadowColor = 'rgba(255, 255, 255, 0.8)';
  context.shadowBlur = 4;
  context.shadowOffsetX = 2;
  context.shadowOffsetY = 2;
  
  // Dibujar el texto centrado
  context.fillText(cardData.title, canvas.width / 2, canvas.height / 2);
  
  // Crear textura del canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  // Crear material con la textura de texto
  const textMaterial = new THREE.MeshBasicMaterial({ 
    map: texture,
    transparent: true,
    opacity: 1.0
  });
  
  // Crear geometría plana para el texto (ligeramente más grande que la tarjeta)
  const textGeometry = new THREE.PlaneGeometry(1.85, 1.25);
  const textMesh = new THREE.Mesh(textGeometry, textMaterial);
  textMesh.position.z = 0.08; // Posicionar encima de la tarjeta
  
  // Añadir iluminación ambiente para mejorar el efecto 3D
  const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(1, 1, 1);
  
  group.add(cardMesh);
  group.add(edges);
  group.add(textMesh);
  group.add(ambientLight);
  group.add(directionalLight);
  
  // Metadatos para la tarjeta
  group.userData = {
    id: cardData.id,
    title: cardData.title,
    originalPosition: { ...cardData.position },
    isSelected: false
  };
  
  return group;
}

// Detectar interacción con tarjetas usando pinch
export function detectCardInteraction(indexTip, thumbTip, camera) {
  const screenX = (1 - indexTip.x) * window.innerWidth;
  const screenY = indexTip.y * window.innerHeight;
  const pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
  const pinchThreshold = 0.045;
  
  const isCurrentlyPinching = pinchDist < pinchThreshold;
  
  // Verificar si el pinch está sobre alguna tarjeta
  cardMeshes.forEach(card => {
    // Proyectar posición de la tarjeta a coordenadas de pantalla
    const projected = card.position.clone().project(camera);
    const cardX = ((projected.x + 1) / 2) * window.innerWidth;
    const cardY = ((1 - projected.y) / 2) * window.innerHeight;
    
    // Calcular distancia del gesto a la tarjeta
    const dist = Math.hypot(screenX - cardX, screenY - cardY);
    
    if (dist < 120) { // Radio de detección aumentado
      if (isCurrentlyPinching) {
        selectCard(card);
      } else {
        // Efecto hover más pronunciado
        card.scale.set(1.15, 1.15, 1.15);
        card.rotation.x = Math.sin(Date.now() * 0.005) * 0.1; // Animación sutil
      }
    } else {
      // Restaurar escala y rotación normal
      if (!card.userData.isSelected) {
        card.scale.set(1, 1, 1);
        card.rotation.x = 0;
      }
    }
  });
}

// Seleccionar una tarjeta con efectos 3D mejorados
function selectCard(card) {
  // Deseleccionar tarjeta anterior
  if (selectedCard) {
    selectedCard.userData.isSelected = false;
    selectedCard.scale.set(1, 1, 1);
    selectedCard.rotation.x = 0;
    selectedCard.children[0].material.opacity = 0.9;
  }
  
  // Seleccionar nueva tarjeta con efectos más dramáticos
  selectedCard = card;
  card.userData.isSelected = true;
  card.scale.set(1.4, 1.4, 1.4);
  card.rotation.x = 0.2; // Inclinación para efecto 3D
  card.children[0].material.opacity = 1.0;
  
  // Añadir efecto de resplandor
  card.children[0].material.emissive.setHex(0x222222);
  
  console.log(`Tarjeta seleccionada: ${card.userData.title}`);
}

// Obtener tarjetas para exportar
export function getCardMeshes() {
  return cardMeshes;
}

// Limpiar tarjetas
export function clearCards(scene) {
  cardMeshes.forEach(card => {
    scene.remove(card);
  });
  cardMeshes = [];
  selectedCard = null;
}
