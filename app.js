// Importar Firebase desde CDN (VERSIÓN CORRECTA PARA HTML)
import { initializeApp } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getAnalytics } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCHZ1s5wdIgHkv7xAE63GVfl8EteqLKN9Y",
  authDomain: "finara-c6f7d.firebaseapp.com",
  projectId: "finara-c6f7d",
  storageBucket: "finara-c6f7d.firebasestorage.app",
  messagingSenderId: "678225067669",
  appId: "1:678225067669:web:cae98d400d6085c3d8259c",
  measurementId: "G-D3DFW3N91P"
};


// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);


// REGISTRAR
window.registrar = async () => {

  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPass").value;

  try {

    await createUserWithEmailAndPassword(auth, email, password);

    alert("Usuario registrado");

  } catch(error) {

    alert(error.message);

  }

}


// LOGIN
window.login = async () => {

  const email = document.getElementById("logEmail").value;
  const password = document.getElementById("logPass").value;

  try {

    await signInWithEmailAndPassword(auth, email, password);

    alert("Login correcto");

    window.location = "dashboard.html";

  } catch(error) {

    alert(error.message);

  }

}