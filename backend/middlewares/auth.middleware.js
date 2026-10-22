const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
        const error = new Error('Se requiere un token de autenticación.');
        error.statusCode = 401;
        return next(error);
    }

    const token = authorization.split(' ')[1];

    if (!token) {
        const error = new Error('El token de autenticación no fue proporcionado.');
        error.statusCode = 401;
        return next(error);
    }

    if (!process.env.JWT_SECRET) {
        const error = new Error('JWT_SECRET no está configurado.');
        error.statusCode = 500;
        return next(error);
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (!payload.id) {
            const error = new Error('El token no contiene un usuario válido.');
            error.statusCode = 401;
            return next(error);
        }

        req.usuario = {
            id: payload.id,
            email: payload.email
        };

        next();
    } catch (error) {
        error.statusCode = 401;
        error.message = 'El token es inválido o ha expirado.';
        next(error);
    }
};

module.exports = authMiddleware;