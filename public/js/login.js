document.addEventListener('DOMContentLoaded', function() {
    // Selectores de elementos
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const fileInput = document.getElementById('excel-file');
    const fileName = document.getElementById('file-name');
    const excelUploadForm = document.getElementById('excel-upload');
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const notification = document.getElementById('notification');
    const clienteLoginForm = document.getElementById('cliente-login');
    const adminLoginForm = document.getElementById('admin-login');

    // Cambio de tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Desactivar todos los tabs
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.add('hidden'));
            
            // Activar el tab seleccionado
            const tab = this.getAttribute('data-tab');
            this.classList.add('active');
            document.getElementById(`${tab}-tab`).classList.remove('hidden');
            
            // Resetear notificaciones
            notification.classList.remove('error', 'success');
            notification.style.display = 'none';
            notification.textContent = '';
            
            // Resetear formulario de admin si cambiamos a cliente
            if (tab === 'cliente') {
                step1.classList.remove('hidden');
                step2.classList.add('hidden');
            }
        });
    });

    // Mostrar nombre del archivo seleccionado
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                fileName.textContent = this.files[0].name;
            } else {
                fileName.textContent = '';
            }
        });
    }

    // Formulario de subida de Excel
    if (excelUploadForm) {
        excelUploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!fileInput.files.length) {
                showNotification('Por favor selecciona un archivo Excel', 'error');
                return;
            }
            
            const formData = new FormData();
            formData.append('excel', fileInput.files[0]);
            
            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showNotification('Archivo subido correctamente', 'success');
                    
                    // Mostrar paso 2 (formulario de login)
                    setTimeout(() => {
                        step1.classList.add('hidden');
                        step2.classList.remove('hidden');
                    }, 1000);
                } else {
                    showNotification(data.message || 'Error al subir el archivo', 'error');
                }
            })
            .catch(error => {
                showNotification('Error de conexión', 'error');
                console.error('Error:', error);
            });
        });
    }

    // Formulario de login de cliente
    if (clienteLoginForm) {
        clienteLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('cliente-username').value;
            const password = document.getElementById('cliente-password').value;
            
            fetch('/auth/cliente', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/dashboard';
                } else {
                    showNotification(data.message || 'Credenciales incorrectas', 'error');
                }
            })
            .catch(error => {
                showNotification('Error de conexión', 'error');
                console.error('Error:', error);
            });
        });
    }

    // Formulario de login de admin
if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value;

        // Validación de credenciales en el cliente
        const isValidUser = (
            (username.toLowerCase() === 'ivan muñoz' && password === 'Alessia01') ||
            (username.toLowerCase() === 'greta villegas' && password === 'Alessia01')
        );

        if (!isValidUser) {
            showNotification('Credenciales incorrectas', 'error');
            return;
        }

        // Si las credenciales son válidas, proceder con la autenticación
        fetch('/auth/admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = '/dashboard';
            } else {
                showNotification(data.message || 'Error en la autenticación', 'error');
            }
        })
        .catch(error => {
            showNotification('Error de conexión', 'error');
            console.error('Error:', error);
        });
    });
}

    // Función para mostrar notificaciones
    function showNotification(message, type) {
        notification.textContent = message;
        notification.classList.remove('error', 'success');
        notification.classList.add(type);
        notification.style.display = 'block';
    }
});