import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, push, remove, get, child } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDGLHkYoMtOD1OOWV1iMu7xA_78TVSa6yk",
    authDomain: "crm-homestech.firebaseapp.com",
    databaseURL: "https://crm-homestech-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "crm-homestech",
    storageBucket: "crm-homestech.firebasestorage.app",
    messagingSenderId: "1088374389972",
    appId: "1:1088374389972:web:5d2865a2807f89c1110f41"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, set, push, remove, get, child };