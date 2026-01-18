async function loadTop10() {
    const list = document.getElementById("top10List");
    list.innerHTML = "";

    const snap = await db
        .collection("users")
        .orderBy("points", "desc")
        .limit(10)
        .get();

    let rank = 1;

    snap.forEach(doc => {
        const user = doc.data();

        list.innerHTML += `
            <div class="row">
                <span>${rank}</span>
                <span>${user.username}</span>
                <span>${user.points}</span>
            </div>
        `;
        rank++;
    });
}
