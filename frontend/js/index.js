
const formularioLogin = document.getElementById('form-login');
const mensajeLogin = document.getElementById('mensaje-login');
const botonLogin = document.getElementById('boton-login');

formularioLogin.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    mensajeLogin.textContent = '';
    mensajeLogin.hidden = true;
    botonLogin.disabled = true;
    botonLogin.textContent = 'Ingresando...';

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
        const respuesta = await api.post('/usuarios/login', {
            email,
            password
        });

        localStorage.setItem('token', respuesta.data.token);
        localStorage.setItem(
            'usuario',
            JSON.stringify(respuesta.data.usuario)
        );

        window.location.href = './pages/categorias.html';
    } catch (error) {
        mensajeLogin.textContent = error.status === 401
            ? 'El correo electrónico o la contraseña son incorrectos.'
            : error.message || 'No se pudo iniciar sesión. Intentá nuevamente.';

        mensajeLogin.hidden = false;
    } finally {
        botonLogin.disabled = false;
        botonLogin.textContent = 'Iniciar sesión';
    }
});
