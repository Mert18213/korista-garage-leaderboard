let currentRaceId = null;

// ON PAGE LOAD
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        alert("You cannot place a bet without logging in.");
        window.location.href = "index.html";
        return;
    }
const buyBtn = document.getElementById("buyBtn");
const purchaseInfo = document.getElementById("purchaseInfo");

if (buyBtn && purchaseInfo) {
    const points = snap.data().points;

    if (points >= 1500) {
        buyBtn.disabled = false;
        buyBtn.style.opacity = "1";
        purchaseInfo.innerHTML = "✅ You can send a message for <b>1500 points</b>.";
    } else {
        buyBtn.disabled = true;
        buyBtn.style.opacity = "0.5";
        purchaseInfo.innerHTML =
            "🔒 You need <b>1500 points</b> to send a message.";
    }
}
    // USER INFO
    const userSnapshot = await db.collection("users").doc(user.uid).get();
    if (userSnapshot.exists) {
        const userData = userSnapshot.data();
        document.getElementById("userInfo").innerText =
            `${userData.username} | ${userData.points} Points`;
    }

    await loadActiveRace();
    await loadMyBets();
});


// 🔍 FIND ACTIVE RACE
async function loadActiveRace() {
    const racesSnapshot = await db
        .collection("races")
        .where("status", "==", "open")
        .limit(1)
        .get();

    if (racesSnapshot.empty) {
        alert("No active races available at the moment.");
        return;
    }

    currentRaceId = racesSnapshot.docs[0].id;
    console.log("ACTIVE RACE:", currentRaceId);

    const betButton = document.getElementById("betBtn");
    if (betButton) betButton.disabled = false;
}


// NAVIGATE BACK
function goBack() {
    window.location.href = "index.html";
}


// 🎰 PLACE A BET
async function placeBet() {
    const user = auth.currentUser;
    if (!user || !currentRaceId) {
        alert("No active race found.");
        return;
    }

    const car = document.getElementById("car").value;
    const stake = Number(document.getElementById("stake").value);

    if (!car || stake <= 0) {
        alert("Please select a car and enter points.");
        return;
    }

    const userRef = db.collection("users").doc(user.uid);
    const betRaceRef = db.collection("bets").doc(currentRaceId);
    const betRef = betRaceRef.collection("players").doc(user.uid);

    const betRaceSnapshot = await betRaceRef.get();
    if (!betRaceSnapshot.exists || betRaceSnapshot.data().status !== "open") {
        alert("Betting is currently closed for this race.");
        return;
    }

    const userSnapshot = await userRef.get();
    if (userSnapshot.data().points < stake) {
        alert("Insufficient points.");
        return;
    }

    const existingBet = await betRef.get();
    if (existingBet.exists) {
        alert("You have already placed a bet on this race.");
        return;
    }

    // DEDUCT POINTS
    await userRef.update({
        points: firebase.firestore.FieldValue.increment(-stake)
    });

    // ✅ SAVE BET (DÜZELTİLDİ: uid alanı eklendi)
    await betRef.set({
        uid: user.uid, // Sorgu için bu alan kritik!
        car: car,
        stake: stake,
        paid: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Bet placed successfully!");
    loadMyBets();
}


// 📜 BET HISTORY (DÜZELTİLDİ: uid üzerinden sorgu yapılıyor)
async function loadMyBets() {
    const user = auth.currentUser;
    if (!user) return;

    const betsDiv = document.getElementById("myBets");
    if (!betsDiv) return;

    betsDiv.innerHTML = "Loading...";

    try {
        // ✅ Sorgu döküman ID'si yerine 'uid' alanı ile güncellendi
        const betsSnapshot = await db.collectionGroup("players")
            .where("uid", "==", user.uid)
            .get();

        if (betsSnapshot.empty) {
            betsDiv.innerHTML = "You haven't placed any bets yet.";
            return;
        }

        betsDiv.innerHTML = ""; 
        
        betsSnapshot.forEach((doc) => {
            const bet = doc.data();
            const raceId = doc.ref.parent.parent.id;

            betsDiv.innerHTML += `
                <div class="bet-item" style="border-bottom: 1px solid #444; padding: 10px; margin-bottom: 5px;">
                    <span>
                        <b style="color: #ffcc00;">Race: ${raceId}</b><br>
                        🚗 ${formatCar(bet.car)}
                    </span>
                    <span style="float: right; text-align: right;">
                        <b>${bet.stake} Points</b><br>
                        ${bet.paid ? "✅ Paid" : "⏳ Pending"}
                    </span>
                    <div style="clear: both;"></div>
                </div>
            `;
        });

    } catch (error) {
        console.error("Error loading history:", error);
        betsDiv.innerHTML = "Could not load history.";
    }
}
// 🚪 LOGOUT FUNCTION
async function logout() {
    try {
        await auth.signOut(); // Firebase oturumunu kapatır
        alert("Logged out successfully!");
        window.location.href = "index.html"; // Giriş sayfasına yönlendirir
    } catch (error) {
        console.error("Logout Error:", error);
        alert("An error occurred while logging out.");
    }
}

// 🚗 FORMAT CAR NAME
function formatCar(carId) {
    if (!carId) return "Unknown Car";
    return carId
        .replaceAll("_", " ")
        .replace("P80C", "P80/C");
}
async function makePurchase() {
    const user = auth.currentUser;
    if (!user) return;

    const message = document.getElementById("purchaseName").value.trim();
    if (!message) {
        alert("Please write a message.");
        return;
    }

    const COST = 1500;

    const userRef = db.collection("users").doc(user.uid);
    const userSnap = await userRef.get();

    const points = userSnap.data().points;

    if (points < COST) {
        alert("You need at least 1500 points to send a message.");
        return;
    }

    // PUAN DÜŞ
    await userRef.update({
        points: firebase.firestore.FieldValue.increment(-COST)
    });

    // MESAJ KAYDET
    await db.collection("purchases").add({
        userId: user.uid,
        username: userSnap.data().username,
        message: message,
        cost: COST,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById("purchaseName").value = "";

    alert("Message sent successfully!");
}


