const crearError = (mensaje) => {
    const error = new Error(mensaje);
    error.statusCode = 400;
    return error;
};

const validarId = (valor) => {
    return (
        (typeof valor === 'number' || (
            typeof valor === 'string' && /^\d+$/.test(valor)
        )) &&
        Number.isSafeInteger(Number(valor)) &&
        Number(valor) > 0
    );
};

const validarFecha = (fecha) => {
    if (fecha === null || fecha === undefined || fecha === '') {
        return true;
    }

    if (
        typeof fecha !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ) {
        return false;
    }

    const [anio, mes, dia] = fecha.split('-').map(Number);
    const fechaComprobada = new Date(Date.UTC(anio, mes - 1, dia));

    return (
        fechaComprobada.getUTCFullYear() === anio &&
        fechaComprobada.getUTCMonth() === mes - 1 &&
        fechaComprobada.getUTCDate() === dia
    );
};

const validarCamposDocumento = (body) => {
    const {
        categoriaId,
        seccionId,
        titulo,
        fechaDocumento,
        institucion,
        profesional
    } = body;

    if (!validarId(categoriaId)) {
        return 'La categoría médica debe ser un ID válido.';
    }

    if (!validarId(seccionId)) {
        return 'La sección médica debe ser un ID válido.';
    }

    if (
        typeof titulo !== 'string' ||
        titulo.trim().length < 1 ||
        titulo.trim().length > 200
    ) {
        return 'El título debe tener entre 1 y 200 caracteres.';
    }

    if (!validarFecha(fechaDocumento)) {
        return 'La fecha del documento no es válida.';
    }

    if (
        institucion != null &&
        (typeof institucion !== 'string' || institucion.length > 200)
    ) {
        return 'La institución no puede superar los 200 caracteres.';
    }

    if (
        profesional != null &&
        (typeof profesional !== 'string' || profesional.length > 200)
    ) {
        return 'El profesional no puede superar los 200 caracteres.';
    }

    return null;
};

const validarCrearDocumento = (req, res, next) => {
    const body = req.body || {};
    const mensajeError = validarCamposDocumento(body);

    if (mensajeError) {
        return next(crearError(mensajeError));
    }

    body.categoriaId = Number(body.categoriaId);
    body.seccionId = Number(body.seccionId);
    body.titulo = body.titulo.trim();

    req.body = body;

    next();
};

const validarActualizarDocumento = (req, res, next) => {
    const body = req.body || {};
    const mensajeError = validarCamposDocumento(body);

    if (mensajeError) {
        return next(crearError(mensajeError));
    }

    body.categoriaId = Number(body.categoriaId);
    body.seccionId = Number(body.seccionId);
    body.titulo = body.titulo.trim();

    req.body = body;

    next();
};

module.exports = {
    validarCrearDocumento,
    validarActualizarDocumento
};