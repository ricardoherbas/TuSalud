
const nombreUsuario = document.getElementById('nombre-usuario');
const nombreCategoria = document.getElementById('nombre-categoria');
const nombreSeccion = document.getElementById('nombre-seccion');
const descripcionSeccion = document.getElementById('descripcion-seccion');
const botonVolver = document.getElementById('boton-volver');
const botonCerrarSesion = document.getElementById('boton-cerrar-sesion');
const listaDocumentos = document.getElementById('lista-documentos');
const formularioDocumento = document.getElementById('form-documento');
const archivoDocumento = document.getElementById('archivo-documento');
const tituloDocumento = document.getElementById('nombre-documento');
const fechaDocumento = document.getElementById('fecha-documento');
const institucionDocumento = document.getElementById('institucion-documento');
const profesionalDocumento = document.getElementById('profesional-documento');
const mensajeDocumento = document.getElementById('mensaje-documento');
const botonSubirDocumento = document.getElementById('boton-subir-documento');
let categoriaActual;
let seccionActual;
const mostrarMensaje = (mensaje) => {
    mensajeDocumento.textContent = mensaje;
    mensajeDocumento.hidden = false;
};
const limpiarMensaje = () => {
    mensajeDocumento.textContent = '';
    mensajeDocumento.hidden = true;
};
const crearElemento = (etiqueta, clase, texto) => {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    elemento.textContent = texto;
    return elemento;
};
const formatearFecha = (fecha) => {
    if (!fecha) return 'Fecha no especificada';
    const fechaTexto = String(fecha).slice(0, 10);
    const partes = fechaTexto.split('-');
    if (partes.length !== 3) return fechaTexto;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};
const mostrarDocumentos = (documentos) => {
    listaDocumentos.replaceChildren();
    if (documentos.length === 0) {
        listaDocumentos.append(crearElemento('p', 'mensaje-vacio', 'Todavía no hay documentos en esta sección.'));
        return;
    }
    documentos.forEach((documento) => {
        const tarjeta = crearElemento('article', 'tarjeta-documento', '');
        const titulo = crearElemento('h3', 'tarjeta-documento__titulo', documento.titulo || 'Documento sin nombre');
        const archivo = crearElemento('p', 'tarjeta-documento__archivo', `Archivo: ${documento.nombre_archivo_original || 'No disponible'}`);
        const fecha = crearElemento('p', 'tarjeta-documento__fecha', `Fecha: ${formatearFecha(documento.fecha_documento)}`);
        tarjeta.append(titulo, archivo, fecha);
        if (documento.institucion) {
            tarjeta.append(crearElemento('p', '', `Institución médica: ${documento.institucion}`));
        }
        if (documento.profesional) {
            tarjeta.append(crearElemento('p', '', `Profesional de salud: ${documento.profesional}`));
        }
        if (documento.resumen_ia) {
            tarjeta.append(crearElemento('h4', '', 'Resumen del documento'), crearElemento('p', 'tarjeta-documento__resumen', documento.resumen_ia));
        }
        listaDocumentos.append(tarjeta);
    });
};
const cargarDocumentos = async () => {
    listaDocumentos.replaceChildren();
    listaDocumentos.append(crearElemento('p', 'mensaje-carga', 'Cargando documentos...'));
    try {
        const respuesta = await api.get('/documentos');
        const documentos = respuesta.data;
        if (!Array.isArray(documentos)) {
            throw new Error('La respuesta de documentos no tiene el formato esperado.');
        }
        const documentosFiltrados = documentos.filter((documento) =>
            Number(documento.categoria_id) === Number(categoriaActual.id) &&
            Number(documento.seccion_id) === Number(seccionActual.id)
        );
        mostrarDocumentos(documentosFiltrados);
    } catch (error) {
        listaDocumentos.replaceChildren();
        if (error.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.replace('../index.html');
            return;
        }
        listaDocumentos.append(crearElemento('p', 'mensaje-error', 'No se pudieron cargar los documentos. Intentá nuevamente.'));
    }
};
formularioDocumento.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    limpiarMensaje();
    const archivo = archivoDocumento.files[0];
    const titulo = tituloDocumento.value.trim();
    const fecha = fechaDocumento.value;
    const institucion = institucionDocumento.value.trim();
    const profesional = profesionalDocumento.value.trim();
    if (!titulo) {
        mostrarMensaje('Ingresá un nombre para el documento.');
        tituloDocumento.focus();
        return;
    }
    if (!fecha) {
        mostrarMensaje('Seleccioná la fecha del documento.');
        fechaDocumento.focus();
        return;
    }
    if (!archivo) {
        mostrarMensaje('Seleccioná un archivo.');
        archivoDocumento.focus();
        return;
    }
    const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!tiposPermitidos.includes(archivo.type)) {
        mostrarMensaje('El archivo debe ser PDF, JPG o PNG.');
        return;
    }
    const formulario = new FormData();
    formulario.append('archivo', archivo);
    formulario.append('categoriaId', categoriaActual.id);
    formulario.append('seccionId', seccionActual.id);
    formulario.append('titulo', titulo);
    formulario.append('fechaDocumento', fecha);
    if (institucion) formulario.append('institucion', institucion);
    if (profesional) formulario.append('profesional', profesional);
    botonSubirDocumento.disabled = true;
    botonSubirDocumento.textContent = 'Guardando...';
    try {
        await api.post('/documentos', formulario);
        formularioDocumento.reset();
        mostrarMensaje('Documento guardado correctamente.');
        await cargarDocumentos();
    } catch (error) {
        if (error.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.replace('../index.html');
            return;
        }
        mostrarMensaje(error.message || 'No se pudo guardar el documento. Intentá nuevamente.');
    } finally {
        botonSubirDocumento.disabled = false;
        botonSubirDocumento.textContent = 'Guardar documento';
    }
});
botonVolver.addEventListener('click', () => {
    window.location.href = './categorias.html';
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
        categoriaActual = JSON.parse(localStorage.getItem('categoriaSeleccionada') || 'null');
        seccionActual = JSON.parse(localStorage.getItem('seccionSeleccionada') || 'null');
        const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
        if (!categoriaActual?.id || !seccionActual?.id) {
            window.location.replace('./categorias.html');
            return;
        }
        nombreUsuario.textContent = usuario?.nombre || '';
        nombreCategoria.textContent = categoriaActual.nombre;
        nombreSeccion.textContent = seccionActual.nombre;
        descripcionSeccion.textContent = 'Consultá y organizá tus archivos médicos en esta sección.';
        cargarDocumentos();
    } catch {
        localStorage.removeItem('categoriaSeleccionada');
        localStorage.removeItem('seccionSeleccionada');
        window.location.replace('./categorias.html');
    }
};
iniciarPagina();
