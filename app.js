require("dotenv").config();
const express = require("express");
const {
  connectToMongoDB,
  disconnectFromMongoDB,
} = require("./src/database.js");
const session = require("express-session");
const methodOverride = require("method-override");
const morgan = require("morgan");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.PORT;

app.set("view engine", "ejs");
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      maxAge: 60000,
      httpOnly: true,
    },
  })
);

const users = [];

const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    console.error("No hay usuario autenticado");
    return res.render("login");
  }
  next();
};

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  const { username, password } = req.body;

  console.log(req.body);
  users.push({ username, password });
  res.render("login");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = users.find(
    (user) => user.username === username && user.password === password
  );
  if (user) {
    req.session.user = user;
    const cliente = await connectToMongoDB();
    if (!cliente) {
      return res.status(500).send("Error al conectar con la BD");
    }
    try {
      const db = cliente.db("Mercaderia");
      const productos = await db.collection("productos").find().toArray();
      res.render("products", { products: productos });
    } catch (error) {
      res.status(500).send("Error al obtener la mercaderia de la BD");
    }
  } else {
    res.render("login");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.send("Usuario desconectado");
});

app.get("/products", isAuthenticated, async (req, res) => {
  const cliente = await connectToMongoDB();
  if (!cliente) {
    return res.status(500).send("Error al conectar con la BD");
  }
  try {
    const db = cliente.db("Mercaderia");
    const productos = await db.collection("productos").find().toArray();
    res.render("products", { products: productos });
  } catch (error) {
    res.status(500).send("Error al obtener la mercaderia de la BD");
  } finally {
    await disconnectFromMongoDB(cliente);
  }
});

app.get("/products/:id", isAuthenticated, async (req, res) => {
  const cliente = await connectToMongoDB();
  if (!cliente) {
    return res.status(500).send("Error al conectar con la BD");
  }
  try {
    const productId = parseInt(req.params.id);
    const db = cliente.db("Mercaderia");
    const producto = await db
      .collection("productos")
      .findOne({ id: productId });
    if (producto) res.render("product", { product: producto });
    else res.status(404).send(`Producto inexistente ${productId}`);
  } catch (error) {
    res.status(500).send("Error al obtener la mercaderia de la BD");
  } finally {
    disconnectFromMongoDB(cliente);
  }
});

app.get("/product/filterProducto", isAuthenticated, async (req, res) => {
  const cliente = await connectToMongoDB();
  if (!cliente) {
    return res.status(500).send("Error al conectar con la BD");
  }
  try {
    const db = cliente.db("Mercaderia");

    const productId = parseInt(req.query.productNombre);
    const productNombre = req.query.productNombre;

    let query = {};

    if (!isNaN(productId)) {
      query = { id: productId };
    } else if (productNombre) {
      query = { nombre: productNombre };
    } else {
      return res
        .status(400)
        .send("Es necesario proporcionar Nombre o Id de mercaderia");
    }

    const producto = await db.collection("productos").findOne(query);

    if (producto) {
      res.render("product", { product: producto });
    } else {
      res
        .status(404)
        .send(
          `No se encontró el producto con ${
            productId ? `ID ${productId}` : `nombre ${productNombre}`
          }`
        );
    }
  } catch (error) {
    console.error("Error al obtener la mercaderia de la BD:", error);
    res.status(500).send("Error al obtener la mercaderia de la BD");
  } finally {
    disconnectFromMongoDB(cliente);
  }
});

app.get("/product/add", isAuthenticated, (req, res) => {
  return res.render("addProduct");
});

app.get("/products/add", isAuthenticated, async (req, res) => {
  const cliente = await connectToMongoDB();
  if (!cliente) {
    return res.status(500).send("Error al conectar con la BD");
  }
  try {
    res.render("addProduct");
  } catch (error) {
    res.status(500).send("Carga incompleta (addProduct)");
  } finally {
    disconnectFromMongoDB(cliente);
  }
});

app.get("/products/edit/:id", isAuthenticated, async (req, res) => {
  const cliente = await connectToMongoDB();
  if (!cliente) {
    return res.status(500).send("Error al conectar con la BD");
  }
  try {
    const productId = parseInt(req.params.id);
    console.log(req.params);
    const db = cliente.db("Mercaderia");
    const product = await db.collection("productos").findOne({ id: productId });

    if (product) {
      res.render("editProduct", { product: product });
    } else {
      res.status(404).send(`No se identificó el producto con id:${productId}`);
    }
  } catch (error) {
    res.status(500).send("Error al obtener la mercaderia de la BD");
  } finally {
    disconnectFromMongoDB(cliente);
  }
});

app.post("/products/add", isAuthenticated, async (req, res) => {
  const { codigo, nombre, precio, categoria } = req.body;
  console.log(req.body);

  const cliente = await connectToMongoDB();
  if (!cliente) {
    return res.status(500).send("Error al conectar con la BD");
  }
  try {
    const db = cliente.db("Mercaderia");
    const totalProducts = await db.collection("productos").countDocuments();
    const totalId = totalProducts + 1;
    const newProduct = {
      id: totalId,
      codigo: Number(codigo),
      nombre: nombre,
      precio: Number(precio),
      categoria: categoria,
    };

    const result = await db.collection("productos").insertOne(newProduct);
    console.log(`Producto agregado con id: ${result.insertedId}`);
    res.redirect("/products");
  } catch (error) {
    console.error("Error en /products/add:", error);
    res
      .status(500)
      .send("Error al agregar el nuevo producto dentro de la colección");
  } finally {
    disconnectFromMongoDB(cliente);
  }
});

app.patch("/products/:id", isAuthenticated, async (req, res) => {
  const productId = parseInt(req.params.id);
  const { codigo, nombre, precio, categoria } = req.body;

  const cliente = await connectToMongoDB();
  if (!cliente) {
    return res.status(500).send("Error al conectar con la BD");
  }
  try {
    const db = cliente.db("Mercaderia");
    const result = await db.collection("productos").updateOne(
      { id: productId },
      {
        $set: {
          codigo: parseInt(codigo),
          nombre,
          precio: parseFloat(precio),
          categoria,
        },
      }
    );

    if (result.matchedCount === 1) {
      const products = await db.collection("productos").find().toArray();
      res.render("products", { products });
    } else {
      res.status(404).send(`No se identificó el producto con id: ${productId}`);
    }
  } catch (error) {
    res
      .status(500)
      .send("Fallo en la actualización del producto en la colección");
  } finally {
    disconnectFromMongoDB(cliente);
  }
});

app.delete("/products/:id", isAuthenticated, async (req, res) => {
  const productId = parseInt(req.params.id);
  const cliente = await connectToMongoDB();
  if (!cliente) {
    return res.status(500).send("Error al conectar con la BD");
  }
  try {
    const db = cliente.db("Mercaderia");
    const result = await db
      .collection("productos")
      .deleteOne({ id: productId });

    if (result.deletedCount === 1) {
      const products = await db.collection("productos").find().toArray();
      res.render("products", { products });
    } else {
      res.status(404).send(`No se encontró el producto con id ${productId}`);
    }
  } catch (error) {
    res.status(500).send("Error al eliminar el producto de la colección");
  } finally {
    disconnectFromMongoDB(cliente);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`);
});
