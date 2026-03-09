import { initializeApp } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc }
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCHZ1s5wdIgHkv7xAE63GVfl8EteqLKN9Y",
  authDomain: "finara-c6f7d.firebaseapp.com",
  projectId: "finara-c6f7d",
  storageBucket: "finara-c6f7d.appspot.com",
  messagingSenderId: "678225067669",
  appId: "1:678225067669:web:cae98d400d6085c3d8259c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Usaremos "usuarios" en plural para todo
const coleccion = collection(db, "usuarios");

// Cambiado a guardar() para que coincida con el onclick del HTML
window.guardar = async () => {
    // Usamos los IDs que pusimos en el Modal del HTML
    const nombreValor = document.getElementById("nombreUsuario").value;
    const edadValor = document.getElementById("edadUsuario").value;

    if (nombreValor === "" || edadValor === "") {
        alert("Llena los campos, Kevin");
        return;
    }

    console.log("Intentando guardar:", nombreValor, edadValor);

    await addDoc(coleccion, {
        nombre: nombreValor,
        edad: edadValor
    });

    // Limpiar inputs después de guardar
    document.getElementById("nombreUsuario").value = "";
    document.getElementById("edadUsuario").value = "";

    // Cerrar el modal (opcional pero recomendado)
    const modalElt = document.getElementById('modalUsuario');
    const modal = bootstrap.Modal.getInstance(modalElt);
    if (modal) modal.hide();

    alert("¡Se guardó en Finara!");
    listar();
}

async function listar() {
    const lista = document.getElementById("lista");
    if (!lista) return;

    lista.innerHTML = "";
    const datos = await getDocs(coleccion);

    datos.forEach(docu => {
        const item = docu.data();
        lista.innerHTML += `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            ${item.nombre} - ${item.edad} años
            <button class="btn btn-danger btn-sm" onclick="eliminar('${docu.id}')">Eliminar</button>
        </li>
        `;
    });
}

window.eliminar = async (id) => {
    if (confirm("¿Seguro que quieres borrarlo?")) {
        // Asegúrate de que aquí diga "usuarios" igual que arriba
        await deleteDoc(doc(db, "usuarios", id));
        listar();
    }
}

// Carga inicial
listar();