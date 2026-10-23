
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

const modalDocumento = document.getElementById('modal-documento');
const tituloModalDocumento = document.getElementById('titulo-modal-documento');
const nombreDocumentoVisor = document.getElementById('nombre-documento-visor');
const contenidoVisor = document.getElementById('contenido-visor');
const controlesVisor = document.getElementById('controles-visor');
const botonCerrarVisor = document.getElementById('boton-cerrar-visor');
const botonAmpliar = document.getElementById('boton-ampliar');
const botonReducir = document.getElementById('boton-reducir');
const botonRestablecerZoom = document.getElementById('boton-restablecer-zoom');

const modalQr = document.getElementById('modal-qr');
const nombreDocumentoQr = document.getElementById('nombre-documento-qr');
const contenedorQr = document.getElementById('contenedor-qr');
const mensajeQr = document.getElementById('mensaje-qr');
const botonCerrarQr = document.getElementById('boton-cerrar-qr');

let categoriaActual;
let seccionActual;
let documentoQrActual = null;
let urlOriginalTemporal = null;
let escalaVisor = 1;

const seccionesConAcciones = ['Informes', 'Laboratorios'];

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

const crearBoton = (texto, clase, accion) => {
    const boton = crearElemento('button', clase, texto);
    boton.type = 'button';
    boton.addEventListener('click', accion);
    return boton;
};

const formatearFecha = (fecha) => {
    if (!fecha) return 'Fecha no especificada';

    const fechaTexto = String(fecha).slice(0, 10);
    const partes = fechaTexto.split('-');

    if (partes.length !== 3) return fechaTexto;
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
};

const obtenerToken = () => localStorage.getItem('token');

const manejarErrorAutenticacion = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.replace('../index.html');
};

const liberarUrlOriginal = () => {
    if (urlOriginalTemporal) {
        URL.revokeObjectURL(urlOriginalTemporal);
        urlOriginalTemporal = null;
    }
};

const cerrarModalDocumento = () => {
    if (modalDocumento.open) modalDocumento.close();
};

const cerrarModalQr = () => {
    if (modalQr.open) modalQr.close();

    documentoQrActual = null;
    contenedorQr.replaceChildren();
    mensajeQr.textContent = '';
};

const mostrarVentanaDocumento = (titulo, nombre, contenido, permitirZoom = false) => {
    liberarUrlOriginal();
    contenidoVisor.replaceChildren(contenido);
    tituloModalDocumento.textContent = titulo;
    nombreDocumentoVisor.textContent = nombre || 'Documento médico';
    escalaVisor = 1;
    controlesVisor.hidden = !permitirZoom;

    if (!modalDocumento.open) modalDocumento.showModal();
};

const actualizarZoom = () => {
    const imagen = contenidoVisor.querySelector('.visor-imagen');

    if (imagen) {
        imagen.style.transform = `scale(${escalaVisor})`;
    }
};

