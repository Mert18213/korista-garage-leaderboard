// KULLANICI GİRİŞ DURUMUNU TAKİP ET
auth.onAuthStateChanged(async user => {
    const authBox = document.getElementById("authBox");
    const userBar = document.getElementById("userBar");

    if (user) {
        if (authBox) authBox.style.display = "none";
        if (userBar) userBar.style.display = "flex";

        const snap = await db.collection("users").doc(user.uid).get();
        if (snap.exists) {
            document.getElementById("userInfo").innerText =
                snap.data().username + " | " + snap.data().points + " Puan";
        }
    } else {
        if (authBox) authBox.style.display = "block";
        if (userBar) userBar.style.display = "none";
    }
});

// KAYIT OL (500 PUAN)
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

// ÇIKIŞ YAP
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

    // GİRİŞ VARSA
    window.location.href = "bahis.html";
}
