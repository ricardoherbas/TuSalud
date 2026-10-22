const bcrypt = require('bcryptjs');

const usuariosService = require('../services/usuarios.service');
const generarToken = require('../utils/generar-token');

const registrarUsuario = async (req, res, next) => {
    try {
        const { nombre, email, password } = req.body;

        const passwordHash = await bcrypt.hash(password, 12);

        const usuario = await usuariosService.crearUsuario({
            nombre,
            email,
            passwordHash
        });

        return res.status(201).json({
            success: true,
            message: 'Usuario registrado correctamente.',
            data: usuario
        });
    } catch (error) {
        if (error.code === '23505') {
            error.statusCode = 409;
            error.message = 'Ya existe un usuario con ese correo electrónico.';
        }

        return next(error);
    }
};

const iniciarSesion = async (req, res, next) => {
    try {
        const { email, password } = req.body || {};

        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            const error = new Error(
                'Debés proporcionar un correo electrónico y una contraseña.'
            );
            error.statusCode = 400;
            return next(error);
        }

        const usuario = await usuariosService.obtenerUsuarioPorEmail(
            email.trim().toLowerCase()
        );

        if (
            !usuario ||
            !(await bcrypt.compare(password, usuario.password_hash))
        ) {
            const error = new Error(
                'Correo electrónico o contraseña incorrectos.'
            );
            error.statusCode = 401;
            return next(error);
        }

        const token = generarToken(usuario);

        return res.status(200).json({
            success: true,
            message: 'Inicio de sesión correcto.',
            data: {
                token,
                usuario: {
                    id: usuario.id,
                    nombre: usuario.nombre,
                    email: usuario.email
                }
            }
        });
    } catch (error) {
        if (error.message === 'JWT_SECRET no está configurado.') {
            error.statusCode = 500;
        }

        return next(error);
    }
};

const obtenerPerfil = async (req, res, next) => {
    try {
        const usuario = await usuariosService.obtenerUsuarioPorId(
            req.usuario.id
        );

        if (!usuario) {
            const error = new Error('El usuario no existe.');
            error.statusCode = 404;
            return next(error);
        }

        return res.status(200).json({
            success: true,
            data: usuario
        });
    } catch (error) {
        return next(error);
    }
};

const actualizarPerfil = async (req, res, next) => {
    try {
        const { nombre, email } = req.body;

        const usuario = await usuariosService.actualizarUsuario(
            req.usuario.id,
            { nombre, email }
        );

        if (!usuario) {
            const error = new Error('El usuario no existe.');
            error.statusCode = 404;
            return next(error);
        }

        return res.status(200).json({
            success: true,
            message: 'Perfil actualizado correctamente.',
            data: usuario
        });
    } catch (error) {
        if (error.code === '23505') {
            error.statusCode = 409;
            error.message = 'Ya existe un usuario con ese correo electrónico.';
        }

        return next(error);
    }
};

module.exports = {
    registrarUsuario,
    iniciarSesion,
    obtenerPerfil,
    actualizarPerfil
};