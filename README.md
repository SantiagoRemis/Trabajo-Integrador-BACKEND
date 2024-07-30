# API de Productos - Trabajo Integrador Backend

Este proyecto presenta una API basada en Node.js y MongoDB la cual permite realizar operaciones CRUD (Crear, Leer, Actualizar, Eliminar) sobre productos en una base de datos.

## Requisitos

Asegúrate de tener instalado:

- Node.js
- NPM
- MongoDB

## Instalación

1. Clonar el repositorio:
   git clone <URL_DEL_REPOSITORIO>

2. Instalar dependencias:
   npm install

3. Crear una base de datos en MongoDB.

4. Modificar el archivo `.env` con tu URI de conexión a MongoDB.

## Ejecución

- Para iniciar el proyecto, ejecuta:
  npm start

## Endpoints

## GET /products

- Lista todos los productos en la base de datos

## GET /products/:id

- Muestra los detalles de un producto específico por su ID

## GET /product/filterProducto

- Filtra productos por ID o Nombre

## GET /products/edit/:id

- Renderiza la vista para editar un producto existente

## POST /products/add

- Agrega un nuevo producto a la base de datos

## DELETE /products/:id

- Elimina un producto específico por su ID
