
const pool = require('../config/conexion-db');
const fs = require('fs/promises');
const path = require('path');

const DIRECTORIO_STORAGE = path.resolve(__dirname, '../storage');

const CAMPOS_ACTUALIZABLES = {
    nombre_medicamento: 'nombre_medicamento',
    dosis: 'dosis',
    frecuencia: 'frecuencia',
    via_administracion: 'via_administracion',
    fecha_inicio: 'fecha_inicio',
    fecha_fin: 'fecha_fin',
    medico: 'medico',
    centro_medico: 'centro_medico',
    motivo: 'motivo',
    indicaciones: 'indicaciones'
};

const CONSULTA_ARCHIVOS = `
    COALESCE(
        (
            SELECT json_agg(
                json_build_object(
                    'id', a.id,
                    'nombre_archivo_original', a.nombre_archivo_original,
                    'storage_key', a.storage_key,
                    'tipo_archivo', a.tipo_archivo,
                    'tipo_mime', a.tipo_mime,
                    'creado_en', a.creado_en
                )
                ORDER BY a.creado_en, a.id
            )
            FROM archivos_tratamientos AS a
            WHERE a.tratamiento_id = t.id
        ),
        '[]'::json
    ) AS archivos
`;

const CONSULTA_ESTADO = `
    CASE
        WHEN t.fecha_fin IS NULL THEN 'sin_fecha_fin'
        WHEN t.fecha_fin < CURRENT_DATE THEN 'vencido'
        ELSE 'vigente_segun_fechas'
    END AS estado_calculado
`;

const obtenerArchivosSubidos = (archivos = {}) => {
    const resultado = [];

    for (const tipo of ['imagen', 'receta']) {
        for (const archivo of archivos[tipo] || []) {
            resultado.push({
                ...archivo,
                tipo_archivo: tipo
            });
        }
    }

    return resultado;
};

const eliminarArchivosFisicos = async (archivos = []) => {
    for (const archivo of archivos) {
        if (!archivo) continue;

        const nombreSeguro = path.basename(archivo);
        const rutaArchivo = path.resolve(
            DIRECTORIO_STORAGE,
            nombreSeguro
        );

        if (path.dirname(rutaArchivo) !== DIRECTORIO_STORAGE) {
            continue;
        }

        try {
            await fs.unlink(rutaArchivo);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(
                    'No se pudo eliminar un archivo:',
                    error.message
                );
            }
        }
    }
};

const guardarMetadatosArchivos = async (
    cliente,
    tratamientoId,
    archivos
) => {
    for (const archivo of archivos) {
        await cliente.query(
            `INSERT INTO archivos_tratamientos (
                tratamiento_id,
                nombre_archivo_original,
                storage_key,
                tipo_archivo,
                tipo_mime
            )
            VALUES ($1, $2, $3, $4, $5)`,
            [
                tratamientoId,
                archivo.originalname,
                archivo.filename,
                archivo.tipo_archivo,
                archivo.mimetype
            ]
        );
    }
};

const obtenerTratamientos = async (
    usuarioId,
    incluirVencidos = true
) => {
    let consulta = `
        SELECT
            t.id,
            t.usuario_id,
            t.nombre_medicamento,
            t.dosis,
            t.frecuencia,
            t.via_administracion,
            t.fecha_inicio,
            t.fecha_fin,
            t.medico,
            t.centro_medico,
            t.motivo,
            t.indicaciones,
            t.creado_en,
            t.actualizado_en,
            ${CONSULTA_ESTADO},
            ${CONSULTA_ARCHIVOS}
        FROM tratamientos AS t
        WHERE t.usuario_id = $1
    `;

    const valores = [usuarioId];

    if (!incluirVencidos) {
        consulta += `
            AND (
                t.fecha_fin IS NULL
                OR t.fecha_fin >= CURRENT_DATE
            )
        `;
    }

    consulta += ' ORDER BY t.fecha_inicio DESC, t.id DESC';

    const { rows } = await pool.query(consulta, valores);

    return rows;
};

