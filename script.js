const tables = document.querySelectorAll(".table");
const title = document.getElementById("tableTitle");

let index = 0;

function update() {
    tables.forEach(t => t.classList.remove("active"));
    tables[index].classList.add("active");

    title.innerText = index === 0
        ? "A LEAGUE TABLE"
        : "A LEAGUE TEAM TABLE";
}

function next() {
    index = (index + 1) % tables.length;
    update();
}

function prev() {
    index = (index - 1 + tables.length) % tables.length;
    update();
}
