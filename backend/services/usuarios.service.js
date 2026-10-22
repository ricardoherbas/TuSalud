const conexionDB = require('../config/conexion-db');

const crearUsuario = async ({ nombre, email, passwordHash }) => {
    const consulta = `
        INSERT INTO usuarios (nombre, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id, nombre, email, creado_en, actualizado_en;
    `;

    const valores = [
        nombre.trim(),
        email.trim().toLowerCase(),
        passwordHash
    ];

    const resultado = await conexionDB.query(consulta, valores);

    return resultado.rows[0];
};

const obtenerUsuarioPorId = async (id) => {
    const consulta = `
        SELECT id, nombre, email, creado_en, actualizado_en
        FROM usuarios
        WHERE id = $1;
    `;

    const resultado = await conexionDB.query(consulta, [id]);

    return resultado.rows[0] || null;
};

const obtenerUsuarioPorEmail = async (email) => {
    const consulta = `
        SELECT id, nombre, email, password_hash
        FROM usuarios
        WHERE email = $1;
    `;

    const resultado = await conexionDB.query(
        consulta,
        [email.trim().toLowerCase()]
    );

    return resultado.rows[0] || null;
};

const actualizarUsuario = async (id, { nombre, email }) => {
    const consulta = `
        UPDATE usuarios
        SET nombre = $1,
            email = $2
        WHERE id = $3
        RETURNING id, nombre, email, creado_en, actualizado_en;
    `;

    const valores = [
        nombre.trim(),
        email.trim().toLowerCase(),
        id
    ];

    const resultado = await conexionDB.query(consulta, valores);

    return resultado.rows[0] || null;
};

module.exports = {
    crearUsuario,
    obtenerUsuarioPorId,
    obtenerUsuarioPorEmail,
    actualizarUsuario
};