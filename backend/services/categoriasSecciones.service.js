const conexionDB = require('../config/conexion-db');

const obtenerTodasLasRelaciones = async () => {
    const consulta = `
        SELECT
            c.id AS categoria_id,
            c.nombre AS categoria,
            s.id AS seccion_id,
            s.nombre AS seccion
        FROM categorias_secciones AS cs
        INNER JOIN categorias_medicas AS c
            ON c.id = cs.categoria_id
        INNER JOIN secciones_medicas AS s
            ON s.id = cs.seccion_id
        WHERE c.activa = TRUE
          AND s.activa = TRUE
        ORDER BY c.orden, s.orden;
    `;

    const resultado = await conexionDB.query(consulta);

    return resultado.rows;
};

const existeRelacion = async (categoriaId, seccionId) => {
    const consulta = `
        SELECT 1
        FROM categorias_secciones AS cs
        INNER JOIN categorias_medicas AS c
            ON c.id = cs.categoria_id
        INNER JOIN secciones_medicas AS s
            ON s.id = cs.seccion_id
        WHERE cs.categoria_id = $1
          AND cs.seccion_id = $2
          AND c.activa = TRUE
          AND s.activa = TRUE;
    `;

    const resultado = await conexionDB.query(
        consulta,
        [categoriaId, seccionId]
    );

    return resultado.rowCount > 0;
};

module.exports = {
    obtenerTodasLasRelaciones,
    existeRelacion
};