const express = require('express');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');

// Configuración de la aplicación
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para JSON y datos de formulario
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de sesiones
app.use(session({
    secret: 'secreto_super_seguro',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Cambiar a true en producción con HTTPS
        maxAge: 3600000 // 1 hora
    }
}));

// Configuración de multer para subir archivos
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        // Usar el nombre original del archivo sin timestamp
        cb(null, file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function(req, file, cb) {
        if (!file.originalname.match(/\.(xlsx|xls)$/)) {
            return cb(new Error('Solo se permiten archivos Excel'), false);
        }
        cb(null, true);
    },
    limits: {
        fileSize: 1024 * 1024 * 5 // 5MB max
    }
});

// Middleware para verificar si el usuario está autenticado
const isAuthenticated = (req, res, next) => {
    if (req.session.isAuthenticated) {
        return next();
    }
    res.redirect('/');
};

// Middleware para sanitizar entradas
const sanitizeInput = (input) => {
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

// Rutas
// Página principal
app.get('/', (req, res) => {
    if (req.session.isAuthenticated) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Página de dashboard
app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Subir archivo Excel
app.post('/upload', upload.single('excel'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No se ha subido ningún archivo' });
        }
        
        // Guardar temporalmente el archivo recién subido
        const tmpFilePath = req.file.path;
        const uploadedFileName = req.file.originalname;
        
        // Eliminar todos los archivos existentes excepto el recién subido
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        if (fs.existsSync(uploadDir)) {
            const files = fs.readdirSync(uploadDir);
            for (const file of files) {
                const filePath = path.join(uploadDir, file);
                if (filePath !== tmpFilePath) {
                    try {
                        fs.unlinkSync(filePath);
                    } catch (err) {
                        console.log(`No se pudo eliminar el archivo ${file}: ${err.message}`);
                    }
                }
            }
            console.log('Archivos anteriores eliminados de la carpeta uploads');
        }

        // Leer el archivo Excel
        const workbook = xlsx.readFile(req.file.path);
        const sheet_name_list = workbook.SheetNames;
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);

        // Guardar ruta del archivo en la sesión
        req.session.excelPath = req.file.path;
        req.session.excelData = data;
        req.session.excelFilename = req.file.originalname;
        
        // Guardar el archivo para uso en login.js
        const excelFilePath = req.file.path;
        
        res.json({ 
            success: true,
            excelPath: excelFilePath,
            filename: req.file.originalname 
        });
    } catch (error) {
        console.error('Error al procesar el archivo:', error);
        res.status(500).json({ success: false, message: 'Error al procesar el archivo' });
    }
});

// Ruta para obtener información del archivo Excel
app.get('/api/excel-info', (req, res) => {
    if (req.session.excelPath && req.session.excelFilename) {
        res.json({
            success: true,
            excelPath: req.session.excelPath,
            filename: req.session.excelFilename
        });
    } else {
        res.status(404).json({
            success: false,
            message: 'No se ha subido ningún archivo Excel'
        });
    }
});

