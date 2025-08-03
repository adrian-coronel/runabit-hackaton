// main.js
// Punto de entrada del proyecto, inicializa todo y conecta los módulos
import { initThree, updateCanvasSize, onShapeCreated } from "./threeScene.js";
import { initWebcam, setupHands } from "./webcam.js";
// import { drawColorPickerWheel } from "./drawUtils.js";

// Inicializar Socket.io
const socket = io();

// Obtiene el elemento de video de la webcam
const videoElement = document.getElementById("webcam");
// Obtiene el elemento canvas para dibujar
const canvasElement = document.getElementById("canvas");
// Obtiene el contexto 2D del canvas
const canvasCtx = canvasElement.getContext("2d");

// Registrar el callback para cuando se crea una forma
onShapeCreated((data) => {
  console.log("Forma creada:", data);
  // Aquí puedes emitir un evento a través de Socket.io
  socket.emit("lenvantarceja", data);
});

// Enviar 'D' cuando el usuario sale de la página
window.addEventListener('beforeunload', () => {
  console.log("Saliendo de la página de matemáticas, enviando 'D'");
  socket.emit("lenvantarceja", 'D');
});

// Función principal que inicializa todo
async function main() {
  await initWebcam(videoElement); // Inicializa la webcam
  initThree(); // Inicializa la escena 3D
  updateCanvasSize(canvasElement); // Ajusta el tamaño de los canvas
  window.addEventListener("resize", () => updateCanvasSize(canvasElement)); // Actualiza el tamaño al cambiar la ventana
  // drawColorPickerWheel(); // Dibuja la rueda de color
  setupHands(canvasElement, canvasCtx, videoElement); // Inicializa MediaPipe Hands
}

main(); // Ejecuta la función principal
