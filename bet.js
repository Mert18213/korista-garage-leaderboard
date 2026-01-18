let currentRaceId = null;

// SAYFA YÜKLENDİĞİNDE
auth.onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    try {
        // 1. KULLANICI VERİSİNİ ÇEK (Doğru yöntem budur)
        const userRef = db.collection("users").doc(user.uid);
        const userSnapshot = await userRef.get();

        if (userSnapshot.exists) {
            const userData = userSnapshot.data();
            const points = userData.points || 0;

            // Üst barı güncelle
            document.getElementById("userInfo").innerText = 
                `${userData.username} | ${points} Points`;

            // MESAJ GÖNDERME BUTONUNU KONTROL ET
            const buyBtn = document.getElementById("buyBtn");
            const purchaseInfo = document.getElementById("purchaseInfo");
            
            if (buyBtn && purchaseInfo) {
                if (points >= 1500) {
                    buyBtn.disabled = false;
                    buyBtn.style.opacity = "1";
                    purchaseInfo.innerHTML = "✅ You can send a message for <b>1500 points</b>.";
                } else {
                    buyBtn.disabled = true;
                    buyBtn.style.opacity = "0.5";
                    purchaseInfo.innerHTML = `🔒 You need <b>1500 points</b> to send a message.`;
                }
            }
        }

        // 2. YARIŞLARI VE GEÇMİŞİ YÜKLE
        await loadActiveRace();
        await loadMyBets();

    } catch (error) {
        console.error("Başlatma hatası:", error);
    }
});

// Bahis geçmişini yükleyen fonksiyon (Hata payı düşük hali)
async function loadMyBets() {
    const user = auth.currentUser;
    const betsDiv = document.getElementById("myBets");
    if (!user || !betsDiv) return;

    try {
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
                    <b style="color: #ffcc00;">Race: ${raceId}</b><br>
                    🚗 ${formatCar(bet.car)} | 💰 ${bet.stake} Pts | ${bet.paid ? "✅ Paid" : "⏳ Pending"}
                </div>`;
        });
    } catch (error) {
        console.error("Geçmiş hatası:", error);
        betsDiv.innerHTML = "Error loading history.";
    }
}

// 🛒 MESAJ SATIN AL
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
        if (userSnap.data().points < COST) {
            alert("Puanınız yetersiz.");
            return;
        }

        // PUAN DÜŞ VE MESAJI KAYDET
        await userRef.update({
            points: firebase.firestore.FieldValue.increment(-COST)
        });

        await db.collection("purchases").add({
            userId: user.uid,
            username: userSnap.data().username,
            message: message,
            cost: COST,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById("purchaseName").value = "";
        alert("Mesaj başarıyla gönderildi!");
    } catch (error) {
        alert("Satın alma hatası: " + error.message);
    }
}

// 🚗 ARAÇ ADINI FORMATLA
function formatCar(carId) {
    if (!carId) return "Bilinmeyen Araç";
    return carId.replaceAll("_", " ").replace("P80C", "P80/C");
}

function goBack() { window.location.href = "index.html"; }

async function logout() {
    await auth.signOut();
    window.location.href = "index.html";
}
