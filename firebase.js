// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBTkuXoSn4NpORgbFLltl8qvXD5D00lM1s",
  authDomain: "koristagarage-ab9fb.firebaseapp.com",
  projectId: "koristagarage-ab9fb",
  storageBucket: "koristagarage-ab9fb.firebasestorage.app",
  messagingSenderId: "580178615656",
  appId: "1:580178615656:web:f3340c896afff18e624add",
  measurementId: "G-TZ92WETRX6"
};

// Init
firebase.initializeApp(firebaseConfig);

// 🔑 GLOBAL YAP
window.auth = firebase.auth();
window.db = firebase.firestore();