const obtenerTratamientoPorId = async (
    tratamientoId,
    usuarioId
) => {
    const consulta = `
        SELECT
            t.id,
            t.usuario_id,
            t.nombre_medicamento,
            t.dosis,
            t.frecuencia,
            t.via_administracion,
            t.fecha_inicio,
            t.fecha_fin,
            t.medico,
            t.centro_medico,
            t.motivo,
            t.indicaciones,
            t.creado_en,
            t.actualizado_en,
            ${CONSULTA_ESTADO},
            ${CONSULTA_ARCHIVOS}
        FROM tratamientos AS t
        WHERE t.id = $1
          AND t.usuario_id = $2
    `;

    const { rows } = await pool.query(consulta, [
        tratamientoId,
        usuarioId
    ]);

    return rows[0] || null;
};

// Obtiene un archivo solamente si pertenece al tratamiento
// solicitado y el tratamiento pertenece al usuario autenticado.
const obtenerArchivoTratamiento = async (
    tratamientoId,
    archivoId,
    usuarioId
) => {
    const consulta = `
        SELECT
            a.id,
            a.nombre_archivo_original,
            a.storage_key,
            a.tipo_mime
        FROM archivos_tratamientos AS a
        INNER JOIN tratamientos AS t
            ON t.id = a.tratamiento_id
        WHERE t.id = $1
          AND a.id = $2
          AND t.usuario_id = $3
    `;

    const { rows } = await pool.query(consulta, [
        tratamientoId,
        archivoId,
        usuarioId
    ]);

    const archivo = rows[0];

    if (!archivo) {
        return null;
    }

    // Evita utilizar nombres que intenten salir de storage.
    const nombreSeguro = path.basename(archivo.storage_key);

    if (
        !nombreSeguro ||
        nombreSeguro !== archivo.storage_key
    ) {
        return null;
    }

    const rutaArchivo = path.resolve(
        DIRECTORIO_STORAGE,
        nombreSeguro
    );

    if (path.dirname(rutaArchivo) !== DIRECTORIO_STORAGE) {
        return null;
    }

    try {
        await fs.access(rutaArchivo);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null;
        }

        throw error;
    }

    return {
        rutaArchivo,
        nombreArchivoOriginal: archivo.nombre_archivo_original,
        tipoMime: archivo.tipo_mime
    };
};

const crearTratamiento = async (
    datos,
    usuarioId,
    archivos = {}
) => {
    const archivosSubidos = obtenerArchivosSubidos(archivos);
    const cliente = await pool.connect();
    let transaccionAbierta = false;

    try {
        await cliente.query('BEGIN');
        transaccionAbierta = true;

        const consulta = `
            INSERT INTO tratamientos (
                usuario_id,
                nombre_medicamento,
                dosis,
                frecuencia,
                via_administracion,
                fecha_inicio,
                fecha_fin,
                medico,
                centro_medico,
                motivo,
                indicaciones
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
            )
            RETURNING *
        `;

        const valores = [
            usuarioId,
            datos.nombre_medicamento.trim(),
            datos.dosis || null,
            datos.frecuencia || null,
            datos.via_administracion || null,
            datos.fecha_inicio,
            datos.fecha_fin || null,
            datos.medico || null,
            datos.centro_medico || null,
            datos.motivo || null,
            datos.indicaciones || null
        ];

        const { rows } = await cliente.query(consulta, valores);
        const tratamiento = rows[0];

        await guardarMetadatosArchivos(
            cliente,
            tratamiento.id,
            archivosSubidos
        );

        await cliente.query('COMMIT');
        transaccionAbierta = false;

        return await obtenerTratamientoPorId(
            tratamiento.id,
            usuarioId
        );
    } catch (error) {
        if (transaccionAbierta) {
            await cliente.query('ROLLBACK');
        }

        await eliminarArchivosFisicos(
            archivosSubidos.map(archivo => archivo.filename)
        );

        throw error;
    } finally {
        cliente.release();
    }
};

