// Kullanıcı giriş durumunu takip et
auth.onAuthStateChanged(user => {
    const authBox = document.getElementById("authBox");

    if (user) {
        // Giriş varsa login kutusunu gizle
        if (authBox) authBox.style.display = "none";
    } else {
        // Giriş yoksa login kutusu görünsün
        if (authBox) authBox.style.display = "block";
    }
});

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

    window.location.href = "bahis.html";
}
