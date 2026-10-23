const listaCategorias = document.getElementById('lista-categorias');
const listaSecciones = document.getElementById('lista-secciones');
const seccionCategorias = document.getElementById('seccion-categorias');
const seccionSecciones = document.getElementById('seccion-secciones');
const tituloSecciones = document.getElementById('titulo-secciones');
const descripcionSecciones = document.getElementById('descripcion-secciones');
const mensajeCategorias = document.getElementById('mensaje-categorias');
const nombreUsuario = document.getElementById('nombre-usuario');
const botonVolver = document.getElementById('boton-volver');
const botonCerrarSesion = document.getElementById('boton-cerrar-sesion');

// Íconos de las categorías médicas.
const iconosCategorias = {
    'Corazón y circulación': '♥',
    'Cerebro y sistema nervioso': '🧠',
    'Pulmones y respiración': '🫁',
    'Estómago y digestión': '🩺',
    'Huesos, músculos y articulaciones': '🦴',
    'Ojos y visión': '👁️',
    'Oídos, nariz y garganta': '👂',
    'Piel': '✋',
    'Riñones y vías urinarias': '💧',
    'Salud hormonal y metabólica': '⚕️',
    'Salud reproductiva': '♡',
    'Salud general y otros documentos': '✚'
};

// Íconos de los tipos de documentos.
const iconosSecciones = {
    'Imágenes': '🩻',
    'Informes': '📋',
    'Laboratorios': '🧪'
};

// Muestra un mensaje de error o información.
const mostrarMensaje = (mensaje) => {
    mensajeCategorias.textContent = mensaje;
    mensajeCategorias.hidden = false;
};

// Oculta y limpia el mensaje.
const limpiarMensaje = () => {
    mensajeCategorias.textContent = '';
    mensajeCategorias.hidden = true;
};

// Normaliza textos para comparar títulos y descripciones.
const normalizarTexto = (texto) => {
    return String(texto ?? '')
        .trim()
        .toLocaleLowerCase('es-AR');
};

// Crea una tarjeta reutilizable para categorías y secciones.
const crearTarjeta = (titulo, descripcion, icono, alSeleccionar) => {
    const tarjeta = document.createElement('button');

    tarjeta.type = 'button';
    tarjeta.className = 'tarjeta-medica';

    // Ícono.
    const simbolo = document.createElement('span');

    simbolo.className = 'tarjeta-medica__icono';
    simbolo.setAttribute('aria-hidden', 'true');
    simbolo.textContent = icono || '✚';

    // Título.
    const nombre = document.createElement('span');

    nombre.className = 'tarjeta-medica__titulo';
    nombre.textContent = String(titulo ?? '').trim();

    // Descripción.
    const detalle = document.createElement('span');

    detalle.className = 'tarjeta-medica__descripcion';

    const textoTitulo = normalizarTexto(titulo);
    const textoDescripcion = String(descripcion ?? '').trim();

    // Evita repetir la descripción si es igual al título.
    if (
        normalizarTexto(textoDescripcion) === textoTitulo
    ) {
        detalle.textContent = '';
    } else {
        detalle.textContent = textoDescripcion;
    }

    // Agrega los elementos a la tarjeta.
    tarjeta.append(simbolo, nombre, detalle);

    // Ejecuta la acción al seleccionar la tarjeta.
    if (typeof alSeleccionar === 'function') {
        tarjeta.addEventListener('click', alSeleccionar);
    }

    return tarjeta;
};

// Carga las categorías médicas disponibles.
const cargarCategorias = async () => {
    limpiarMensaje();
    listaCategorias.replaceChildren();

    const indicador = document.createElement('p');

    indicador.className = 'mensaje-carga';
    indicador.textContent = 'Cargando categorías médicas...';

    listaCategorias.append(indicador);

    try {
        const respuesta = await api.get('/categorias-medicas');
        const categorias = respuesta.data;

        listaCategorias.replaceChildren();

        if (!Array.isArray(categorias) || categorias.length === 0) {
            const mensaje = document.createElement('p');

            mensaje.textContent =
                'No hay categorías médicas disponibles.';

            listaCategorias.append(mensaje);
            return;
        }

        categorias.forEach((categoria) => {
            const tarjeta = crearTarjeta(
                categoria.nombre,
                categoria.descripcion,
                iconosCategorias[categoria.nombre] || '✚',
                () => cargarSecciones(categoria)
            );

            listaCategorias.append(tarjeta);
        });
    } catch (error) {
        listaCategorias.replaceChildren();

        mostrarMensaje(
            error.status === 401
                ? 'Tu sesión venció. Iniciá sesión nuevamente.'
                : 'No se pudieron cargar las categorías médicas. Intentá nuevamente.'
        );

        if (error.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');

            window.location.replace('../index.html');
        }
    }
};

// Carga las secciones correspondientes a una categoría.
const cargarSecciones = async (categoria) => {
    limpiarMensaje();
    listaSecciones.replaceChildren();

    const indicador = document.createElement('p');

    indicador.className = 'mensaje-carga';
    indicador.textContent = 'Cargando secciones...';

    listaSecciones.append(indicador);

    tituloSecciones.textContent = categoria.nombre;
    descripcionSecciones.textContent =
        'Elegí qué tipo de documento querés consultar.';

    seccionCategorias.hidden = true;
    seccionSecciones.hidden = false;

    try {
        const respuesta = await api.get(
            `/secciones-medicas/categoria/${encodeURIComponent(categoria.id)}`
        );

        const secciones = respuesta.data;

        listaSecciones.replaceChildren();

        if (!Array.isArray(secciones) || secciones.length === 0) {
            const mensaje = document.createElement('p');

            mensaje.textContent =
                'No hay secciones disponibles para esta categoría.';

            listaSecciones.append(mensaje);
            return;
        }

        secciones.forEach((seccion) => {
            const tarjeta = crearTarjeta(
                seccion.nombre,
                seccion.descripcion,
                iconosSecciones[seccion.nombre] || '📄',
                () => {
                    localStorage.setItem(
                        'categoriaSeleccionada',
                        JSON.stringify(categoria)
                    );

                    localStorage.setItem(
                        'seccionSeleccionada',
                        JSON.stringify(seccion)
                    );

                    window.location.href = './documentos.html';
                }
            );

            listaSecciones.append(tarjeta);
        });
    } catch (error) {
        listaSecciones.replaceChildren();

        mostrarMensaje(
            error.status === 401
                ? 'Tu sesión venció. Iniciá sesión nuevamente.'
                : 'No se pudieron cargar las secciones. Intentá nuevamente.'
        );

        if (error.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');

            window.location.replace('../index.html');
        }
    }
};

// Vuelve a la pantalla de categorías.
botonVolver.addEventListener('click', () => {
    limpiarMensaje();

    seccionSecciones.hidden = true;
    seccionCategorias.hidden = false;
});

// Cierra la sesión y limpia los datos almacenados.
botonCerrarSesion.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('categoriaSeleccionada');
    localStorage.removeItem('seccionSeleccionada');

    window.location.replace('../index.html');
});

// Inicializa la página.
const iniciarPagina = () => {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.replace('../index.html');
        return;
    }

    try {
        const usuario = JSON.parse(
            localStorage.getItem('usuario') || 'null'
        );

        if (usuario?.nombre) {
            nombreUsuario.textContent = usuario.nombre;
        }
    } catch {
        localStorage.removeItem('usuario');
    }

    cargarCategorias();
};

iniciarPagina();