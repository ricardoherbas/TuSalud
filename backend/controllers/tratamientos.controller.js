
const tratamientosService = require('../services/tratamientos.service');

const obtenerUsuarioId = (req) => {
    const usuarioId = req.usuario?.id;

    if (!usuarioId) {
        const error = new Error(
            'No se pudo identificar al usuario autenticado.'
        );
        error.status = 401;
        throw error;
    }

    return usuarioId;
};

const obtenerTratamientos = async (req, res, next) => {
    try {
        const usuarioId = obtenerUsuarioId(req);
        const incluirVencidos = req.query.incluirVencidos !== 'false';

        const tratamientos = await tratamientosService.obtenerTratamientos(
            usuarioId,
            incluirVencidos
        );

        return res.status(200).json({
            success: true,
            total: tratamientos.length,
            tratamientos
        });
    } catch (error) {
        next(error);
    }
};

const obtenerTratamientoPorId = async (req, res, next) => {
    try {
        const usuarioId = obtenerUsuarioId(req);
        const { id } = req.params;

        const tratamiento = await tratamientosService.obtenerTratamientoPorId(
            id,
            usuarioId
        );

        if (!tratamiento) {
            return res.status(404).json({
                success: false,
                mensaje: 'No se encontró el tratamiento solicitado.'
            });
        }

        return res.status(200).json({
            success: true,
            tratamiento
        });
    } catch (error) {
        next(error);
    }
};

// Devuelve el archivo adjunto únicamente si pertenece
// a un tratamiento del usuario autenticado.
const obtenerArchivoTratamiento = async (req, res, next) => {
    try {
        const usuarioId = obtenerUsuarioId(req);
        const { id, archivoId } = req.params;

        const archivo =
            await tratamientosService.obtenerArchivoTratamiento(
                id,
                archivoId,
                usuarioId
            );

        if (!archivo) {
            return res.status(404).json({
                success: false,
                mensaje: 'No se encontró el archivo solicitado.'
            });
        }

        res.setHeader('Content-Type', archivo.tipoMime);
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('X-Content-Type-Options', 'nosniff');

        return res.sendFile(archivo.rutaArchivo, error => {
            if (error && !res.headersSent) {
                next(error);
            }
        });
    } catch (error) {
        next(error);
    }
};

const crearTratamiento = async (req, res, next) => {
    try {
        const usuarioId = obtenerUsuarioId(req);

        const tratamiento = await tratamientosService.crearTratamiento(
            req.body,
            usuarioId,
            req.files || {}
        );

        return res.status(201).json({
            success: true,
            mensaje: 'Tratamiento registrado correctamente.',
            tratamiento
        });
    } catch (error) {
        next(error);
    }
};

const actualizarTratamiento = async (req, res, next) => {
    try {
        const usuarioId = obtenerUsuarioId(req);
        const { id } = req.params;

        const tratamiento = await tratamientosService.actualizarTratamiento(
            id,
            usuarioId,
            req.body,
            req.files || {}
        );

        if (!tratamiento) {
            return res.status(404).json({
                success: false,
                mensaje: 'No se encontró el tratamiento solicitado.'
            });
        }

        return res.status(200).json({
            success: true,
            mensaje: 'Tratamiento actualizado correctamente.',
            tratamiento
        });
    } catch (error) {
        next(error);
    }
};

const eliminarTratamiento = async (req, res, next) => {
    try {
        const usuarioId = obtenerUsuarioId(req);
        const { id } = req.params;

        const eliminado = await tratamientosService.eliminarTratamiento(
            id,
            usuarioId
        );

        if (!eliminado) {
            return res.status(404).json({
                success: false,
                mensaje: 'No se encontró el tratamiento solicitado.'
            });
        }

        return res.status(200).json({
            success: true,
            mensaje: 'Tratamiento eliminado correctamente.',
            id: eliminado.id
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    obtenerTratamientos,
    obtenerTratamientoPorId,
    obtenerArchivoTratamiento,
    crearTratamiento,
    actualizarTratamiento,
    eliminarTratamiento
};
