
const listaTratamientos = document.getElementById('lista-tratamientos');
const detalleTratamiento = document.getElementById('detalle-tratamiento');
const mensajeTratamientos = document.getElementById('mensaje-tratamientos');
const botonActualizar = document.getElementById('boton-actualizar');

const modalArchivo = document.getElementById('modal-archivo');
const modalArchivoCuerpo = document.getElementById('modal-archivo-cuerpo');
const modalArchivoTitulo = document.getElementById('modal-archivo-titulo');
const botonCerrarModal = document.getElementById('cerrar-modal-archivo');

let tratamientoSeleccionado = null;
let urlArchivoActual = null;
let elementoAnteriorAlModal = null;

const escaparHTML = (valor) => {
    return String(valor ?? '').replace(/[&<>"']/g, (caracter) => {
        const entidades = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };

        return entidades[caracter];
    });
};

const mostrarMensaje = (mensaje, tipo = 'error') => {
    mensajeTratamientos.textContent = mensaje;
    mensajeTratamientos.className = `mensaje-formulario mensaje-formulario--${tipo}`;
    mensajeTratamientos.hidden = false;
};

const ocultarMensaje = () => {
    mensajeTratamientos.textContent = '';
    mensajeTratamientos.hidden = true;
};

const obtenerToken = () => {
    return localStorage.getItem('token');
};

