const validarCrearUsuario = (req, res, next) => {
    const { nombre, email, password } = req.body;

    if (
        typeof nombre !== 'string' ||
        nombre.trim().length < 2 ||
        nombre.trim().length > 150
    ) {
        const error = new Error(
            'El nombre debe tener entre 2 y 150 caracteres.'
        );
        error.statusCode = 400;
        return next(error);
    }

    if (
        typeof email !== 'string' ||
        email.trim().length > 255 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
        const error = new Error('El correo electrónico no es válido.');
        error.statusCode = 400;
        return next(error);
    }

    if (
        typeof password !== 'string' ||
        password.length < 8 ||
        Buffer.byteLength(password, 'utf8') > 72
    ) {
        const error = new Error(
            'La contraseña debe tener al menos 8 caracteres y no superar los 72 bytes.'
        );
        error.statusCode = 400;
        return next(error);
    }

    req.body.nombre = nombre.trim();
    req.body.email = email.trim().toLowerCase();

    next();
};

const validarActualizarUsuario = (req, res, next) => {
    const { nombre, email } = req.body;

    if (
        typeof nombre !== 'string' ||
        nombre.trim().length < 2 ||
        nombre.trim().length > 150
    ) {
        const error = new Error(
            'El nombre debe tener entre 2 y 150 caracteres.'
        );
        error.statusCode = 400;
        return next(error);
    }

    if (
        typeof email !== 'string' ||
        email.trim().length > 255 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
        const error = new Error('El correo electrónico no es válido.');
        error.statusCode = 400;
        return next(error);
    }

    req.body.nombre = nombre.trim();
    req.body.email = email.trim().toLowerCase();

    next();
};

module.exports = {
    validarCrearUsuario,
    validarActualizarUsuario
};