app.post('/auth/cliente', (req, res) => {
    const { username, password } = req.body;
    
    // Sanitizar entradas
    const sanitizedUsername = sanitizeInput(username);
    const sanitizedPassword = sanitizeInput(password);
    
    try {
        // Leer el archivo Excel desde la carpeta uploads
        const XLSX = require('xlsx');
        const path = require('path');
        const excelPath = path.join(__dirname, 'public/uploads', 'Seguimiento_Programa.xlsx');
        
        // Leer el libro de Excel
        const workbook = XLSX.readFile(excelPath);
        
        // Obtener la hoja 2 (CLIENTES)
        const sheet2Name = workbook.SheetNames[1];
        const sheet2 = workbook.Sheets[sheet2Name];
        const clientesData = XLSX.utils.sheet_to_json(sheet2);
        
        // Verificar que clientesData sea un array válido
        if (!Array.isArray(clientesData) || clientesData.length === 0) {
            console.error("Error: No se encontraron datos de clientes");
            return res.status(500).json({ 
                success: false, 
                message: 'Error en los datos de clientes' 
            });
        }
        
        // console.log("Datos de clientes cargados:", clientesData.length, "registros");
        
        // Buscar usuario en los datos de la hoja 2
        const user = clientesData.find(cliente => 
            cliente.CLIENTE && cliente.CLIENTE.toLowerCase() === sanitizedUsername.toLowerCase()
        );
        
        // Verificar si el usuario existe
        if (!user) {
            console.log("Usuario no encontrado:", sanitizedUsername);
            return res.status(401).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }
        
        // Validar rol primero - verificar si es "cliente"
        if (user.ROLL !== 'cliente') {
            console.log("Acceso denegado, rol incorrecto:", user.ROLL);
            return res.status(403).json({ 
                success: false, 
                message: 'Acceso denegado: El usuario no tiene rol de cliente' 
            });
        }
        
        // Si el rol es "cliente", entonces validar contraseña
        if (user.PASSWORD.toLowerCase() !== sanitizedPassword.toLowerCase()) {
            console.log("Contraseña incorrecta para usuario:", sanitizedUsername);
            return res.status(401).json({ 
                success: false, 
                message: 'Contraseña incorrecta' 
            });
        }
        
        // Si llegamos aquí, el usuario está autenticado correctamente
        // console.log("Autenticación exitosa para:", sanitizedUsername);
        
        // Obtener datos del pedido desde la hoja 1
        const sheet1Name = workbook.SheetNames[0];
        const sheet1 = workbook.Sheets[sheet1Name];
        const pedidosData = XLSX.utils.sheet_to_json(sheet1);
        
        // Buscar el pedido correspondiente al cliente
        // Asegurarse de que estamos buscando con el campo correcto
        const pedidosCliente = pedidosData.filter(pedido => 
            pedido.nombre_cliente && 
            pedido.nombre_cliente.toLowerCase() === sanitizedUsername.toLowerCase()
        );
        
        if (pedidosCliente.length === 0) {
            console.log("No se encontraron pedidos para el cliente:", sanitizedUsername);
            
            // Aun así autenticamos al usuario, pero sin información de pedidos
            req.session.isAuthenticated = true;
            req.session.userType = 'cliente';
            req.session.username = sanitizedUsername;
            req.session.orderInfo = null;
            
            return res.json({ 
                success: true, 
                message: 'Autenticación exitosa, pero no se encontraron pedidos' 
            });
        }
        
        // Establecer información de sesión
        req.session.isAuthenticated = true;
        req.session.userType = 'cliente';
        req.session.username = sanitizedUsername;
        req.session.orderInfo = pedidosCliente;
        
        // Tomamos el primer pedido del cliente (o podemos guardar todos)
        const pedidoCliente = Array.isArray(pedidosCliente) ? pedidosCliente : [pedidosCliente];
        
        // console.log('estos son los pedidos', pedidoCliente);
        return res.json({
            success: true,
            message: `Autenticación exitosa (${pedidosCliente.length} pedidos encontrados)`,
            orders: pedidoCliente  // <-- Enviamos todos los pedidos en la respuesta
        });
    
    } catch (error) {
        console.error('Error al procesar la autenticación:', error);
        res.status(500).json({
            success: false, 
            message: 'Error en el servidor al procesar la autenticación' 
        });
    }
});

app.post('/auth/admin', (req, res) => {
    const { username, password } = req.body;
    
    // Sanitizar entradas
    const sanitizedUsername = sanitizeInput(username);
    const sanitizedPassword = sanitizeInput(password);
    console.log('administrador', sanitizedUsername, sanitizedPassword);
    
    // Verificar si se ha subido un archivo Excel
    if (!req.session.excelPath || !req.session.excelData) {
        return res.status(400).json({
            success: false,
            message: 'Primero debe subir un archivo Excel'
        });
    }
    
    // Administradores autorizados (datos en duro)
    const authorizedAdmins = [
        { username: 'ivan muñoz', password: 'Alessia01' },
        { username: 'greta villegas', password: 'Alessia01' }
    ];
    
    // Verificar si las credenciales corresponden a un administrador autorizado
    const adminUser = authorizedAdmins.find(
        admin => admin.username === sanitizedUsername && admin.password === sanitizedPassword
    );
    
    if (adminUser) {
        req.session.isAuthenticated = true;
        req.session.userType = 'admin';
        req.session.username = sanitizedUsername;
        
        // Alertar que se actualizó la base de la app
        console.log(`Administrador ${sanitizedUsername} ha actualizado la base de la app`);
        
        return res.json({ 
            success: true, 
            message: 'Base de datos actualizada correctamente' 
        });
    } else {
        console.log('Credenciales incorrectas');
        return res.status(401).json({ 
            success: false, 
            message: 'Credenciales incorrectas' 
        });
    }
});

// Cerrar sesión
app.post('/logout', (req, res) => {
    // No eliminamos el archivo al cerrar sesión para mantenerlo disponible
    
    // Destruir la sesión
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
        }
        res.json({ success: true });
    });
});

// API para obtener información del usuario
app.get('/api/user-info', isAuthenticated, (req, res) => {
    res.json({
        success: true,
        user: {
            username: req.session.username,
            userType: req.session.userType
        }
    });
});

// API para obtener información del pedido
app.get('/api/order-info', isAuthenticated, (req, res) => {
    res.json({
        success: true,
        orders: req.session.orderInfo
    });
});

// API para descargar factura (simulado)
app.get('/api/download-factura', isAuthenticated, (req, res) => {
    // Ruta al archivo simulado de factura
    const facturaPath = path.join(__dirname, 'public', 'uploads', 'factura-ejemplo.pdf');
    
    // Si no existe, crear un archivo de texto simple como ejemplo
    if (!fs.existsSync(facturaPath)) {
        fs.writeFileSync(facturaPath, 'Contenido de ejemplo de factura');
    }
    
    res.download(facturaPath, 'factura.pdf', err => {
        if (err) {
            res.status(500).send('Error al descargar factura');
        }
    });
});

// API para ver guía (simulado)
app.get('/api/view-guia', isAuthenticated, (req, res) => {
    res.json({
        success: true,
        guia: 'TRACK123456789'
    });
});

// Manejar rutas no encontradas
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});