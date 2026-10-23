const token = localStorage.getItem('token');
const usuarioGuardado = localStorage.getItem('usuario');

if (!token) {
    window.location.replace('../index.html');
} else {
    try {
        const usuario = usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
        const saludo = document.getElementById('saludo-usuario');

        if (usuario?.nombre) {
            saludo.textContent = `¡Bienvenido/a, ${usuario.nombre}!`;
        }
    } catch (error) {
        localStorage.removeItem('usuario');
    }
}

document.getElementById('boton-cerrar-sesion').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.replace('../index.html');
});