const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const documentosService = require('../services/documentos.service');

const carpetaAlmacenamiento = path.resolve(__dirname, '../storage');
const seccionesConOcr = ['Informes', 'Laboratorios'];

const extraerTextoConOcr = async (archivo) => {
    if (!archivo?.path) {
        throw new Error('No se recibió un archivo para procesar.');
    }

    const contenido = await fs.readFile(archivo.path);
    const formulario = new FormData();

    formulario.append(
        'archivo',
        new Blob([contenido]),
        archivo.originalname
    );

    const urlOcr = process.env.OCR_SERVICE_URL || 'http://ocr:8000';
    const respuesta = await fetch(`${urlOcr}/ocr`, {
        method: 'POST',
        body: formulario
    });

    if (!respuesta.ok) {
        throw new Error(
            `El servicio OCR respondió con estado ${respuesta.status}.`
        );
    }

    const resultado = await respuesta.json();

    if (!resultado.success) {
        throw new Error('El servicio OCR no pudo procesar el archivo.');
    }

    return resultado.texto || '';
};

const obtenerUrlCompartida = (token) => {
    const baseUrl = process.env.PUBLIC_BASE_URL;

    if (!baseUrl) {
        throw new Error('Falta configurar PUBLIC_BASE_URL.');
    }

    let url;

    try {
        url = new URL(baseUrl);
    } catch {
        throw new Error('PUBLIC_BASE_URL no es una URL válida.');
    }

    if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('PUBLIC_BASE_URL debe usar HTTP o HTTPS.');
    }

    return `${url.origin}/api/documentos/compartido/${token}?formato=archivo`;
};

const crearDocumento = async (req, res, next) => {
    let rutaArchivo;

    try {
        const usuarioId = req.usuario?.id;

        if (!usuarioId) {
            return res.status(401).json({
                success: false,
                mensaje: 'No se pudo identificar al usuario autenticado.'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                mensaje: 'Debes seleccionar un archivo.'
            });
        }

        rutaArchivo = req.file.path;

        const {
            titulo,
            categoriaId,
            seccionId,
            fechaDocumento,
            institucion,
            profesional
        } = req.body;

        if (!categoriaId || !seccionId || !titulo) {
            await fs.unlink(rutaArchivo).catch(() => {});

            return res.status(400).json({
                success: false,
                mensaje: 'El título, la categoría y la sección son obligatorios.'
            });
        }

        const hashSha256 = crypto
            .createHash('sha256')
            .update(await fs.readFile(rutaArchivo))
            .digest('hex');

        const documento = await documentosService.crearDocumento({
            usuarioId,
            categoriaId: Number(categoriaId),
            seccionId: Number(seccionId),
            titulo,
            nombreArchivoOriginal: req.file.originalname,
            fechaDocumento: fechaDocumento || null,
            institucion: institucion || null,
            profesional: profesional || null,
            storageKey: path.relative(
                carpetaAlmacenamiento,
                rutaArchivo
            ),
            tipoMime: req.file.mimetype,
            tamanoBytes: req.file.size,
            hashSha256
        });

        let textoOcr = null;

        const nombreSeccion =
            await documentosService.obtenerNombreSeccion(Number(seccionId));

        if (seccionesConOcr.includes(nombreSeccion)) {
            try {
                textoOcr = await extraerTextoConOcr(req.file);

                await documentosService.guardarTextoOcr(
                    documento.id,
                    usuarioId,
                    textoOcr
                );
            } catch (errorOcr) {
                console.error(
                    'Error al procesar OCR:',
                    errorOcr.message
                );
            }
        }

        return res.status(201).json({
            success: true,
            mensaje: 'Documento guardado correctamente.',
            data: {
                ...documento,
                texto_ocr: textoOcr
            }
        });
    } catch (error) {
        return next(error);
    }
};

const obtenerDocumentos = async (req, res, next) => {
    try {
        const documentos =
            await documentosService.obtenerDocumentosPorUsuario(
                req.usuario.id
            );

        return res.status(200).json({
            success: true,
            data: documentos
        });
    } catch (error) {
        return next(error);
    }
};

const obtenerDocumentoPorId = async (req, res, next) => {
    try {
        const documento =
            await documentosService.obtenerDocumentoPorId(
                Number(req.params.id),
                req.usuario.id
            );

        if (!documento) {
            return res.status(404).json({
                success: false,
                mensaje: 'Documento no encontrado.'
            });
        }

        return res.status(200).json({
            success: true,
            data: documento
        });
    } catch (error) {
        return next(error);
    }
};

