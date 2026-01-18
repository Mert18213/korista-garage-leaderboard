const ADMIN_EMAIL = "mert18213@gmail.com";

// 🔄 TRACK USER AUTHENTICATION STATE
auth.onAuthStateChanged(async (user) => {
    const authBox = document.getElementById("authBox");
    const userBar = document.getElementById("userBar");
    const adminBtn = document.getElementById("adminUpdateBtn");

    if (user) {
        // UI Adjustments for logged-in user
        if (authBox) authBox.style.display = "none";
        if (userBar) userBar.style.display = "flex";

        const userRef = db.collection("users").doc(user.uid);
        const userSnapshot = await userRef.get();

        if (userSnapshot.exists) {
            const userData = userSnapshot.data();

            document.getElementById("userInfo").innerText =
                `${userData.username} | ${userData.points} Points`;

            // Update last login timestamp
            await userRef.update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // 👑 ADMIN ACCESS CONTROL
        const isAdmin = user.email === ADMIN_EMAIL;
        if (adminBtn) {
            adminBtn.style.display = isAdmin ? "inline-block" : "none";
        }

    } else {
        // UI Adjustments for logged-out state
        if (authBox) authBox.style.display = "block";
        if (userBar) userBar.style.display = "none";
        if (adminBtn) adminBtn.style.display = "none";
    }
});

// 📝 REGISTER NEW USER
// Parameters are passed from handleAuth() in index.html
function register(username, email, password) {
    auth.createUserWithEmailAndPassword(email, password)
        .then((cred) => {
            // Create user document in Firestore with 500 starting points
            return db.collection("users").doc(cred.user.uid).set({
                username: username,
                points: 500,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            alert("Registration successful! 500 points have been added to your account.");
        })
        .catch((err) => {
            console.error("Registration Error:", err);
            alert(err.message);
        });
}

// 🔑 LOGIN USER
// Parameters are passed from handleAuth() in index.html
function login(email, password) {
    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            console.log("Login successful");
        })
        .catch((err) => {
            console.error("Login Error:", err);
            alert(err.message);
        });
}

// 🚪 LOGOUT USER
function logout() {
    auth.signOut().then(() => {
        window.location.reload(); // Refresh to update UI
    });
}

// 🎰 NAVIGATE TO BETTING PAGE (With Auth Check)
function goToBet() {
    const user = auth.currentUser;

    if (!user) {
        alert("You must be logged in to place a bet.");
        const authBox = document.getElementById("authBox");
        if (authBox) {
            authBox.scrollIntoView({ behavior: "smooth" });
        }
        return;
    }

    // Redirect to the betting page
    window.location.href = "bet.html"; 
}
