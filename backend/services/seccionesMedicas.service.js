const conexionDB = require('../config/conexion-db');

const obtenerSeccionesPorCategoria = async (categoriaId) => {
    const consulta = `
        SELECT
            s.id,
            s.nombre,
            s.descripcion,
            s.orden
        FROM secciones_medicas AS s
        INNER JOIN categorias_secciones AS cs
            ON cs.seccion_id = s.id
        INNER JOIN categorias_medicas AS c
            ON c.id = cs.categoria_id
        WHERE c.id = $1
          AND c.activa = TRUE
          AND s.activa = TRUE
        ORDER BY s.orden, s.nombre;
    `;

    const resultado = await conexionDB.query(
        consulta,
        [categoriaId]
    );

    return resultado.rows;
};

module.exports = {
    obtenerSeccionesPorCategoria
};