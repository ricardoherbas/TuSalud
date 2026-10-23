
const camposTexto = [
    'nombre_medicamento',
    'dosis',
    'frecuencia',
    'via_administracion',
    'medico',
    'centro_medico',
    'motivo',
    'indicaciones'
];

const longitudes = {
    nombre_medicamento: 200,
    dosis: 150,
    frecuencia: 200,
    via_administracion: 100,
    medico: 200,
    centro_medico: 200
};

const validarTextoOpcional = (valor, campo) => {
    if (valor === undefined || valor === null) {
        return null;
    }

    if (typeof valor !== 'string') {
        return `${campo} debe ser un texto.`;
    }

    return null;
};

const validarFecha = (valor, campo, obligatoria = false) => {
    if (valor === undefined || valor === null || valor === '') {
        return obligatoria
            ? `${campo} es obligatorio.`
            : null;
    }

    if (
        typeof valor !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(valor)
    ) {
        return `${campo} debe tener el formato YYYY-MM-DD.`;
    }

    const fecha = new Date(`${valor}T00:00:00.000Z`);

    if (
        Number.isNaN(fecha.getTime()) ||
        fecha.toISOString().slice(0, 10) !== valor
    ) {
        return `${campo} no es una fecha válida.`;
    }

    return null;
};

const validarLongitud = (valor, campo, maximo) => {
    if (typeof valor === 'string' && valor.length > maximo) {
        return `${campo} no puede superar los ${maximo} caracteres.`;
    }

    return null;
};

const validarCamposTexto = (datos, errores, camposAValidar) => {
    for (const campo of camposAValidar) {
        const errorTipo = validarTextoOpcional(datos[campo], campo);

        if (errorTipo) {
            errores.push(errorTipo);
            continue;
        }

        if (longitudes[campo] && typeof datos[campo] === 'string') {
            const errorLongitud = validarLongitud(
                datos[campo],
                campo,
                longitudes[campo]
            );

            if (errorLongitud) {
                errores.push(errorLongitud);
            }
        }
    }
};

const validarRangoFechas = (fechaInicio, fechaFin, errores) => {
    if (
        fechaInicio &&
        fechaFin &&
        typeof fechaInicio === 'string' &&
        typeof fechaFin === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(fechaInicio) &&
        /^\d{4}-\d{2}-\d{2}$/.test(fechaFin) &&
        fechaFin < fechaInicio
    ) {
        errores.push(
            'La fecha de finalización no puede ser anterior a la fecha de inicio.'
        );
    }
};

const validarTratamiento = (req, res, next) => {
    const datos = req.body;

    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
        return res.status(400).json({
            success: false,
            mensaje: 'Los datos del tratamiento son inválidos.'
        });
    }

    const errores = [];

    if (
        typeof datos.nombre_medicamento !== 'string' ||
        !datos.nombre_medicamento.trim()
    ) {
        errores.push('El nombre del medicamento es obligatorio.');
    } else {
        const error = validarLongitud(
            datos.nombre_medicamento,
            'El nombre del medicamento',
            200
        );

        if (error) {
            errores.push(error);
        }
    }

    const errorFechaInicio = validarFecha(
        datos.fecha_inicio,
        'La fecha de inicio',
        true
    );

    if (errorFechaInicio) {
        errores.push(errorFechaInicio);
    }

    const errorFechaFin = validarFecha(
        datos.fecha_fin,
        'La fecha de finalización'
    );

    if (errorFechaFin) {
        errores.push(errorFechaFin);
    }

    validarRangoFechas(
        datos.fecha_inicio,
        datos.fecha_fin,
        errores
    );

    validarCamposTexto(datos, errores, camposTexto);

    if (errores.length > 0) {
        return res.status(400).json({
            success: false,
            mensaje: 'Hay errores en los datos del tratamiento.',
            errores
        });
    }

    datos.nombre_medicamento = datos.nombre_medicamento.trim();

    next();
};

const validarActualizacionTratamiento = (req, res, next) => {
    const datos = req.body;

    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
        return res.status(400).json({
            success: false,
            mensaje: 'Los datos de actualización son inválidos.'
        });
    }

    if (Object.keys(datos).length === 0) {
        return res.status(400).json({
            success: false,
            mensaje: 'Debés enviar al menos un campo para actualizar.'
        });
    }

    const camposPermitidos = [
        ...camposTexto,
        'fecha_inicio',
        'fecha_fin'
    ];

    const camposNoPermitidos = Object.keys(datos).filter(
        campo => !camposPermitidos.includes(campo)
    );

    if (camposNoPermitidos.length > 0) {
        return res.status(400).json({
            success: false,
            mensaje: 'Hay campos que no se pueden modificar.',
            errores: camposNoPermitidos
        });
    }

    const errores = [];

    if ('nombre_medicamento' in datos) {
        if (
            typeof datos.nombre_medicamento !== 'string' ||
            !datos.nombre_medicamento.trim()
        ) {
            errores.push(
                'El nombre del medicamento no puede estar vacío.'
            );
        } else {
            const error = validarLongitud(
                datos.nombre_medicamento,
                'El nombre del medicamento',
                200
            );

            if (error) {
                errores.push(error);
            }
        }
    }

    for (const campo of ['fecha_inicio', 'fecha_fin']) {
        if (campo in datos) {
            const error = validarFecha(
                datos[campo],
                campo === 'fecha_inicio'
                    ? 'La fecha de inicio'
                    : 'La fecha de finalización',
                campo === 'fecha_inicio'
            );

            if (error) {
                errores.push(error);
            }
        }
    }

    validarCamposTexto(
        datos,
        errores,
        camposTexto.filter(campo => campo in datos)
    );

    validarRangoFechas(
        datos.fecha_inicio,
        datos.fecha_fin,
        errores
    );

    if (errores.length > 0) {
        return res.status(400).json({
            success: false,
            mensaje: 'Hay errores en los datos del tratamiento.',
            errores
        });
    }

    if (typeof datos.nombre_medicamento === 'string') {
        datos.nombre_medicamento = datos.nombre_medicamento.trim();
    }

    next();
};

const validarIdTratamiento = (req, res, next) => {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
            success: false,
            mensaje: 'El identificador del tratamiento no es válido.'
        });
    }

    next();
};

module.exports = {
    validarTratamiento,
    validarActualizacionTratamiento,
    validarIdTratamiento
};
