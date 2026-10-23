const pool = require('../config/conexion-db');

const crearDocumento = async ({
    usuarioId,
    categoriaId,
    seccionId,
    titulo,
    nombreArchivoOriginal,
    fechaDocumento,
    institucion,
    profesional,
    storageKey,
    tipoMime,
    tamanoBytes,
    hashSha256
}) => {
    const consulta = `
        INSERT INTO documentos (
            usuario_id,
            categoria_id,
            seccion_id,
            titulo,
            nombre_archivo_original,
            fecha_documento,
            institucion,
            profesional,
            storage_key,
            tipo_mime,
            tamano_bytes,
            hash_sha256
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING
            id,
            usuario_id,
            categoria_id,
            seccion_id,
            titulo,
            nombre_archivo_original,
            fecha_documento,
            institucion,
            profesional,
            tipo_mime,
            tamano_bytes,
            creado_en,
            actualizado_en
    `;

    const valores = [
        usuarioId,
        categoriaId,
        seccionId,
        titulo,
        nombreArchivoOriginal,
        fechaDocumento || null,
        institucion || null,
        profesional || null,
        storageKey,
        tipoMime,
        tamanoBytes,
        hashSha256 || null
    ];

    const resultado = await pool.query(consulta, valores);

    return resultado.rows[0];
};

const obtenerDocumentosPorUsuario = async (usuarioId) => {
    const consulta = `
        SELECT
            d.id,
            d.categoria_id,
            c.nombre AS categoria,
            d.seccion_id,
            s.nombre AS seccion,
            d.titulo,
            d.nombre_archivo_original,
            d.fecha_documento,
            d.institucion,
            d.profesional,
            d.tipo_mime,
            d.tamano_bytes,
            d.texto_ocr,
            d.resumen_ia,
            d.creado_en,
            d.actualizado_en
        FROM documentos AS d
        INNER JOIN categorias_medicas AS c
            ON c.id = d.categoria_id
        INNER JOIN secciones_medicas AS s
            ON s.id = d.seccion_id
        WHERE d.usuario_id = $1
        ORDER BY d.creado_en DESC
    `;

    const resultado = await pool.query(consulta, [usuarioId]);

    return resultado.rows;
};

const obtenerDocumentoPorId = async (id, usuarioId) => {
    const consulta = `
        SELECT
            d.id,
            d.usuario_id,
            d.categoria_id,
            c.nombre AS categoria,
            d.seccion_id,
            s.nombre AS seccion,
            d.titulo,
            d.nombre_archivo_original,
            d.fecha_documento,
            d.institucion,
            d.profesional,
            d.storage_key,
            d.tipo_mime,
            d.tamano_bytes,
            d.hash_sha256,
            d.texto_ocr,
            d.resumen_ia,
            d.token_comparticion_hash,
            d.compartido_hasta,
            d.creado_en,
            d.actualizado_en
        FROM documentos AS d
        INNER JOIN categorias_medicas AS c
            ON c.id = d.categoria_id
        INNER JOIN secciones_medicas AS s
            ON s.id = d.seccion_id
        WHERE d.id = $1
          AND d.usuario_id = $2
        LIMIT 1
    `;

    const resultado = await pool.query(consulta, [id, usuarioId]);

    return resultado.rows[0] || null;
};

const obtenerNombreSeccion = async (seccionId) => {
    const consulta = `
        SELECT nombre
        FROM secciones_medicas
        WHERE id = $1
        LIMIT 1
    `;

    const resultado = await pool.query(consulta, [seccionId]);

    return resultado.rows[0]?.nombre || null;
};

const guardarTextoOcr = async (id, usuarioId, textoOcr) => {
    const consulta = `
        UPDATE documentos
        SET texto_ocr = $3
        WHERE id = $1
          AND usuario_id = $2
        RETURNING id, texto_ocr, actualizado_en
    `;

    const resultado = await pool.query(consulta, [
        id,
        usuarioId,
        textoOcr
    ]);

    return resultado.rows[0] || null;
};

const actualizarDocumento = async (
    id,
    usuarioId,
    {
        categoriaId,
        seccionId,
        titulo,
        fechaDocumento,
        institucion,
        profesional
    }
) => {
    const consulta = `
        UPDATE documentos
        SET
            categoria_id = $3,
            seccion_id = $4,
            titulo = $5,
            fecha_documento = $6,
            institucion = $7,
            profesional = $8
        WHERE id = $1
          AND usuario_id = $2
        RETURNING
            id,
            categoria_id,
            seccion_id,
            titulo,
            fecha_documento,
            institucion,
            profesional,
            actualizado_en
    `;

    const valores = [
        id,
        usuarioId,
        categoriaId,
        seccionId,
        titulo,
        fechaDocumento || null,
        institucion || null,
        profesional || null
    ];

    const resultado = await pool.query(consulta, valores);

    return resultado.rows[0] || null;
};

const eliminarDocumento = async (id, usuarioId) => {
    const consulta = `
        DELETE FROM documentos
        WHERE id = $1
          AND usuario_id = $2
        RETURNING id, storage_key
    `;

    const resultado = await pool.query(consulta, [
        id,
        usuarioId
    ]);

    return resultado.rows[0] || null;
};

/**
 * Guarda el hash del token y la fecha de vencimiento.
 * El token original nunca se almacena en la base de datos.
 */
const guardarComparticionDocumento = async (
    id,
    usuarioId,
    tokenHash,
    compartidoHasta
) => {
    const consulta = `
        UPDATE documentos
        SET
            token_comparticion_hash = $3,
            compartido_hasta = $4
        WHERE id = $1
          AND usuario_id = $2
        RETURNING
            id,
            compartido_hasta
    `;

    const resultado = await pool.query(consulta, [
        id,
        usuarioId,
        tokenHash,
        compartidoHasta
    ]);

    return resultado.rows[0] || null;
};

/**
 * Busca un documento compartido mediante el hash del token.
 * Solo devuelve el documento si el enlace todavía está vigente.
 */
const obtenerDocumentoCompartidoPorTokenHash = async (tokenHash) => {
    const consulta = `
        SELECT
            d.id,
            d.titulo,
            d.nombre_archivo_original,
            d.fecha_documento,
            d.institucion,
            d.profesional,
            d.storage_key,
            d.tipo_mime,
            d.texto_ocr,
            d.compartido_hasta
        FROM documentos AS d
        WHERE d.token_comparticion_hash = $1
          AND d.compartido_hasta > CURRENT_TIMESTAMP
        LIMIT 1
    `;

    const resultado = await pool.query(consulta, [tokenHash]);

    return resultado.rows[0] || null;
};

/**
 * Revoca un enlace compartido.
 */
const revocarComparticionDocumento = async (id, usuarioId) => {
    const consulta = `
        UPDATE documentos
        SET
            token_comparticion_hash = NULL,
            compartido_hasta = NULL
        WHERE id = $1
          AND usuario_id = $2
        RETURNING id
    `;

    const resultado = await pool.query(consulta, [
        id,
        usuarioId
    ]);

    return resultado.rows[0] || null;
};

module.exports = {
    crearDocumento,
    obtenerDocumentosPorUsuario,
    obtenerDocumentoPorId,
    obtenerNombreSeccion,
    guardarTextoOcr,
    actualizarDocumento,
    eliminarDocumento,
    guardarComparticionDocumento,
    obtenerDocumentoCompartidoPorTokenHash,
    revocarComparticionDocumento
};