const actualizarTratamiento = async (
    tratamientoId,
    usuarioId,
    datos,
    archivos = {}
) => {
    const archivosSubidos = obtenerArchivosSubidos(archivos);
    const cliente = await pool.connect();
    const archivosAnteriores = [];
    let transaccionAbierta = false;

    try {
        await cliente.query('BEGIN');
        transaccionAbierta = true;

        const existente = await cliente.query(
            `SELECT id, fecha_inicio, fecha_fin
             FROM tratamientos
             WHERE id = $1 AND usuario_id = $2
             FOR UPDATE`,
            [tratamientoId, usuarioId]
        );

        if (existente.rows.length === 0) {
            await cliente.query('ROLLBACK');
            transaccionAbierta = false;

            await eliminarArchivosFisicos(
                archivosSubidos.map(archivo => archivo.filename)
            );

            return null;
        }

        const tratamientoActual = existente.rows[0];

        const campos = Object.keys(datos).filter(
            campo => Object.hasOwn(CAMPOS_ACTUALIZABLES, campo)
        );

        const fechaInicio = campos.includes('fecha_inicio')
            ? datos.fecha_inicio
            : tratamientoActual.fecha_inicio;

        const fechaFin = campos.includes('fecha_fin')
            ? datos.fecha_fin || null
            : tratamientoActual.fecha_fin;

        if (
            fechaFin &&
            String(fechaFin).slice(0, 10) <
                String(fechaInicio).slice(0, 10)
        ) {
            const error = new Error(
                'La fecha de finalización no puede ser anterior a la fecha de inicio.'
            );
            error.status = 400;
            throw error;
        }

        if (campos.length > 0) {
            const valores = [];

            const asignaciones = campos.map((campo, indice) => {
                let valor = datos[campo];

                if (
                    campo === 'nombre_medicamento' &&
                    typeof valor === 'string'
                ) {
                    valor = valor.trim();
                }

                if (campo === 'fecha_fin' && valor === '') {
                    valor = null;
                }

                valores.push(valor);

                return `${CAMPOS_ACTUALIZABLES[campo]} = $${indice + 1}`;
            });

            valores.push(tratamientoId, usuarioId);

            const consulta = `
                UPDATE tratamientos
                SET ${asignaciones.join(', ')},
                    actualizado_en = CURRENT_TIMESTAMP
                WHERE id = $${valores.length - 1}
                  AND usuario_id = $${valores.length}
                RETURNING id
            `;

            await cliente.query(consulta, valores);
        }

        for (const archivo of archivosSubidos) {
            const anteriores = await cliente.query(
                `SELECT storage_key
                 FROM archivos_tratamientos
                 WHERE tratamiento_id = $1
                   AND tipo_archivo = $2`,
                [tratamientoId, archivo.tipo_archivo]
            );

            archivosAnteriores.push(
                ...anteriores.rows.map(fila => fila.storage_key)
            );

            await cliente.query(
                `DELETE FROM archivos_tratamientos
                 WHERE tratamiento_id = $1
                   AND tipo_archivo = $2`,
                [tratamientoId, archivo.tipo_archivo]
            );
        }

        await guardarMetadatosArchivos(
            cliente,
            tratamientoId,
            archivosSubidos
        );

        await cliente.query('COMMIT');
        transaccionAbierta = false;

        await eliminarArchivosFisicos(archivosAnteriores);

        return await obtenerTratamientoPorId(
            tratamientoId,
            usuarioId
        );
    } catch (error) {
        if (transaccionAbierta) {
            await cliente.query('ROLLBACK');
        }

        await eliminarArchivosFisicos(
            archivosSubidos.map(archivo => archivo.filename)
        );

        throw error;
    } finally {
        cliente.release();
    }
};

const eliminarTratamiento = async (
    tratamientoId,
    usuarioId
) => {
    const cliente = await pool.connect();
    let transaccionAbierta = false;
    let archivosAnteriores = [];

    try {
        await cliente.query('BEGIN');
        transaccionAbierta = true;

        const existente = await cliente.query(
            `SELECT id
             FROM tratamientos
             WHERE id = $1 AND usuario_id = $2
             FOR UPDATE`,
            [tratamientoId, usuarioId]
        );

        if (existente.rows.length === 0) {
            await cliente.query('ROLLBACK');
            transaccionAbierta = false;
            return null;
        }

        const archivos = await cliente.query(
            `SELECT storage_key
             FROM archivos_tratamientos
             WHERE tratamiento_id = $1`,
            [tratamientoId]
        );

        archivosAnteriores = archivos.rows.map(
            archivo => archivo.storage_key
        );

        await cliente.query(
            `DELETE FROM tratamientos
             WHERE id = $1 AND usuario_id = $2`,
            [tratamientoId, usuarioId]
        );

        await cliente.query('COMMIT');
        transaccionAbierta = false;

        await eliminarArchivosFisicos(archivosAnteriores);

        return { id: tratamientoId };
    } catch (error) {
        if (transaccionAbierta) {
            await cliente.query('ROLLBACK');
        }

        throw error;
    } finally {
        cliente.release();
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
