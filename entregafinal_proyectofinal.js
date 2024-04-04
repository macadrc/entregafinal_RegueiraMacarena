const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');

mongoose.connect('mongodb://localhost:27017/your_database', { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  documents: [{ name: String, reference: String }],
  last_connection: Date,
  premium: { type: Boolean, default: false } 
});

const User = mongoose.model('User', userSchema);

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(bodyParser.json());
app.use(session({ secret: 'tu_secreto', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email });

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return done(null, false, { message: 'Usuario o contraseña incorrectos' });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'tucorreo@gmail.com',
    pass: 'tucontraseña'
  }
});


app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'name email role');
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    user.last_connection = new Date();
    await user.save();

    const token = jwt.sign({ userId: user._id }, 'your_secret_key');
    res.status(200).json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


app.delete('/api/users/inactive', async (req, res) => {
  try {
    const inactiveUsers = await User.find({ last_connection: { $lt: new Date(Date.now() - 30 * 60 * 1000) } });
    await User.deleteMany({ last_connection: { $lt: new Date(Date.now() - 30 * 60 * 1000) } });
    inactiveUsers.forEach(async (user) => {
      const mailOptions = {
        from: 'tucorreo@gmail.com',
        to: user.email,
        subject: 'Cuenta eliminada por inactividad',
        text: 'Tu cuenta ha sido eliminada por inactividad en nuestro sitio web.',
      };
      await transporter.sendMail(mailOptions);
    });
    res.status(200).json({ message: 'Usuarios inactivos eliminados exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


app.put('/api/users/:userId/role', async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    await User.findByIdAndUpdate(userId, { role });
    res.status(200).json({ message: 'Rol de usuario actualizado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


app.delete('/api/products/:productId', async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    await Product.findByIdAndDelete(req.params.productId);
    if (product.owner.premium) {
      const mailOptions = {
        from: 'tucorreo@gmail.com',
        to: product.owner.email,
        subject: 'Producto eliminado',
        text: `Tu producto ${product.name} ha sido eliminado de la plataforma.`,
      };
      await transporter.sendMail(mailOptions);
    }
    res.status(200).json({ message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

const port = 8080;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
