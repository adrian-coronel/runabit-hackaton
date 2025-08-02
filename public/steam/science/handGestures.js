// handGestures.js
// Detección de gestos de mano y lógica de interacción con tarjetas 3D
import { camera } from "./threeScene.js";
import { detectCardInteraction } from "./sidebarShapes.js";

let draggingCardIndex = -1;
let isPinching = false;
let pinchThreshold = 0.045;

// Detecta la interacción con tarjetas usando gestos de mano
export function detectDrag(handLandmarks) {
  // Obtiene la posición de la punta del índice
  const indexTip = handLandmarks[8];
  // Obtiene la posición de la punta del pulgar
  const thumbTip = handLandmarks[4];
  
  // Delegar la detección de interacción a las tarjetas
  detectCardInteraction(indexTip, thumbTip, camera);
}

// Detecta si la mano está en puño (para rotación de cámara)
export function isFist(landmarks) {
  // Verifica si todos los dedos están doblados
  const fingerTips = [8, 12, 16, 20]; // Índice, medio, anular, meñique
  const fingerBases = [6, 10, 14, 18];
  
  let foldedFingers = 0;
  
  for (let i = 0; i < fingerTips.length; i++) {
    if (landmarks[fingerTips[i]].y > landmarks[fingerBases[i]].y) {
      foldedFingers++;
    }
  }
  
  // También verifica el pulgar
  if (landmarks[4].x > landmarks[3].x) {
    foldedFingers++;
  }
  
  return foldedFingers >= 4; // Al menos 4 dedos doblados
}

// Exporta variables globales necesarias
export { draggingCardIndex, isPinching, pinchThreshold };
