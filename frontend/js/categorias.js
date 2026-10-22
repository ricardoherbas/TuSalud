
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

const iconosCategorias = {
    'Corazón y circulación': '♥',
    'Cerebro y sistema nervioso': '🧠',
    'Pulmones y respiración': '🫁',
    'Estómago y digestión': '🩺',
    'Huesos, músculos y articulaciones': '🦴',
    'Ojos y visión': '👁',
    'Oídos, nariz y garganta': '👂',
    'Piel': '✋',
    'Riñones y vías urinarias': '💧',
    'Salud hormonal y metabólica': '⚕',
    'Salud reproductiva': '♡',
    'Salud general y otros documentos': '✚'
};

const iconosSecciones = {
    'Imágenes': '🩻',
    'Informes': '📋',
    'Laboratorios': '🧪'
};

const mostrarMensaje = (mensaje) => {
    mensajeCategorias.textContent = mensaje;
    mensajeCategorias.hidden = false;
};

const limpiarMensaje = () => {
    mensajeCategorias.textContent = '';
    mensajeCategorias.hidden = true;
};

const crearTarjeta = (titulo, descripcion, icono, alSeleccionar) => {
    const tarjeta = document.createElement('button');
    tarjeta.type = 'button';
    tarjeta.className = 'tarjeta-medica';

    const simbolo = document.createElement('span');
    simbolo.className = 'tarjeta-medica__icono';
    simbolo.setAttribute('aria-hidden', 'true');
    simbolo.textContent = icono;

    const nombre = document.createElement('span');
    nombre.className = 'tarjeta-medica__titulo';
    nombre.textContent = titulo;

    const detalle = document.createElement('span');
    detalle.className = 'tarjeta-medica__descripcion';
    detalle.textContent = descripcion || '';

    tarjeta.append(simbolo, nombre, detalle);
    tarjeta.addEventListener('click', alSeleccionar);

    return tarjeta;
};

const cargarCategorias = async () => {
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
            mensaje.textContent = 'No hay categorías médicas disponibles.';
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
            mensaje.textContent = 'No hay secciones disponibles para esta categoría.';
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

botonVolver.addEventListener('click', () => {
    limpiarMensaje();
    seccionSecciones.hidden = true;
    seccionCategorias.hidden = false;
});

botonCerrarSesion.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('categoriaSeleccionada');
    localStorage.removeItem('seccionSeleccionada');

    window.location.replace('../index.html');
});

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
