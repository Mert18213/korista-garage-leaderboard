const ADMIN_EMAIL = "mert18213@gmail.com";

// KULLANICI GİRİŞ DURUMUNU TAKİP ET
auth.onAuthStateChanged(async user => {
    const authBox = document.getElementById("authBox");
    const userBar = document.getElementById("userBar");
    const adminBtn = document.getElementById("adminUpdateBtn");

    if (user) {
        if (authBox) authBox.style.display = "none";
        if (userBar) userBar.style.display = "flex";

        const userRef = db.collection("users").doc(user.uid);
        const snap = await userRef.get();

        if (snap.exists) {
            const data = snap.data();

            document.getElementById("userInfo").innerText =
                data.username + " | " + data.points + " Puan";

            // 🔄 SON GİRİŞİ GÜNCELLE
            await userRef.update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // 👑 ADMIN KONTROLÜ (email + kayıtlı user şartı)
        if (
            adminBtn &&
            user.email === ADMIN_EMAIL &&
            snap.exists
        ) {
            adminBtn.style.display = "inline-block";
        } else if (adminBtn) {
            adminBtn.style.display = "none";
        }

    } else {
        if (authBox) authBox.style.display = "block";
        if (userBar) userBar.style.display = "none";
        if (adminBtn) adminBtn.style.display = "none";
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
                username,
                points: 500,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
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

    window.location.href = "bahis.html";
}