const mostrarOriginal = async (req, res, next) => {
    try {
        const documento =
            await documentosService.obtenerDocumentoPorId(
                Number(req.params.id),
                req.usuario.id
            );

        if (!documento) {
            return res.status(404).json({
                success: false,
                mensaje: 'Documento no encontrado.'
            });
        }

        const rutaArchivo = path.resolve(
            carpetaAlmacenamiento,
            documento.storage_key
        );

        if (
            rutaArchivo === carpetaAlmacenamiento ||
            !rutaArchivo.startsWith(`${carpetaAlmacenamiento}${path.sep}`)
        ) {
            return res.status(400).json({
                success: false,
                mensaje: 'La ruta del archivo no es válida.'
            });
        }

        await fs.access(rutaArchivo);

        res.setHeader(
            'Content-Type',
            documento.tipo_mime || 'application/octet-stream'
        );
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Cache-Control', 'no-store');

        return res.sendFile(rutaArchivo);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({
                success: false,
                mensaje: 'El archivo original no está disponible.'
            });
        }

        return next(error);
    }
};

const mostrarTranscripcion = async (req, res, next) => {
    try {
        const documento =
            await documentosService.obtenerDocumentoPorId(
                Number(req.params.id),
                req.usuario.id
            );

        if (!documento) {
            return res.status(404).json({
                success: false,
                mensaje: 'Documento no encontrado.'
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                id: documento.id,
                titulo: documento.titulo,
                texto_ocr: documento.texto_ocr || ''
            }
        });
    } catch (error) {
        return next(error);
    }
};

const compartirDocumento = async (req, res, next) => {
    try {
        const documento =
            await documentosService.obtenerDocumentoPorId(
                Number(req.params.id),
                req.usuario.id
            );

        if (!documento) {
            return res.status(404).json({
                success: false,
                mensaje: 'Documento no encontrado.'
            });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const horas = Number(
            process.env.DOCUMENTO_COMPARTIDO_HORAS || 24
        );

        if (!Number.isFinite(horas) || horas <= 0 || horas > 168) {
            return res.status(500).json({
                success: false,
                mensaje: 'La duración configurada para compartir no es válida.'
            });
        }

        const compartidoHasta = new Date(
            Date.now() + horas * 60 * 60 * 1000
        );

        await documentosService.guardarComparticionDocumento(
            documento.id,
            req.usuario.id,
            tokenHash,
            compartidoHasta
        );

        return res.status(201).json({
            success: true,
            mensaje: 'Enlace temporal creado correctamente.',
            data: {
                url: obtenerUrlCompartida(token),
                compartido_hasta: compartidoHasta
            }
        });
    } catch (error) {
        return next(error);
    }
};

const generarQrDocumento = async (req, res, next) => {
    try {
        const documento =
            await documentosService.obtenerDocumentoPorId(
                Number(req.params.id),
                req.usuario.id
            );

        if (!documento) {
            return res.status(404).json({
                success: false,
                mensaje: 'Documento no encontrado.'
            });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const horas = Number(
            process.env.DOCUMENTO_COMPARTIDO_HORAS || 24
        );

        if (!Number.isFinite(horas) || horas <= 0 || horas > 168) {
            return res.status(500).json({
                success: false,
                mensaje: 'La duración configurada para compartir no es válida.'
            });
        }

        const compartidoHasta = new Date(
            Date.now() + horas * 60 * 60 * 1000
        );

        await documentosService.guardarComparticionDocumento(
            documento.id,
            req.usuario.id,
            tokenHash,
            compartidoHasta
        );

        const url = obtenerUrlCompartida(token);
        const urlQr = process.env.QR_SERVICE_URL || 'http://qr:8000';

        const respuestaQr = await fetch(`${urlQr}/qr`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });

        if (!respuestaQr.ok) {
            throw new Error(
                `El servicio QR respondió con estado ${respuestaQr.status}.`
            );
        }

        const tipoContenido = respuestaQr.headers.get('content-type');

        if (!tipoContenido?.includes('image/png')) {
            throw new Error('El servicio QR no devolvió una imagen PNG.');
        }

        const imagenQr = Buffer.from(await respuestaQr.arrayBuffer());

        return res.status(201).json({
            success: true,
            mensaje: 'Código QR generado correctamente.',
            data: {
                url,
                compartido_hasta: compartidoHasta,
                imagen_base64: imagenQr.toString('base64'),
                imagen_mime: 'image/png'
            }
        });
    } catch (error) {
        return next(error);
    }
};

const obtenerDocumentoCompartido = async (req, res, next) => {
    try {
        const { token } = req.params;

        if (!/^[a-f0-9]{64}$/i.test(token)) {
            return res.status(400).json({
                success: false,
                mensaje: 'El enlace compartido no es válido.'
            });
        }

        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        const documento =
            await documentosService.obtenerDocumentoCompartidoPorTokenHash(
                tokenHash
            );

        if (!documento) {
            return res.status(404).json({
                success: false,
                mensaje: 'El enlace no existe, venció o fue revocado.'
            });
        }

        const rutaArchivo = path.resolve(
            carpetaAlmacenamiento,
            documento.storage_key
        );

        if (
            rutaArchivo === carpetaAlmacenamiento ||
            !rutaArchivo.startsWith(`${carpetaAlmacenamiento}${path.sep}`)
        ) {
            return res.status(400).json({
                success: false,
                mensaje: 'La ruta del archivo no es válida.'
            });
        }

        if (req.query.formato === 'archivo') {
            await fs.access(rutaArchivo);

            res.setHeader(
                'Content-Type',
                documento.tipo_mime || 'application/octet-stream'
            );
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('Cache-Control', 'no-store');

            return res.sendFile(rutaArchivo);
        }

        const urlOriginal = obtenerUrlCompartida(token);

        return res.status(200).json({
            success: true,
            data: {
                id: documento.id,
                titulo: documento.titulo,
                nombre_original: documento.nombre_archivo_original,
                fecha_documento: documento.fecha_documento,
                institucion: documento.institucion,
                profesional: documento.profesional,
                tipo_mime: documento.tipo_mime,
                compartido_hasta: documento.compartido_hasta,
                url_original: urlOriginal
            }
        });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({
                success: false,
                mensaje: 'El archivo original no está disponible.'
            });
        }

        return next(error);
    }
};

