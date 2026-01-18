let currentRaceId = null;

// 🔄 ON PAGE LOAD
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    try {
        // 1. Listen to User Data (Updates UI in real-time)
        const userRef = db.collection("users").doc(user.uid);
        
        userRef.onSnapshot((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                const points = userData.points || 0;

                // Update top bar
                document.getElementById("userInfo").innerText = 
                    `${userData.username} | ${points} Points`;

                // Update Purchase Button Status
                updatePurchaseButton(points, userData.lastMessageSentAt);
            }
        });

        // 2. Load Active Race & History
        await loadActiveRace();
        await loadMyBets();

    } catch (error) {
        console.error("Initialization Error:", error);
    }
});

// 🔍 FIND ACTIVE RACE & ENABLE BUTTON
async function loadActiveRace() {
    try {
        const racesSnapshot = await db
            .collection("races")
            .where("status", "==", "open")
            .limit(1)
            .get();

        const betButton = document.getElementById("betBtn");

        if (racesSnapshot.empty) {
            if (betButton) {
                betButton.disabled = true;
                betButton.style.opacity = "0.5";
            }
            console.log("No active races found.");
            return;
        }

        currentRaceId = racesSnapshot.docs[0].id;
        
        // Enable button if race exists
        if (betButton) {
            betButton.disabled = false;
            betButton.style.opacity = "1";
        }
        console.log("Active Race Identified:", currentRaceId);
    } catch (error) {
        console.error("Race loading error:", error);
    }
}

// 🎰 PLACE A BET
async function placeBet() {
    const user = auth.currentUser;
    const car = document.getElementById("car").value;
    const stake = Number(document.getElementById("stake").value);

    if (!user || !currentRaceId) {
        alert("No active race found.");
        return;
    }

    if (!car || stake <= 0) {
        alert("Please select a car and enter a valid amount of points.");
        return;
    }

    const userRef = db.collection("users").doc(user.uid);
    const betRef = db.collection("bets").doc(currentRaceId).collection("players").doc(user.uid);

    try {
        const userSnap = await userRef.get();
        if (userSnap.data().points < stake) {
            alert("Insufficient points!");
            return;
        }

        const existingBet = await betRef.get();
        if (existingBet.exists) {
            alert("You have already placed a bet on this race.");
            return;
        }

        const batch = db.batch();
        batch.update(userRef, { points: firebase.firestore.FieldValue.increment(-stake) });
        batch.set(betRef, {
            uid: user.uid,
            car: car,
            stake: stake,
            paid: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();
        alert("Bet placed successfully!");
        // History updates automatically via loadMyBets or snapshot if you prefer
    } catch (error) {
        alert("Error: " + error.message);
    }
}

// 🛒 SEND MESSAGE (LIMITED TO 1 PER DAY)
async function makePurchase() {
    const user = auth.currentUser;
    const message = document.getElementById("purchaseName").value.trim();
    const COST = 1500;

    if (!user || !message) {
        alert("Please write a message.");
        return;
    }

    const userRef = db.collection("users").doc(user.uid);

    try {
        const userSnap = await userRef.get();
        const userData = userSnap.data();

        // Daily limit check
        if (userData.lastMessageSentAt) {
            const lastSent = userData.lastMessageSentAt.toDate();
            if (lastSent.toDateString() === new Date().toDateString()) {
                alert("You have already sent a message today. Daily limit reached!");
                return;
            }
        }

        if (userData.points < COST) {
            alert("Insufficient points.");
            return;
        }

        const batch = db.batch();
        batch.update(userRef, {
            points: firebase.firestore.FieldValue.increment(-COST),
            lastMessageSentAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const purchaseRef = db.collection("purchases").doc();
        batch.set(purchaseRef, {
            userId: user.uid,
            username: userData.username,
            message: message,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();
        document.getElementById("purchaseName").value = "";
        alert("Message sent successfully! (Daily limit reached)");
    } catch (error) {
        console.error("Purchase Error:", error);
        alert("An error occurred during the transaction.");
    }
}

// 📜 LOAD HISTORY
async function loadMyBets() {
    const user = auth.currentUser;
    const betsDiv = document.getElementById("myBets");
    if (!user || !betsDiv) return;

    try {
        const snap = await db.collectionGroup("players")
            .where("uid", "==", user.uid)
            .get();

        if (snap.empty) {
            betsDiv.innerHTML = "You haven't placed any bets yet.";
            return;
        }

        betsDiv.innerHTML = "";
        snap.forEach(doc => {
            const b = doc.data();
            const raceId = doc.ref.parent.parent.id;
            betsDiv.innerHTML += `
                <div class="bet-item" style="border-bottom: 1px solid #444; padding: 10px;">
                    <span style="float: left;">
                        <b style="color: #ffcc00;">Race: ${raceId}</b><br>
                        🚗 ${formatCar(b.car)}
                    </span>
                    <span style="float: right; text-align: right;">
                        <b>${b.stake} Points</b><br>
                        ${b.paid ? "✅ Paid" : "⏳ Pending"}
                    </span>
                    <div style="clear: both;"></div>
                </div>`;
        });
    } catch (e) {
        console.error("History Error:", e);
        betsDiv.innerHTML = "Error loading history.";
    }
}

// 🛠️ UTILITY FUNCTIONS
function updatePurchaseButton(points, lastSentTS) {
    const buyBtn = document.getElementById("buyBtn");
    const info = document.getElementById("purchaseInfo");
    if (!buyBtn) return;

    let isToday = false;
    if (lastSentTS) {
        isToday = lastSentTS.toDate().toDateString() === new Date().toDateString();
    }

    if (points < 1500) {
        buyBtn.disabled = true;
        buyBtn.style.opacity = "0.5";
        info.innerHTML = "🔒 You need at least <b>1500 points</b>.";
    } else if (isToday) {
        buyBtn.disabled = true;
        buyBtn.style.opacity = "0.5";
        info.innerHTML = "🕒 Daily limit reached. Come back tomorrow!";
    } else {
        buyBtn.disabled = false;
        buyBtn.style.opacity = "1";
        info.innerHTML = "✅ You can send a message for <b>1500 points</b>.";
    }
}

function formatCar(carId) {
    return carId ? carId.replaceAll("_", " ").replace("P80C", "P80/C") : "Unknown Car";
}

function goBack() { window.location.href = "index.html"; }

async function logout() {
    await auth.signOut();
    window.location.href = "index.html";
}
