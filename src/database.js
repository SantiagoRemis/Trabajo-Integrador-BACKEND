// process.loadEnvFile();

const { MongoClient } = require("mongodb");

const URI = process.env.MONGODB_URI;
const client = new MongoClient(URI);

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Conexion exitosa con la Base de Datos ");
    return client;
  } catch (error) {
    console.error(error + "Error al conectar con la Base de Datos");
    return null;
  }
}

async function disconnectFromMongoDB() {
  try {
    await client.close();
    console.log("Desconexión existosa con la Base de Datos");
  } catch (error) {
    console.error(error + "Error al desconectar la Base de Datos");
  }
}

module.exports = { connectToMongoDB, disconnectFromMongoDB };