const revocarComparticion = async (req, res, next) => {
    try {
        const documento =
            await documentosService.obtenerDocumentoPorId(
                Number(req.params.id),
                req.usuario.id
            );

        if (!documento) {
            return res.status(404).json({
                success: false,
                mensaje: 'Documento no encontrado.'
            });
        }

        await documentosService.revocarComparticionDocumento(
            documento.id,
            req.usuario.id
        );

        return res.status(200).json({
            success: true,
            mensaje: 'El acceso compartido fue revocado.'
        });
    } catch (error) {
        return next(error);
    }
};

const actualizarDocumento = async (req, res, next) => {
    try {
        const documento =
            await documentosService.actualizarDocumento(
                Number(req.params.id),
                req.usuario.id,
                req.body
            );

        if (!documento) {
            return res.status(404).json({
                success: false,
                mensaje: 'Documento no encontrado.'
            });
        }

        return res.status(200).json({
            success: true,
            mensaje: 'Documento actualizado correctamente.',
            data: documento
        });
    } catch (error) {
        return next(error);
    }
};

const eliminarDocumento = async (req, res, next) => {
    try {
        const documento =
            await documentosService.obtenerDocumentoPorId(
                Number(req.params.id),
                req.usuario.id
            );

        if (!documento) {
            return res.status(404).json({
                success: false,
                mensaje: 'Documento no encontrado.'
            });
        }

        const rutaArchivo = path.resolve(
            carpetaAlmacenamiento,
            documento.storage_key
        );

        if (
            rutaArchivo === carpetaAlmacenamiento ||
            !rutaArchivo.startsWith(`${carpetaAlmacenamiento}${path.sep}`)
        ) {
            return res.status(400).json({
                success: false,
                mensaje: 'La ruta del archivo no es válida.'
            });
        }

        const eliminado =
            await documentosService.eliminarDocumento(
                documento.id,
                req.usuario.id
            );

        if (!eliminado) {
            return res.status(404).json({
                success: false,
                mensaje: 'No se pudo encontrar el documento para eliminarlo.'
            });
        }

        await fs.unlink(rutaArchivo).catch((error) => {
            if (error.code !== 'ENOENT') {
                console.error(
                    'Error al eliminar el archivo:',
                    error.message
                );
            }
        });

        return res.status(200).json({
            success: true,
            mensaje: 'Documento eliminado correctamente.'
        });
    } catch (error) {
        return next(error);
    }
};

module.exports = {
    crearDocumento,
    obtenerDocumentos,
    obtenerDocumentoPorId,
    mostrarOriginal,
    mostrarTranscripcion,
    compartirDocumento,
    generarQrDocumento,
    obtenerDocumentoCompartido,
    revocarComparticion,
    actualizarDocumento,
    eliminarDocumento
};
