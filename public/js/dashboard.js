document.addEventListener('DOMContentLoaded', function() {
    // Obtener información del usuario y pedido
    getUserInfo();

    // Configurar el botón de logout
    const logoutForm = document.getElementById('logout-form');
    if (logoutForm) {
        logoutForm.addEventListener('submit', function(e) {
            e.preventDefault();

            fetch('/logout', {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/';
                }
            })
            .catch(error => {
                console.error('Error al cerrar sesión:', error);
            });
        });
    }
});

// Función para obtener la información del usuario y del pedido
function getUserInfo() {
    fetch('/api/user-info')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Mostrar nombre de usuario
                document.getElementById('username').textContent = data.user.username;

                // Obtener información del pedido
                getOrderInfo(data);
            } else {
                console.error('Error al obtener información del usuario');
                window.location.href = '/';
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// Función para obtener la información del pedido
function getOrderInfo() {
    fetch('/api/order-info')
    .then(response => response.json())
    .then(data => {
        // Modificación 1: Acceder correctamente a data.orders
        if (data.success && data.orders) {
            // Convertir a array si es necesario
            const ordersArray = Array.isArray(data.orders) ? data.orders : [data.orders];
            displayOrderInfo(ordersArray);
            toggleButtonVisibility(ordersArray);
            toggleGuiaVisibility(ordersArray);
        } else {
            handleError(data.message);
        }
    })
    .catch(error => {
        handleError(error.message);
    });
}

function displayOrderInfo(orders) {
    const container = document.getElementById('order-card');
    container.innerHTML = ''; // Limpiar contenido anterior

    // Modificación 2: Normalizar a array
    const normalizedOrders = !Array.isArray(orders) ? [orders] : orders;
    // console.log(normalizedOrders, 'Respuesta normalizada');
    if (normalizedOrders.length === 0) {
        container.innerHTML = '<p>No hay pedidos disponibles</p>';
        return;
    }

    function excelNumToDate(excelNum) {
        const fechaBase = new Date(1900, 0, 1);
        const fecha = new Date(fechaBase.getTime() + (excelNum - 1) * 86400000);
        if (excelNum >= 60) fecha.setDate(fecha.getDate() - 1);
        return fecha;
    }
    function formatearMonto(valor) {
        if (typeof valor !== 'number' || isNaN(valor)) {
            return '$Pendiente'; // Si no es número o está vacío
        }
        
        // Formato: comas cada 3 cifras y símbolo $ al inicio
        return '$' + valor.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // Modificación 3: Crear elementos dinámicos para múltiples pedidos
    normalizedOrders.forEach((order, index) => {
        const orderElement = document.createElement('div');
        orderElement.className = 'detail-item';

        // Modificación 4: Usar template literal para mejor legibilidad
        orderElement.innerHTML = `
            <div class="order-card">
                <div class="order-header">
                    <h2>Información del Pedido: ${order.num_pedido || ''}</h2>
                    <span class="order-id" id="order-id">${order.id_cliente || 'N/A'}</span>
                </div>

                <div class="order-details" id="order-card">
                    <div class="detail-item">
                        <span class="detail-label">Cliente:</span>
                        <span class="detail-value" id="cliente">${order.nombre_cliente || 'Sin especificar'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Transporte:</span>
                        <span class="detail-value" id="cantidad">${order.transporte || 'Pendiente'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Numero de Factura:</span>
                        <span class="detail-value" id="factura">${order.num_factura || 'Pendiente'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Monto Total:</span>
                        <span class="detail-value monto-dinamico">${formatearMonto(order.gran_total || order.gran_total_pedido || order.gran_total_entrega || 'Pendiente')}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Fecha de Ingreso:</span>
                        <span class="detail-value" id="fecha_ingreso">${order.fecha_pedido || 'Pendiente'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Numero de Pedido:</span>
                        <span class="detail-value" id="pedido">${order.num_pedido || 'Pendiente'}</span>
                    </div>
                </div>


                <div class="status-tracker">
                    <div class="status-bar">
                        <div class="status-progres" data-index="${index}"></div>
                    </div>
                    <div class="status-steps" data-index="${index}">
                        <div data-step="1">
                            <div class="step-dot"></div>
                            <div class="step-label">Orden ingresada</div>
                        </div>
                        <div data-step="2">
                            <div class="step-dot"></div>
                            <div class="step-label">Surtiendo</div>
                        </div>
                        <div data-step="3">
                            <div class="step-dot"></div>
                            <div class="step-label">Empacando</div>
                        </div>
                        <div data-step="4">
                            <div class="step-dot"></div>
                            <div class="step-label">Pedido listo</div>
                        </div>
                    </div>
                </div>

                <div class="order-actions" id="order-actions">
                    <!-- Botones condicionales (factura/guía) se agregarán aquí con JavaScript -->
                    <div class="document-container">
                        <div class="document-card factura">
                            <div class="document-header">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M14 2V8H20" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M16 13H8" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M16 17H8" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M10 9H8" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                <div class="document-title">Factura</div>
                            </div>

                            <div class="document-status">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="#666" stroke-width="2"/>
                                    <path d="M12 8V12" stroke="#666" stroke-width="2" stroke-linecap="round"/>
                                    <circle cx="12" cy="16" r="1" fill="#666"/>
                                </svg>
                                No disponible
                            </div>

                            <button class="download-button">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                
                                Descargar Factura
                            </button>
                        </div>

                        <div class="document-card guia">
                            <div class="document-status">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="#666" stroke-width="2"/>
                                    <path d="M12 8V12" stroke="#666" stroke-width="2" stroke-linecap="round"/>
                                    <circle cx="12" cy="16" r="1" fill="#666"/>
                                </svg>
                                26/marzo/2025
                            </div>

                            <div class="document-header">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M14 2V8H20" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M16 13H8" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M16 17H8" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M10 9H8" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                <span class="guide-number">No. de guía <span class="guide-code">111111</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(orderElement);
        updateProgressForOrder(orderElement, order, index);
    });
}

function handleError(message) {
    console.error('Error:', message);
    document.getElementById('error-message').textContent =
        `Error al cargar pedidos: ${message || 'Intente recargar la página'}`;
}

function updateProgressForOrder(orderElement, order, index) {
    // Verificar que los parámetros sean válidos
    if (!orderElement || !order) {
        console.error("Parámetros inválidos para updateProgressForOrder:", { orderElement, order, index });
        return;
    }

    // Variable para almacenar el estado actual
    let statusNumber = 1; // Valor predeterminado
    
    try {
        // Acceder con seguridad a las propiedades
        const statusPedido = order['Estatus del pedido'] || '';
        const entrega = order['num_entrega'] || '';
        const factura = order['num_factura'] || '';
        const statusPedidoUno = order['status_uno'] || '';
        // const precio_uno = order['gran_total_uno'] || '';
        // const precio_dos = order['gran_total_dos'] || '';
        // let montoActual;
        
        // Determinar el estado según las condiciones requeridas
        if (statusPedidoUno === 'Bloqueado') {
            statusNumber = 1; // Orden ingresada
            // console.log('dentro del caso 1');
        } else if (statusPedidoUno === 'Liberado' && entrega === '') {
            statusNumber = 2; // Surtiendo
            // console.log('dentro del caso 2');
        } else if (entrega !== '' && factura === '') {
            statusNumber = 3; // Empacando
            // console.log('dentro del caso 3');
        } else if (factura) {
            statusNumber = 4; // Pedido listo
            // console.log('dentro del caso 4');
        }

        // Actualizar la barra de progreso con verificación de seguridad
        const progressBar = orderElement.querySelector(`.status-progres[data-index="${index}"]`);
        if (progressBar) {
            progressBar.style.width = `${(statusNumber * 25)}%`;
            console.log(`Barra de progreso actualizada para el pedido ${index + 1}: ${statusNumber * 25}%`);
        } else {
            console.error(`No se encontró el elemento '.status-progress' para el pedido ${index + 1}`);
        }

        // Actualizar clases de los pasos con verificación de seguridad
        const statusSteps = orderElement.querySelectorAll(`.status-steps[data-index="${index}"]`);
        if (statusSteps && statusSteps.length > 0) {
            statusSteps.forEach((step, i) => { 
                if (!step) return;

                // Usar el índice como número de paso si no hay atributo data-step
                const stepNumber = parseInt(step.getAttribute('data-step') || (i + 1).toString());
                const dot = step.querySelector('.step-dot');
                console.log(stepNumber,"AQUI ESTA EL STEPNUMBER");
                console.log(statusNumber,"AQUI ESTA EL STATUSNUMBER");
                if (dot) {
                    console.log(step,"DENTRO DEL IF Y ESTO STEP")
                    if (stepNumber < statusNumber) {
                        dot.classList.add('active');
                        step.classList.add('completed');
                    } else if (stepNumber === statusNumber) {
                        step.classList.add('active');
                        dot.classList.add('completed');
                    } else {
                        step.classList.remove('active','completed');
                        dot.classList.remove('active','completed');
                    }
                } else {
                    console.warn(`No se encontró el elemento '.step-dot' en el paso ${i + 1} del pedido ${index + 1}`);
                }
            });
        } else {
            console.error(`No se encontraron elementos '.status-step' para el pedido ${index + 1}`);
        }

    } catch (error) {
        console.error("Error en updateProgressForOrder:", error);
    }
    
}

// Añadir efectos de click a los botones
document.querySelectorAll('.btn').forEach(button => {
    button.addEventListener('click', function() {
        if (!this.classList.contains('disabled')) {
            // Feedback visual al hacer clic
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 200);

            // Aquí puedes añadir la lógica para descargar los documentos
            console.log(`Descargando ${this.textContent.trim()}`);
        }
    });
});

// Función para verse disponible o no disponible botón de Factura
function toggleButtonVisibility(orders) {
    orders.forEach((order, index) => {
        // Seleccionar elementos DENTRO del pedido actual (usando índice para ID único)
        const orderCard = document.querySelectorAll('.order-card')[index]; // Asume que cada pedido tiene clase .order-card
        const button = orderCard.querySelector('.download-button');
        const facturaStatus = orderCard.querySelector('.document-status');

        if (button && facturaStatus) {
            // 1. Actualizar visibilidad y estilos
            if (order.factura !== 'sin_factura' && order.CadFact) {
                button.classList.remove('hidden', 'disabled');
                facturaStatus.classList.add('available');
                facturaStatus.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" fill="none" stroke="#28a745" stroke-width="2"/>
                        <path fill="none" stroke="#28a745" stroke-width="2" stroke-linecap="round" d="M7.5 12.5l3 3 6-6"/>
                    </svg>
                    Disponible
                `;

                // 2. Agregar evento click con el link de CadFact
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (order.CadFact) {
                        window.open(order.CadFact, '_blank'); // Abre en nueva pestaña
                    }
                });

            } else {
                button.style.visibility = 'hidden';
                facturaStatus.classList.add('not-available');
                facturaStatus.innerHTML = `Aun no esta lista`; // Tu SVG de no disponible
            }
        }
    });
}