const formatearFecha = (fecha) => {
    if (!fecha) {
        return 'No especificada';
    }

    const fechaNormalizada = String(fecha).slice(0, 10);
    const partes = fechaNormalizada.split('-');

    if (partes.length !== 3) {
        return escaparHTML(fecha);
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

const obtenerEstadoTratamiento = (tratamiento) => {
    if (!tratamiento.fecha_fin) {
        return {
            texto: 'Sin fecha de finalización',
            clase: 'tratamiento-estado--sin-fecha'
        };
    }

    const fechaFin = new Date(`${String(tratamiento.fecha_fin).slice(0, 10)}T00:00:00`);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaFin < hoy) {
        return {
            texto: 'Vencido según fecha',
            clase: 'tratamiento-estado--vencido'
        };
    }

    return {
        texto: 'No vencido según fecha',
        clase: 'tratamiento-estado--vigente'
    };
};

const cerrarModalArchivo = () => {
    if (!modalArchivo) {
        return;
    }

    modalArchivo.hidden = true;
    modalArchivoCuerpo.replaceChildren();

    if (urlArchivoActual) {
        URL.revokeObjectURL(urlArchivoActual);
        urlArchivoActual = null;
    }

    if (elementoAnteriorAlModal && document.contains(elementoAnteriorAlModal)) {
        elementoAnteriorAlModal.focus();
    }

    elementoAnteriorAlModal = null;
};

const abrirModalArchivo = async (tratamiento, archivo) => {
    const token = obtenerToken();

    if (!token) {
        mostrarMensaje('Tu sesión expiró. Iniciá sesión nuevamente.');
        return;
    }

    if (!tratamiento?.id || !archivo?.id) {
        mostrarMensaje('No se pudo identificar el archivo solicitado.');
        return;
    }

    const tipoMime = String(archivo.tipo_mime || archivo.tipoMime || '').toLowerCase();

    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(tipoMime)) {
        mostrarMensaje('El tipo de archivo no está permitido para su visualización.');
        return;
    }

    cerrarModalArchivo();

    elementoAnteriorAlModal = document.activeElement;
    modalArchivoTitulo.textContent = archivo.nombre_archivo_original || 'Archivo adjunto';
    modalArchivoCuerpo.innerHTML = '<p>Cargando archivo...</p>';
    modalArchivo.hidden = false;
    botonCerrarModal.focus();

    try {
        const respuesta = await fetch(
            `${API_URL}/tratamientos/${encodeURIComponent(tratamiento.id)}/archivos/${encodeURIComponent(archivo.id)}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (respuesta.status === 401) {
            cerrarModalArchivo();
            mostrarMensaje('Tu sesión expiró. Iniciá sesión nuevamente.');
            return;
        }

        if (!respuesta.ok) {
            throw new Error('No se pudo obtener el archivo adjunto.');
        }

        const blob = await respuesta.blob();

        if (modalArchivo.hidden) {
            return;
        }

        urlArchivoActual = URL.createObjectURL(
            new Blob([blob], { type: tipoMime })
        );

        modalArchivoCuerpo.replaceChildren();

        if (tipoMime.startsWith('image/')) {
            const imagen = document.createElement('img');
            imagen.src = urlArchivoActual;
            imagen.alt = archivo.nombre_archivo_original || 'Imagen del tratamiento';
            imagen.className = 'modal-archivo__visor';
            modalArchivoCuerpo.appendChild(imagen);
        } else {
            const visorPDF = document.createElement('iframe');
            visorPDF.src = urlArchivoActual;
            visorPDF.title = archivo.nombre_archivo_original || 'Receta médica';
            visorPDF.className = 'modal-archivo__visor';
            modalArchivoCuerpo.appendChild(visorPDF);
        }
    } catch (error) {
        if (!modalArchivo.hidden) {
            modalArchivoCuerpo.replaceChildren();

            const mensaje = document.createElement('p');
            mensaje.textContent = error.message || 'Ocurrió un error al cargar el archivo.';
            modalArchivoCuerpo.appendChild(mensaje);
        }
    }
};

const crearCampoDetalle = (etiqueta, valor) => {
    const contenedor = document.createElement('div');
    contenedor.className = 'detalle-tratamiento__campo';

    const nombre = document.createElement('span');
    nombre.className = 'detalle-tratamiento__etiqueta';
    nombre.textContent = etiqueta;

    const contenido = document.createElement('span');
    contenido.className = 'detalle-tratamiento__valor';
    contenido.textContent = valor || 'No especificado';

    contenedor.append(nombre, contenido);

    return contenedor;
};

const mostrarArchivos = (tratamiento) => {
    const archivos = Array.isArray(tratamiento.archivos)
        ? tratamiento.archivos
        : [];

    const seccion = document.createElement('div');
    seccion.className = 'detalle-tratamiento__archivos';

    const titulo = document.createElement('h3');
    titulo.textContent = 'Archivos adjuntos';
    seccion.appendChild(titulo);

    if (archivos.length === 0) {
        const mensaje = document.createElement('p');
        mensaje.textContent = 'Este tratamiento no tiene archivos adjuntos.';
        seccion.appendChild(mensaje);
        return seccion;
    }

    archivos.forEach((archivo) => {
        const fila = document.createElement('div');
        fila.className = 'detalle-tratamiento__archivo';

        const nombre = document.createElement('span');
        nombre.className = 'detalle-tratamiento__valor';
        nombre.textContent = archivo.nombre_archivo_original || 'Archivo adjunto';

        const tipo = String(archivo.tipo_archivo || '').toLowerCase();
        const etiquetaTipo = document.createElement('span');
        etiquetaTipo.className = 'detalle-tratamiento__etiqueta';
        etiquetaTipo.textContent = tipo === 'imagen' ? 'Medicamento' : 'Receta';

        const botonVer = document.createElement('button');
        botonVer.type = 'button';
        botonVer.className = 'boton-secundario';
        botonVer.textContent = tipo === 'imagen' ? 'Ver medicamento' : 'Ver receta';
        botonVer.addEventListener('click', () => {
            abrirModalArchivo(tratamiento, archivo);
        });

        fila.append(nombre, etiquetaTipo, botonVer);
        seccion.appendChild(fila);
    });

    return seccion;
};

const mostrarDetalle = (tratamiento) => {
    tratamientoSeleccionado = tratamiento;
    detalleTratamiento.replaceChildren();
    detalleTratamiento.hidden = false;

    const encabezado = document.createElement('div');
    encabezado.className = 'detalle-tratamiento__encabezado';

    const titulo = document.createElement('h2');
    titulo.textContent = tratamiento.nombre_medicamento || tratamiento.nombre || 'Detalle del tratamiento';

    const estado = obtenerEstadoTratamiento(tratamiento);
    const etiquetaEstado = document.createElement('span');
    etiquetaEstado.className = `tratamiento-estado ${estado.clase}`;
    etiquetaEstado.textContent = estado.texto;

    encabezado.append(titulo, etiquetaEstado);
    detalleTratamiento.appendChild(encabezado);

    const datos = document.createElement('div');
    datos.className = 'detalle-tratamiento__datos';

    datos.append(
        crearCampoDetalle('Dosis', tratamiento.dosis),
        crearCampoDetalle('Frecuencia', tratamiento.frecuencia),
        crearCampoDetalle('Fecha de inicio', formatearFecha(tratamiento.fecha_inicio)),
        crearCampoDetalle('Fecha de finalización', formatearFecha(tratamiento.fecha_fin)),
        crearCampoDetalle('Indicaciones', tratamiento.indicaciones)
    );

    detalleTratamiento.appendChild(datos);
    detalleTratamiento.appendChild(mostrarArchivos(tratamiento));

    detalleTratamiento.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
};

const crearTarjetaTratamiento = (tratamiento) => {
    const tarjeta = document.createElement('button');
    tarjeta.type = 'button';
    tarjeta.className = 'tarjeta-tratamiento';

    const nombre = document.createElement('span');
    nombre.className = 'tarjeta-tratamiento__nombre';
    nombre.textContent = tratamiento.nombre_medicamento || tratamiento.nombre || 'Tratamiento sin nombre';

    const estado = obtenerEstadoTratamiento(tratamiento);
    const etiqueta = document.createElement('span');
    etiqueta.className = `tratamiento-estado ${estado.clase}`;
    etiqueta.textContent = estado.texto;

    const fechas = document.createElement('span');
    fechas.className = 'tarjeta-tratamiento__fechas';
    fechas.textContent = `Desde ${formatearFecha(tratamiento.fecha_inicio)} hasta ${formatearFecha(tratamiento.fecha_fin)}`;

    tarjeta.append(nombre, etiqueta, fechas);

    tarjeta.addEventListener('click', () => {
        mostrarDetalle(tratamiento);
    });

    return tarjeta;
};

const cargarTratamientos = async () => {
    ocultarMensaje();

    const token = obtenerToken();

    if (!token) {
        mostrarMensaje('Tu sesión expiró. Iniciá sesión nuevamente.');
        listaTratamientos.replaceChildren();
        return;
    }

    listaTratamientos.replaceChildren();

    const cargando = document.createElement('p');
    cargando.textContent = 'Cargando tratamientos...';
    listaTratamientos.appendChild(cargando);

    try {
        const respuesta = await fetch(`${API_URL}/tratamientos`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (respuesta.status === 401) {
            throw new Error('Tu sesión expiró. Iniciá sesión nuevamente.');
        }

        if (!respuesta.ok) {
            throw new Error('No se pudieron cargar los tratamientos.');
        }

        const resultado = await respuesta.json();

        const tratamientos = Array.isArray(resultado)
            ? resultado
            : resultado.tratamientos || resultado.data || [];

        listaTratamientos.replaceChildren();

        if (tratamientos.length === 0) {
            const mensaje = document.createElement('p');
            mensaje.textContent = 'Todavía no registraste tratamientos.';
            listaTratamientos.appendChild(mensaje);
            detalleTratamiento.hidden = true;
            return;
        }

        tratamientos.forEach((tratamiento) => {
            listaTratamientos.appendChild(crearTarjetaTratamiento(tratamiento));
        });

        if (tratamientoSeleccionado) {
            const actualizado = tratamientos.find(
                (tratamiento) => tratamiento.id === tratamientoSeleccionado.id
            );

            if (actualizado) {
                mostrarDetalle(actualizado);
            } else {
                detalleTratamiento.hidden = true;
                tratamientoSeleccionado = null;
            }
        }
    } catch (error) {
        listaTratamientos.replaceChildren();
        mostrarMensaje(error.message || 'Ocurrió un error al cargar los tratamientos.');
    }
};

botonActualizar.addEventListener('click', cargarTratamientos);
botonCerrarModal.addEventListener('click', cerrarModalArchivo);

modalArchivo.addEventListener('click', (evento) => {
    if (evento.target === modalArchivo) {
        cerrarModalArchivo();
    }
});

document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && !modalArchivo.hidden) {
        cerrarModalArchivo();
    }
});

cargarTratamientos();
