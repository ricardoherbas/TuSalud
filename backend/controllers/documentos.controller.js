const documentosService = require('../services/documentos.service');
const fs = require('node:fs/promises');

const extraerTextoConOcr = async (archivo) => {
    const url = process.env.OCR_SERVICE_URL || 'http://ocr:8000';

    const contenido = await fs.readFile(archivo.path);

    const formulario = new FormData();
    formulario.append(
        'archivo',
        new Blob([contenido], { type: archivo.mimetype }),
        archivo.originalname
    );

    const respuesta = await fetch(`${url}/ocr`, {
        method: 'POST',
        body: formulario,
        signal: AbortSignal.timeout(120000)
    });

    if (!respuesta.ok) {
        const detalle = await respuesta.text();

        throw new Error(
            `El servicio OCR respondió ${respuesta.status}: ${detalle}`
        );
    }

    const resultado = await respuesta.json();

    return resultado.texto || '';
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
        next(error);
    }
};

const obtenerDocumentoPorId = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (
            !/^\d+$/.test(id) ||
            !Number.isSafeInteger(Number(id)) ||
            Number(id) < 1
        ) {
            const error = new Error('El ID del documento no es válido.');
            error.statusCode = 400;
            return next(error);
        }

        const documento = await documentosService.obtenerDocumentoPorId(
            id,
            req.usuario.id
        );

        if (!documento) {
            const error = new Error('No se encontró el documento.');
            error.statusCode = 404;
            return next(error);
        }

        const {
            storage_key,
            token_comparticion_hash,
            ...documentoPublico
        } = documento;

        return res.status(200).json({
            success: true,
            data: documentoPublico
        });
    } catch (error) {
        next(error);
    }
};

const crearDocumento = async (req, res, next) => {
    try {
        if (!req.file) {
            const error = new Error('Debés adjuntar un archivo.');
            error.statusCode = 400;
            return next(error);
        }

        const {
            categoriaId,
            seccionId,
            titulo,
            fechaDocumento,
            institucion,
            profesional
        } = req.body;

        const nombreSeccion =
            await documentosService.obtenerNombreSeccion(seccionId);

        if (!nombreSeccion) {
            const error = new Error('La sección médica no existe.');
            error.statusCode = 400;
            return next(error);
        }

        let documento = await documentosService.crearDocumento({
            usuarioId: req.usuario.id,
            categoriaId,
            seccionId,
            titulo,
            fechaDocumento: fechaDocumento || null,
            institucion: institucion?.trim() || null,
            profesional: profesional?.trim() || null,
            nombreArchivoOriginal: req.file.originalname,
            storageKey: req.file.filename,
            tipoMime: req.file.mimetype,
            tamanoBytes: req.file.size
        });

        const seccionesConOcr = ['Informes', 'Laboratorios'];

        if (seccionesConOcr.includes(nombreSeccion)) {
            try {
                const textoOcr = await extraerTextoConOcr(req.file);

                documento = await documentosService.guardarTextoOcr(
                    documento.id,
                    req.usuario.id,
                    textoOcr
                );
            } catch (errorOcr) {
                console.error(
                    `No se pudo procesar el documento ${documento.id} con OCR:`,
                    errorOcr.message
                );
            }
        }

        const {
            storage_key,
            hash_sha256,
            token_comparticion_hash,
            ...documentoPublico
        } = documento;

        return res.status(201).json({
            success: true,
            message: 'Documento guardado correctamente.',
            data: documentoPublico
        });
    } catch (error) {
        next(error);
    }
};

const actualizarDocumento = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (
            !/^\d+$/.test(id) ||
            !Number.isSafeInteger(Number(id)) ||
            Number(id) < 1
        ) {
            const error = new Error('El ID del documento no es válido.');
            error.statusCode = 400;
            return next(error);
        }

        const {
            categoriaId,
            seccionId,
            titulo,
            fechaDocumento,
            institucion,
            profesional
        } = req.body;

        const documento = await documentosService.actualizarDocumento(
            id,
            req.usuario.id,
            {
                categoriaId,
                seccionId,
                titulo,
                fechaDocumento: fechaDocumento || null,
                institucion: institucion?.trim() || null,
                profesional: profesional?.trim() || null
            }
        );

        if (!documento) {
            const error = new Error('No se encontró el documento.');
            error.statusCode = 404;
            return next(error);
        }

        return res.status(200).json({
            success: true,
            message: 'Documento actualizado correctamente.',
            data: documento
        });
    } catch (error) {
        next(error);
    }
};

const eliminarDocumento = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (
            !/^\d+$/.test(id) ||
            !Number.isSafeInteger(Number(id)) ||
            Number(id) < 1
        ) {
            const error = new Error('El ID del documento no es válido.');
            error.statusCode = 400;
            return next(error);
        }

        const documento = await documentosService.eliminarDocumento(
            id,
            req.usuario.id
        );

        if (!documento) {
            const error = new Error('No se encontró el documento.');
            error.statusCode = 404;
            return next(error);
        }

        return res.status(200).json({
            success: true,
            message: 'Documento eliminado correctamente.'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    obtenerDocumentos,
    obtenerDocumentoPorId,
    crearDocumento,
    actualizarDocumento,
    eliminarDocumento
};