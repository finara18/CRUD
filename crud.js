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

const coleccion = collection(db, "Usuario");


window.guardar = async () => {

 const nombreValor = document.getElementById("nombre").value;
 const edadValor = document.getElementById("edad").value;

 console.log(nombreValor, edadValor);

 await addDoc(coleccion,{
  nombre: nombreValor,
  edad: edadValor
 });

 console.log("Guardado en Firebase");

 alert("Se guardó");

 listar();
}

async function listar(){

 const lista = document.getElementById("lista");

 lista.innerHTML="";

 const datos = await getDocs(coleccion);

 datos.forEach(docu => {

  lista.innerHTML += `
  <li>
  ${docu.data().nombre} - ${docu.data().edad}
  <button onclick="eliminar('${docu.id}')">Eliminar</button>
  </li>
  `;
 });
}


window.eliminar = async(id)=>{

 await deleteDoc(doc(db,"usuarios",id));

 listar();
}

listar();