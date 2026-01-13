// Kullanıcı giriş durumunu takip et
auth.onAuthStateChanged(async user => {
    const authBox = document.getElementById("authBox");
    const userBar = document.getElementById("userBar");

    if (user) {
        authBox.style.display = "none";
        userBar.style.display = "flex";

        const snap = await db.collection("users").doc(user.uid).get();
        document.getElementById("userInfo").innerText =
            snap.data().username + " | " + snap.data().points + " Puan";
    } else {
        authBox.style.display = "block";
        userBar.style.display = "none";
    }
});

function logout() {
    auth.signOut();
}


// KAYIT OL (500 PUANLA BAŞLAT)
function register() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const username = document.getElementById("username").value;

    if (!email || !password || !username) {
        alert("Tüm alanları doldur");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(cred => {
            return db.collection("users").doc(cred.user.uid).set({
                username: username,
                points: 500,
                lastLogin: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            alert("Kayıt başarılı! 500 puan yüklendi.");
        })
        .catch(err => alert(err.message));
}

// GİRİŞ YAP
function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Email ve şifre gir");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .catch(err => alert(err.message));
}

// ÇIKIŞ YAP (ileride kullanacağız)
function logout() {
    auth.signOut();
}

// İDDAA SAYFASINA GİT (LOGIN KONTROLLÜ)
function goToBet() {
    const user = auth.currentUser;

    if (!user) {
        alert("İddaa oynamak için giriş yapmalısın");
        document.getElementById("authBox")
            .scrollIntoView({ behavior: "smooth" });
        return;
    }

    alert("Bahis ekranı yakında açılacak 👀");
}


    window.location.href = "bahis.html";
}