const mostrarDocumentos = (documentos) => {
    listaDocumentos.replaceChildren();

    if (documentos.length === 0) {
        listaDocumentos.append(
            crearElemento('p', 'mensaje-vacio', 'Todavía no hay documentos en esta sección.')
        );
        return;
    }

    documentos.forEach((documento) => {
        const tarjeta = crearElemento('article', 'tarjeta-documento', '');

        tarjeta.append(
            crearElemento('h3', 'tarjeta-documento__titulo', documento.titulo || 'Documento sin nombre'),
            crearElemento('p', 'tarjeta-documento__archivo', `Archivo: ${documento.nombre_archivo_original || 'No disponible'}`),
            crearElemento('p', 'tarjeta-documento__fecha', `Fecha: ${formatearFecha(documento.fecha_documento)}`)
        );

        if (documento.institucion) {
            tarjeta.append(crearElemento('p', '', `Institución médica: ${documento.institucion}`));
        }

        if (documento.profesional) {
            tarjeta.append(crearElemento('p', '', `Profesional de salud: ${documento.profesional}`));
        }

        if (documento.resumen_ia) {
            tarjeta.append(
                crearElemento('h4', '', 'Resumen del documento'),
                crearElemento('p', 'tarjeta-documento__resumen', documento.resumen_ia)
            );
        }

        const acciones = crearElemento('div', 'tarjeta-documento__acciones', '');

        if (seccionesConAcciones.includes(seccionActual.nombre)) {
            acciones.append(
                crearBoton('Mostrar original', 'boton-documento', () => mostrarOriginal(documento)),
                crearBoton('Mostrar transcripción', 'boton-documento', () => mostrarTranscripcion(documento))
            );
        }

        acciones.append(
            crearBoton('Mostrar QR', 'boton-documento', () => mostrarQr(documento))
        );

        tarjeta.append(acciones);
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

        const filtrados = documentos.filter((documento) =>
            Number(documento.categoria_id) === Number(categoriaActual.id) &&
            Number(documento.seccion_id) === Number(seccionActual.id)
        );

        mostrarDocumentos(filtrados);
    } catch (error) {
        if (error.status === 401) {
            manejarErrorAutenticacion();
            return;
        }

        listaDocumentos.replaceChildren();
        listaDocumentos.append(
            crearElemento('p', 'mensaje-error', 'No se pudieron cargar los documentos. Intentá nuevamente.')
        );
    }
};

const mostrarOriginal = async (documento) => {
    const cargando = crearElemento('p', '', 'Cargando documento original...');
    mostrarVentanaDocumento('Documento original', documento.titulo, cargando, true);

    try {
        const respuesta = await fetch(
            `${API_URL}/documentos/${encodeURIComponent(documento.id)}/original`,
            {
                headers: { Authorization: `Bearer ${obtenerToken()}` }
            }
        );

        if (respuesta.status === 401) {
            cerrarModalDocumento();
            manejarErrorAutenticacion();
            return;
        }

        if (!respuesta.ok) {
            throw new Error('No se pudo abrir el documento original.');
        }

        const tipo = respuesta.headers.get('content-type') || '';

        if (!tipo.startsWith('application/pdf') && !tipo.startsWith('image/')) {
            throw new Error('El servidor devolvió un archivo no compatible.');
        }

        const archivo = await respuesta.blob();
        liberarUrlOriginal();
        urlOriginalTemporal = URL.createObjectURL(archivo);

        if (tipo.startsWith('image/')) {
            const imagen = document.createElement('img');
            imagen.className = 'visor-imagen';
            imagen.src = urlOriginalTemporal;
            imagen.alt = documento.titulo || 'Documento médico original';
            imagen.style.transform = 'scale(1)';
            contenidoVisor.replaceChildren(imagen);
        } else {
            const marco = document.createElement('iframe');
            marco.className = 'visor-pdf';
            marco.src = urlOriginalTemporal;
            marco.title = `Documento PDF: ${documento.titulo || 'Documento médico'}`;
            contenidoVisor.replaceChildren(marco);
            controlesVisor.hidden = true;
        }
    } catch (error) {
        contenidoVisor.replaceChildren(
            crearElemento('p', 'mensaje-error', error.message || 'No se pudo abrir el documento.')
        );
    }
};

const mostrarTranscripcion = async (documento) => {
    mostrarVentanaDocumento(
        'Transcripción OCR',
        documento.titulo,
        crearElemento('p', '', 'Cargando transcripción...')
    );

    try {
        const respuesta = await api.get(
            `/documentos/${encodeURIComponent(documento.id)}/transcripcion`
        );

        const texto = respuesta.data?.texto_ocr || '';
        const contenido = crearElemento(
            'pre',
            'visor-transcripcion',
            texto || 'No hay una transcripción guardada para este documento.'
        );

        contenidoVisor.replaceChildren(contenido);
    } catch (error) {
        if (error.status === 401) {
            cerrarModalDocumento();
            manejarErrorAutenticacion();
            return;
        }

        contenidoVisor.replaceChildren(
            crearElemento('p', 'mensaje-error', 'No se pudo cargar la transcripción.')
        );
    }
};

const mostrarQr = async (documento) => {
    cerrarModalQr();

    documentoQrActual = documento;
    nombreDocumentoQr.textContent = documento.titulo || 'Documento médico';
    contenedorQr.append(crearElemento('p', '', 'Generando enlace y código QR...'));
    modalQr.showModal();

    try {
        const respuesta = await api.post(
            `/documentos/${encodeURIComponent(documento.id)}/qr`
        );

        const datos = respuesta?.data;

        if (!datos?.url || !datos?.imagen_base64) {
            throw new Error('El servidor no devolvió el enlace o la imagen QR.');
        }

        if (!modalQr.open || documentoQrActual?.id !== documento.id) return;

        contenedorQr.replaceChildren();

        const imagenQr = document.createElement('img');
        imagenQr.className = 'imagen-qr';
        imagenQr.src = `data:${datos.imagen_mime || 'image/png'};base64,${datos.imagen_base64}`;
        imagenQr.alt = `Código QR para compartir ${documento.titulo || 'documento médico'}`;

        contenedorQr.append(imagenQr);

        contenedorQr.append(
            crearElemento(
                'p',
                'modal-qr__vencimiento',
                datos.compartido_hasta
                    ? `El enlace vence: ${formatearFecha(datos.compartido_hasta)}`
                    : 'El enlace tiene una duración limitada.'
            )
        );

        const enlace = document.createElement('a');
        enlace.href = datos.url;
        enlace.textContent = 'Abrir enlace compartido';
        enlace.target = '_blank';
        enlace.rel = 'noopener noreferrer';
        contenedorQr.append(enlace);

        const botonCopiar = crearBoton('Copiar enlace', 'boton-documento', async () => {
            try {
                await navigator.clipboard.writeText(datos.url);
                mensajeQr.textContent = 'Enlace copiado.';
            } catch {
                mensajeQr.textContent = 'No se pudo copiar automáticamente. Copiá el enlace desde el navegador.';
            }
        });

        const botonRevocar = crearBoton('Revocar acceso', 'boton-documento', async () => {
            botonRevocar.disabled = true;

            try {
                await api.delete(
                    `/documentos/${encodeURIComponent(documento.id)}/compartir`
                );
                mensajeQr.textContent = 'El acceso fue revocado.';
                contenedorQr.replaceChildren();
            } catch (error) {
                if (error.status === 401) {
                    cerrarModalQr();
                    manejarErrorAutenticacion();
                    return;
                }

                mensajeQr.textContent = 'No se pudo revocar el acceso.';
                botonRevocar.disabled = false;
            }
        });

        contenedorQr.append(botonCopiar, botonRevocar);
        mensajeQr.textContent = '';
    } catch (error) {
        if (error.status === 401) {
            cerrarModalQr();
            manejarErrorAutenticacion();
            return;
        }

        contenedorQr.replaceChildren();
        mensajeQr.textContent = error.message || 'No se pudo generar el código QR.';
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

    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(archivo.type)) {
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
            manejarErrorAutenticacion();
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
    cerrarModalDocumento();
    cerrarModalQr();

    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('categoriaSeleccionada');
    localStorage.removeItem('seccionSeleccionada');

    window.location.replace('../index.html');
});

botonCerrarVisor.addEventListener('click', cerrarModalDocumento);
botonCerrarQr.addEventListener('click', cerrarModalQr);

botonAmpliar.addEventListener('click', () => {
    escalaVisor = Math.min(escalaVisor + 0.2, 3);
    actualizarZoom();
});

botonReducir.addEventListener('click', () => {
    escalaVisor = Math.max(escalaVisor - 0.2, 0.4);
    actualizarZoom();
});

botonRestablecerZoom.addEventListener('click', () => {
    escalaVisor = 1;
    actualizarZoom();
});

modalDocumento.addEventListener('click', (evento) => {
    if (evento.target === modalDocumento) cerrarModalDocumento();
});

modalQr.addEventListener('click', (evento) => {
    if (evento.target === modalQr) cerrarModalQr();
});

modalDocumento.addEventListener('close', liberarUrlOriginal);

modalQr.addEventListener('close', () => {
    documentoQrActual = null;
});

const iniciarPagina = () => {
    if (!obtenerToken()) {
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
        nombreCategoria.textContent = categoriaActual.nombre || '';
        nombreSeccion.textContent = seccionActual.nombre || 'Documentos médicos';
        descripcionSeccion.textContent = 'Consultá y organizá tus archivos médicos en esta sección.';

        cargarDocumentos();
    } catch {
        localStorage.removeItem('categoriaSeleccionada');
        localStorage.removeItem('seccionSeleccionada');
        window.location.replace('./categorias.html');
    }
};

iniciarPagina();
