let currentRaceId = null;

// 🔄 SAYFA YÜKLENDİĞİNDE ÇALIŞAN ANA DÖNGÜ
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    try {
        // 1. Kullanıcı Verilerini Dinle (onSnapshot ile puanlar anlık güncellenir)
        const userRef = db.collection("users").doc(user.uid);
        
        userRef.onSnapshot((doc) => {
            if (doc.exists) {
                const userData = doc.data();
                const points = userData.points || 0;

                // Üst barı güncelle
                document.getElementById("userInfo").innerText = 
                    `${userData.username} | ${points} Points`;

                // Mesaj Gönderme Buton Kontrolü
                updatePurchaseButton(points, userData.lastMessageSentAt);
            }
        });

        // 2. Aktif Yarışı ve Bahis Geçmişini Yükle
        await loadActiveRace();
        await loadMyBets();

    } catch (error) {
        console.error("Başlatma hatası:", error);
    }
});

// 🔍 AKTİF YARIŞI BUL VE BUTONU AÇ
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
            console.log("Aktif yarış bulunamadı.");
            return;
        }

        currentRaceId = racesSnapshot.docs[0].id;
        
        // Yarış varsa butonu aktif et
        if (betButton) {
            betButton.disabled = false;
            betButton.style.opacity = "1";
        }
        console.log("Aktif Yarış Tanımlandı:", currentRaceId);
    } catch (error) {
        console.error("Yarış yükleme hatası:", error);
    }
}

// 🎰 BAHİS OYNAMA
async function placeBet() {
    const user = auth.currentUser;
    const car = document.getElementById("car").value;
    const stake = Number(document.getElementById("stake").value);

    if (!user || !currentRaceId) {
        alert("Aktif bir yarış bulunamadı.");
        return;
    }

    if (!car || stake <= 0) {
        alert("Lütfen bir araç seçin ve geçerli bir miktar girin.");
        return;
    }

    const userRef = db.collection("users").doc(user.uid);
    const betRef = db.collection("bets").doc(currentRaceId).collection("players").doc(user.uid);

    try {
        const userSnap = await userRef.get();
        if (userSnap.data().points < stake) {
            alert("Yetersiz puan!");
            return;
        }

        const existingBet = await betRef.get();
        if (existingBet.exists) {
            alert("Bu yarışa zaten bahis yaptınız.");
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
        alert("Bahis başarıyla oynandı!");
        // UI yenilemesi için gerekirse loadMyBets çağrılabilir veya reload yapılabilir
    } catch (error) {
        alert("Hata: " + error.message);
    }
}

// 🛒 MESAJ SATIN AL (GÜNLÜK SINIRLI)
async function makePurchase() {
    const user = auth.currentUser;
    const message = document.getElementById("purchaseName").value.trim();
    const COST = 1500;

    if (!user || !message) {
        alert("Lütfen bir mesaj yazın.");
        return;
    }

    const userRef = db.collection("users").doc(user.uid);

    try {
        const userSnap = await userRef.get();
        const userData = userSnap.data();

        // Günlük sınır kontrolü
        if (userData.lastMessageSentAt) {
            const lastSent = userData.lastMessageSentAt.toDate();
            if (lastSent.toDateString() === new Date().toDateString()) {
                alert("Bugün zaten bir mesaj gönderdiniz!");
                return;
            }
        }

        if (userData.points < COST) {
            alert("Puanınız yetersiz.");
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
        alert("Mesaj gönderildi!");
    } catch (error) {
        console.error("Hata:", error);
    }
}

// 📜 GEÇMİŞİ YÜKLE
async function loadMyBets() {
    const user = auth.currentUser;
    const betsDiv = document.getElementById("myBets");
    if (!user || !betsDiv) return;

    try {
        const snap = await db.collectionGroup("players")
            .where("uid", "==", user.uid)
            .get();

        if (snap.empty) {
            betsDiv.innerHTML = "No bets found.";
            return;
        }

        betsDiv.innerHTML = "";
        snap.forEach(doc => {
            const b = doc.data();
            const raceId = doc.ref.parent.parent.id;
            betsDiv.innerHTML += `
                <div class="bet-item" style="border-bottom: 1px solid #444; padding: 10px;">
                    <b>Race: ${raceId}</b><br>
                    🚗 ${formatCar(b.car)} | 💰 ${b.stake} Pts | ${b.paid ? "✅ Paid" : "⏳ Pending"}
                </div>`;
        });
    } catch (e) {
        betsDiv.innerHTML = "Error loading history.";
    }
}

// 🛠️ YARDIMCI FONKSİYONLAR
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
        info.innerHTML = "🔒 You need 1500 points.";
    } else if (isToday) {
        buyBtn.disabled = true;
        buyBtn.style.opacity = "0.5";
        info.innerHTML = "🕒 Daily limit reached. Come back tomorrow!";
    } else {
        buyBtn.disabled = false;
        buyBtn.style.opacity = "1";
        info.innerHTML = "✅ You can send a message for 1500 points.";
    }
}

function formatCar(carId) {
    return carId ? carId.replaceAll("_", " ").replace("P80C", "P80/C") : "Unknown";
}

function goBack() { window.location.href = "index.html"; }

async function logout() {
    await auth.signOut();
    window.location.href = "index.html";
}
