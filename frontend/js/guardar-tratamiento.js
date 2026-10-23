const formulario = document.getElementById('form-tratamiento');
const mensaje = document.getElementById('mensaje-tratamiento');
const botonGuardar = document.getElementById('boton-guardar-tratamiento');

const token = localStorage.getItem('token');

if (!token) {
    window.location.replace('../index.html');
}

function mostrarMensaje(texto, tipo = 'error') {
    mensaje.textContent = texto;
    mensaje.hidden = false;
    mensaje.classList.remove('mensaje-exito', 'mensaje-error');
    mensaje.classList.add(tipo === 'exito' ? 'mensaje-exito' : 'mensaje-error');
}

function ocultarMensaje() {
    mensaje.textContent = '';
    mensaje.hidden = true;
    mensaje.classList.remove('mensaje-exito', 'mensaje-error');
}

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    ocultarMensaje();

    if (!localStorage.getItem('token')) {
        window.location.replace('../index.html');
        return;
    }

    const datosFormulario = new FormData(formulario);
    const nombreMedicamento = datosFormulario.get('nombre_medicamento')?.trim() || '';
    const fechaInicio = datosFormulario.get('fecha_inicio');
    const fechaFin = datosFormulario.get('fecha_fin');

    if (!nombreMedicamento) {
        mostrarMensaje('Ingresá el nombre del medicamento.');
        return;
    }

    if (!fechaInicio) {
        mostrarMensaje('Seleccioná la fecha de inicio del tratamiento.');
        return;
    }

    if (fechaFin && fechaFin < fechaInicio) {
        mostrarMensaje('La fecha de finalización no puede ser anterior a la fecha de inicio.');
        return;
    }

    const imagen = document.getElementById('imagen')?.files[0];
    const receta = document.getElementById('receta')?.files[0];

    const datos = new FormData();

    datos.append('nombre_medicamento', nombreMedicamento);
    datos.append('dosis', datosFormulario.get('dosis')?.trim() || '');
    datos.append('frecuencia', datosFormulario.get('frecuencia')?.trim() || '');
    datos.append('via_administracion', datosFormulario.get('via_administracion') || '');
    datos.append('fecha_inicio', fechaInicio);
    datos.append('fecha_fin', fechaFin || '');
    datos.append('medico', datosFormulario.get('medico')?.trim() || '');
    datos.append('centro_medico', datosFormulario.get('centro_medico')?.trim() || '');
    datos.append('motivo', datosFormulario.get('motivo')?.trim() || '');
    datos.append('indicaciones', datosFormulario.get('indicaciones')?.trim() || '');

    if (imagen) {
        datos.append('imagen', imagen);
    }

    if (receta) {
        datos.append('receta', receta);
    }

    botonGuardar.disabled = true;
    botonGuardar.textContent = 'Guardando...';

    try {
        await api.post('/tratamientos', datos);

        formulario.reset();

        mostrarMensaje('El tratamiento se guardó correctamente.', 'exito');
    } catch (error) {
        if (error.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.replace('../index.html');
            return;
        }

        mostrarMensaje(error.message || 'No se pudo guardar el tratamiento. Intentá nuevamente.');
    } finally {
        botonGuardar.disabled = false;
        botonGuardar.textContent = 'Guardar tratamiento';
    }
});