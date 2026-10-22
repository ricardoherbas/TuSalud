
const api = {
    async solicitar(endpoint, opciones = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            ...opciones.headers
        };
        const tieneCuerpo = opciones.body !== undefined;

        if (tieneCuerpo && !(opciones.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const respuesta = await fetch(`${API_URL}${endpoint}`, {
            ...opciones,
            headers
        });

        const tipoContenido = respuesta.headers.get('content-type');
        const datos = tipoContenido?.includes('application/json')
            ? await respuesta.json()
            : null;

        if (!respuesta.ok) {
            const error = new Error(
                datos?.message || 'Ocurrió un error al comunicarse con el servidor.'
            );
            error.status = respuesta.status;
            throw error;
        }

        return datos;
    },

    get(endpoint) {
        return this.solicitar(endpoint);
    },

    post(endpoint, datos) {
        return this.solicitar(endpoint, {
            method: 'POST',
            body: datos instanceof FormData
                ? datos
                : JSON.stringify(datos)
        });
    },

    put(endpoint, datos) {
        return this.solicitar(endpoint, {
            method: 'PUT',
            body: datos instanceof FormData
                ? datos
                : JSON.stringify(datos)
        });
    },

    delete(endpoint) {
        return this.solicitar(endpoint, {
            method: 'DELETE'
        });
    }
};
