const jwt = require('jsonwebtoken');

const generarToken = (usuario) => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET no está configurado.');
    }

    return jwt.sign(
        {
            id: usuario.id,
            email: usuario.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: '2h'
        }
    );
};

module.exports = generarToken;