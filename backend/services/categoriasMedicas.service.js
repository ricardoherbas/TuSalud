const conexionDB = require('../config/conexion-db');

const obtenerCategoriasMedicas = async () => {
    const consulta = `
        SELECT id, nombre, descripcion, orden
        FROM categorias_medicas
        WHERE activa = TRUE
        ORDER BY orden, nombre;
    `;

    const resultado = await conexionDB.query(consulta);

    return resultado.rows;
};

const obtenerCategoriaPorId = async (id) => {
    const consulta = `
        SELECT id, nombre, descripcion, orden
        FROM categorias_medicas
        WHERE id = $1 AND activa = TRUE;
    `;

    const resultado = await conexionDB.query(consulta, [id]);

    return resultado.rows[0] || null;
};

module.exports = {
    obtenerCategoriasMedicas,
    obtenerCategoriaPorId
};