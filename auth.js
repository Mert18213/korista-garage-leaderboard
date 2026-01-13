const ADMIN_EMAIL = "mert18213@gmail.com";

// TRACK USER AUTHENTICATION STATE
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

            // 🔄 UPDATE LAST LOGIN TIMESTAMP
            await userRef.update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // 👑 ADMIN ACCESS CONTROL (Requires specific email and existing record)
        const isAdmin = user.email === ADMIN_EMAIL && userSnapshot.exists;
        
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


// REGISTER NEW USER (Initial Reward: 500 Points)
function register() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const username = document.getElementById("username").value;

    if (!email || !password || !username) {
        alert("Please fill in all fields.");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then((cred) => {
            // Create user document in Firestore
            return db.collection("users").doc(cred.user.uid).set({
                username,
                points: 500,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        })
        .then(() => {
            alert("Registration successful! 500 points have been added to your account.");
        })
        .catch((err) => alert(err.message));
}


// LOGIN USER
function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Please enter your email and password.");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .catch((err) => alert(err.message));
}


// LOGOUT USER
function logout() {
    auth.signOut();
}


// NAVIGATE TO BETTING PAGE (With Auth Check)
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
