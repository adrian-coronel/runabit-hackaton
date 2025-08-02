# Tabla Periódica 3D Personalizable

Una implementación interactiva de la tabla periódica en 3D usando Three.js, extraída y modularizada del ejemplo original de three.js.

## Características

- **Visualización 3D** de elementos químicos con CSS3DRenderer
- **Múltiples layouts**: Tabla, Esfera, Hélice, Rejilla
- **Control personalizable** de qué elementos mostrar
- **Categorización por color** según tipo de elemento
- **Interfaz intuitiva** para seleccionar elementos
- **Animaciones suaves** con TWEEN.js
- **Responsive** y compatible con dispositivos móviles

## Archivos

- `index.html` - Página principal con la interfaz
- `periodicTable3D.js` - Clase principal que maneja la lógica 3D
- `elementsData.js` - Datos de elementos químicos y configuración
- `styles.css` - Estilos CSS para la interfaz y elementos 3D

## Uso Básico

```javascript
// La tabla se inicializa automáticamente al cargar la página
// Puedes acceder a la instancia global:
const table = window.periodicTable3D;

// Agregar un elemento
table.addElement('Au'); // Oro

// Remover un elemento
table.removeElement('H'); // Hidrógeno

// Mostrar solo metales de transición
table.showOnlyCategory('transition-metal');

// Mostrar todos los elementos
table.showAllElements();
```

## Controles de la Interfaz

### Botones de Layout
- **TABLA**: Disposición tradicional de tabla periódica
- **ESFERA**: Elementos distribuidos en una esfera
- **HÉLICE**: Disposición helicoidal
- **REJILLA**: Rejilla regular 3D

### Panel de Control de Elementos
- Checkboxes para seleccionar elementos individuales
- Agrupados por categoría química
- Botones para mostrar/ocultar todos los elementos

## Categorías de Elementos

- **Metales Alcalinos** (rojo)
- **Metales Alcalinotérreos** (naranja)
- **Metales de Transición** (cian)
- **Metales del Bloque P** (gris)
- **Metaloides** (amarillo)
- **No Metales** (verde)
- **Halógenos** (amarillo claro)
- **Gases Nobles** (magenta)
- **Lantánidos** (rosa)
- **Actínidos** (naranja rojizo)

## Personalización

### Agregar Nuevos Elementos

Edita `elementsData.js` para agregar más elementos:

```javascript
{ 
    symbol: 'Xx', 
    name: 'Elemento', 
    weight: '000.000', 
    number: 999, 
    group: 1, 
    period: 7, 
    category: 'categoria' 
}
```

### Modificar Estilos

Edita `styles.css` para cambiar:
- Colores de categorías
- Tamaños de elementos
- Efectos de hover
- Diseño de la interfaz

### Personalizar Animaciones

En `periodicTable3D.js` puedes modificar:
- Duraciones de animación
- Tipos de easing
- Posiciones de layouts
- Comportamientos de cámara

## Dependencias

- **Three.js** - Motor 3D
- **TWEEN.js** - Animaciones
- **TrackballControls** - Controles de cámara
- **CSS3DRenderer** - Renderizado de elementos HTML en 3D

## Navegación

- **Mouse**: Arrastra para rotar, rueda para zoom
- **Touch**: Gestos táctiles en dispositivos móviles
- **Teclado**: Usa los botones de la interfaz

## Rendimiento

- Optimizado para mostrar hasta ~100 elementos simultáneamente
- Usa CSS3D para mejor rendimiento en elementos HTML
- Animaciones hardware-accelerated cuando es posible

## Compatibilidad

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers con soporte WebGL
