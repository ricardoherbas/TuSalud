const seccionesMedicasService = require(
    '../services/seccionesMedicas.service'
);

const obtenerSeccionesPorCategoria = async (req, res, next) => {
    try {
        const { categoriaId } = req.params;

        if (
            !/^\d+$/.test(categoriaId) ||
            !Number.isSafeInteger(Number(categoriaId)) ||
            Number(categoriaId) < 1
        ) {
            const error = new Error('El ID de la categoría no es válido.');
            error.statusCode = 400;
            return next(error);
        }

        const secciones =
            await seccionesMedicasService.obtenerSeccionesPorCategoria(
                categoriaId
            );

        return res.status(200).json({
            success: true,
            data: secciones
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    obtenerSeccionesPorCategoria
};