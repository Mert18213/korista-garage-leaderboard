const leaderboardData = [
    { car: "Red Viper", points: 25, wins: 1 },
    { car: "Black Phantom", points: 18, wins: 0 },
    { car: "Blue Storm", points: 15, wins: 0 },
    { car: "Green Bullet", points: 12, wins: 0 }
];

// puana göre sırala
leaderboardData.sort((a, b) => b.points - a.points);

const tbody = document.querySelector("#leaderboard tbody");

leaderboardData.forEach((item, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `
        <td>${index + 1}</td>
        <td>${item.car}</td>
        <td>${item.points}</td>
        <td>${item.wins}</td>
    `;

    tbody.appendChild(row);
});