function toggleGuiaVisibility(orders) {
    orders.forEach((order, index) => {
        // Seleccionar elementos del HTML
        const guiaCard = document.querySelectorAll('.document-card.guia')[index]; // Asume que hay un .document-card.guia por pedido
        const guideCodeElement = guiaCard.querySelector('.guide-code');
        const documentStatus = guiaCard.querySelector('.document-status');

        // Obtener datos del pedido
        const ligaPaq = order.LigaPaq || '';
        const numeroGuia = order.num_guia || '';

        // Validar si la guía es válida
        if (ligaPaq && ligaPaq !== 'CEDIS') {
            // Mostrar últimos 5 dígitos
            const ultimos5Digitos = ligaPaq.slice(-5);
            guideCodeElement.textContent = ultimos5Digitos;

            // Agregar evento click
            guideCodeElement.style.cursor = 'pointer';
            guideCodeElement.setAttribute('title', 'Click para ver la guía');
            guideCodeElement.dataset.fullUrl = ligaPaq; // Guardar URL completa

            guideCodeElement.addEventListener('click', () => {
                window.open(ligaPaq, '_blank'); // Abrir en nueva pestaña
            });

            // Actualizar estado
            documentStatus.innerHTML = `
                <svg ...> <!-- SVG de disponible --> </svg>
                ${new Date().toLocaleDateString('es-MX')} <!-- Fecha actual -->
            `;

        } else {
            // Mostrar alerta y bloquear interacción
            guideCodeElement.textContent = 'N/A';
            guideCodeElement.style.cursor = 'not-allowed';
            
            documentStatus.innerHTML = `
                <svg ...> <!-- SVG de no disponible --> </svg>
                Aun no esta lista 
            `;

            guideCodeElement.addEventListener('click', () => {
                alert('⚠️ La paquetería no está disponible para este pedido');
            });
        }
    });
}

    // Mostrar la alerta al cargar la página
    window.onload = function() {
        showAlert();
        // Configurar intervalo cada 2 minutos
        setInterval(showAlert, 120000); 
    };

    function showAlert() {
        document.getElementById('customAlert').style.display = 'block';
    }

    function closeAlert() {
        document.getElementById('customAlert').style.display = 'none';
    }

    // Cerrar al hacer click fuera del alert
    window.onclick = function(event) {
        const alert = document.getElementById('customAlert');
        if (event.target === alert) {
            closeAlert();
        }
    }



