const categoriasMedicasService = require(
    '../services/categoriasMedicas.service'
);

const obtenerCategoriasMedicas = async (req, res, next) => {
    try {
        const categorias =
            await categoriasMedicasService.obtenerCategoriasMedicas();

        return res.status(200).json({
            success: true,
            data: categorias
        });
    } catch (error) {
        next(error);
    }
};

const obtenerCategoriaPorId = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1) {
            const error = new Error('El ID de la categoría no es válido.');
            error.statusCode = 400;
            return next(error);
        }

        const categoria =
            await categoriasMedicasService.obtenerCategoriaPorId(id);

        if (!categoria) {
            const error = new Error('No se encontró la categoría médica.');
            error.statusCode = 404;
            return next(error);
        }

        return res.status(200).json({
            success: true,
            data: categoria
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    obtenerCategoriasMedicas,
    obtenerCategoriaPorId
};