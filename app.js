
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
const winston = require('winston');

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


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = '';
    if (file.fieldname === 'profileImage') {
      uploadPath = './uploads/profiles';
    } else if (file.fieldname === 'productImage') {
      uploadPath = './uploads/products';
    } else {
      uploadPath = './uploads/documents';
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage: storage });


app.post('/api/users/:uid/documents', upload.array('documents'), async (req, res) => {
  try {
    const user = await User.findById(req.params.uid);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    req.files.forEach(file => {
      user.documents.push({ name: file.originalname, reference: file.path });
    });

    await user.save();
    res.status(200).json({ message: 'Documentos subidos exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


app.put('/api/users/premium/:uid', async (req, res) => {
  try {
    const user = await User.findById(req.params.uid);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

  
    const requiredDocuments = ['Identificación', 'Comprobante de domicilio', 'Comprobante de estado de cuenta'];
    const uploadedDocuments = user.documents.map(doc => doc.name);
    const isDocumentsUploaded = requiredDocuments.every(doc => uploadedDocuments.includes(doc));
    
    if (!isDocumentsUploaded) {
      return res.status(400).json({ message: 'El usuario no ha terminado de procesar su documentación' });
    }

 
    user.premium = true;
    await user.save();

    res.status(200).json({ message: 'Usuario actualizado a premium exitosamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/forgot_password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }



    res.status(200).json({ message: 'Correo electrónico enviado con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/reset_password', async (req, res) => {
  try {
    const { email, newPassword, token } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (await bcrypt.compare(newPassword, user.password)) {
      return res.status(400).json({ message: 'La nueva contraseña no puede ser igual a la actual' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: 'Contraseña restablecida exitosamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

const port = 8080;

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
