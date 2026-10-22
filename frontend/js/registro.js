
const formularioRegistro = document.getElementById('form-registro');
const mensajeRegistro = document.getElementById('mensaje-registro');
const botonRegistro = document.getElementById('boton-registro');

formularioRegistro.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    mensajeRegistro.textContent = '';
    mensajeRegistro.hidden = true;

    const nombre = document.getElementById('nombre').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    if (password.length < 8) {
        mensajeRegistro.textContent = 'La contraseña debe tener al menos 8 caracteres.';
        mensajeRegistro.hidden = false;
        return;
    }

    botonRegistro.disabled = true;
    botonRegistro.textContent = 'Creando cuenta...';

    try {
        await api.post('/usuarios/registro', {
            nombre,
            email,
            password
        });

        window.location.href = '../index.html?registro=exitoso';
    } catch (error) {
        if (error.status === 409) {
            mensajeRegistro.textContent = 'Ya existe una cuenta con ese correo electrónico.';
        } else if (error.status === 400) {
            mensajeRegistro.textContent = error.message;
        } else {
            mensajeRegistro.textContent = error.message || 'No se pudo crear la cuenta. Intentá nuevamente.';
        }

        mensajeRegistro.hidden = false;
    } finally {
        botonRegistro.disabled = false;
        botonRegistro.textContent = 'Crear cuenta';
    }
});
