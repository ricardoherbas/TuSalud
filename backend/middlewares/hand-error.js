const handError = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        success: false,
        message: statusCode === 500
            ? 'Error interno del servidor.'
            : err.message
    });
};

module.exports = handError;