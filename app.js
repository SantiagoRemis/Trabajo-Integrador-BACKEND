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
const products = require("./json/supermercado.json");

const app = express();
const port = process.env.PORT;

// Midleware
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
      maxAge: 1000000,
      httpOnly: true,
    },
  })
);

const users = [];

const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
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
  users.push({ username, password });
  res.render("login");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  // Buscamos si se encuentra en la BD
  const user = users.find(
    (user) => user.username === username && user.password === password
  );
  if (user) {
    req.session.user = user;
    const client = await connectToMongoDB();
    if (!client) {
      return res.status(500).send("Error al conectar con la Base de Datos");
    }
    try {
      const db = client.db("Mercaderia");
      const productos = await db.collection("productos").find().toArray();
      res.render("products", { products: productos });
    } catch (error) {
      res.status(500).send("Error al obtener la Mercadería");
    }
  } else {
    res.render("login");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.send("Usuario deslogueado");
});

app.get("/products", isAuthenticated, async (req, res) => {
  const client = await connectToMongoDB();
  if (!client) {
    return res.status(500).send("Error al conectar con la Base de Datos");
  }

  try {
    const db = client.db("Mercaderia");
    const productos = await db.collection("productos").find().toArray();
    res.render("products", { products: productos });
  } catch (error) {
    res.status(500).send("Error al obtener la Mercadería");
  } finally {
    await disconnectFromMongoDB(client);
  }
});

app.get("/products/:id", isAuthenticated, async (req, res) => {
  const client = await connectToMongoDB();
  if (!client) {
    return res.status(500).send("Error al conectar con la Base de Datos");
  }

  try {
    const productId = parseInt(req.params.id) || 1;
    const db = client.db("Mercaderia");
    const producto = await db
      .collection("productos")
      .findOne({ id: productId });
    if (producto) res.render("product", { product: producto });
    else res.status(404).send(`No se encontro el producto ${productId}`);
  } catch (error) {
    res.status(500).send("Error al obtener la Mercadería");
  } finally {
    disconnectFromMongoDB(client);
  }
});

app.get("/products/add", isAuthenticated, async (req, res) => {
  const client = await connectToMongoDB();
  if (!client) {
    return res.status(500).send("Error al conectar con la Base de Datos");
  }

  try {
    res.render("addProduct");
  } catch (error) {
    res.status(500).send("Error al añadir producto a la mercadería");
  } finally {
    disconnectFromMongoDB(client);
  }
});

app.get("/products/edit/:id", isAuthenticated, async (req, res) => {
  const client = await connectToMongoDB();
  if (!client) {
    return res.status(500).send("Error al conectar con la Base de Datos");
  }

  try {
    const productId = parseInt(req.params.id);
    const db = client.db("Mercaderia");
    const product = await db.collection("productos").findOne({ id: productId });

    if (product) {
      res.render("editProduct", { product: product });
    } else {
      res.status(404).send(`No se encontró el producto con id ${productId}`);
    }
  } catch (error) {
    res.status(500).send("Error al editar el producto de la Mercadería");
  } finally {
    disconnectFromMongoDB(client);
  }
});

app.post("/products/add", isAuthenticated, async (req, res) => {
  const { codigo, nombre, precio, categoria } = req.body;

  const client = await connectToMongoDB();
  if (!client) {
    return res.status(500).send("Error al conectar con la Base de Datos");
  }

  try {
    const db = client.db("Mercaderia");
    const newProduct = {
      id: products.length + 30,
      codigo,
      nombre,
      precio,
      categoria,
    };
    await db.collection("productos").insertOne(newProduct);

    res.redirect("/products");
  } catch (error) {
    res.status(500).send("Error al obtener la Mercadería");
  } finally {
    disconnectFromMongoDB(client);
  }
});

app.patch("/products/:id", isAuthenticated, async (req, res) => {
  const productId = parseInt(req.params.id);
  const { codigo, nombre, precio, categoria } = req.body;

  const client = await connectToMongoDB();
  if (!client) {
    return res.status(500).send("Error al conectar con la Base de Datos");
  }

  try {
    const db = client.db("Mercaderia");
    const result = await db.collection("productos").updateOne(
      { id: productId },
      {
        $set: {
          codigo,
          nombre,
          precio,
          categoria,
        },
      }
    );

    if (result.matchedCount === 1) {
      const products = await db.collection("productos").find().toArray(); // Obtener la lista actualizada de productos
      res.render("products", { products });
    } else {
      res.status(404).send(`No se encontró el producto con id ${productId}`);
    }
  } catch (error) {
    res.status(500).send("Error al obtener la Mercadería");
  } finally {
    disconnectFromMongoDB(client);
  }
});

app.delete("/products/:id", isAuthenticated, async (req, res) => {
  const productId = parseInt(req.params.id);

  const client = await connectToMongoDB();
  if (!client) {
    return res.status(500).send("Error al conectar con la Base de Datos");
  }

  try {
    const db = client.db("Mercaderia");
    const result = await db
      .collection("productos")
      .deleteOne({ id: productId });

    if (result.deletedCount === 1) {
      const products = await db.collection("productos").find().toArray(); // Obtener la lista actualizada de productos
      res.render("products", { products });
    } else {
      res.status(404).send(`No se encontró el producto con id ${productId}`);
    }
  } catch (error) {
    res.status(500).send("Error al eliminar el producto de la mercadería");
  } finally {
    disconnectFromMongoDB(client);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port http://localhost:${port}`);
});
