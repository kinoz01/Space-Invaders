document.addEventListener("DOMContentLoaded", () => {
    insertScoreboard();
});

async function insertScoreboard() {
    // A single HTML template for each scoreboard
    const scoreboardHTML = `
      <div class="scoreboard-container">
        <div class="percentile-message"></div>
        <table class="scoreboard-table">
          <tr>
            <th>Rank</th>
            <th>Name</th>
            <th>Score</th>
            <th>Time</th>
          </tr>
        </table>
        <div class="pagination-container">
          <button class="pagination-btn prev-btn">Prev ←</button>
          <span class="page-info"></span>
          <button class="pagination-btn next-btn">Next →</button>
        </div>
        <div class="input-container">
          <input type="text" placeholder="Enter your name..." maxlength="20" class="score-input">
          <button class="submit-btn">Submit Score</button>
          <div class="error-message"></div>
        </div>
      </div>
    `;

    // Insert the same scoreboard structure into all elements with class .scoreboard
    document.querySelectorAll(".scoreboard").forEach(sb => {
        sb.innerHTML = scoreboardHTML;
    });

    await loadScores();
    bindSubmitEvents();
}

function bindSubmitEvents() {
    // Click event for "Submit Score"
    document.querySelectorAll(".submit-btn").forEach(btn => {
        btn.addEventListener("click", event => {
            event.preventDefault();
            submitScore(btn.closest(".scoreboard-container"));
        });
    });

    // Click event for "Restart" buttons
    document.querySelectorAll(".restart-btn").forEach(btn => {
        btn.addEventListener("click", resetScoreboardUI);
    });

    // Keydown event to reset scoreboard on spacebar
    document.addEventListener("keydown", event => {
        if (event.code === "Space") resetScoreboardUI();
    });
}

function resetScoreboardUI() {
    document.querySelectorAll(".scoreboard-container").forEach(container => {
        const input = container.querySelector(".score-input");
        const submitBtn = container.querySelector(".submit-btn");
        const errorMsg = container.querySelector(".error-message");

        // Restore default state
        if (input && submitBtn && errorMsg) {
            input.style.display = "";
            submitBtn.style.display = "";
            errorMsg.textContent = "";
            errorMsg.style.color = "red";
        }
    });
}

async function submitScore(container) {
    if (!container) return console.error("Error: scoreboardContainer is undefined.");

    const input = container.querySelector(".score-input");
    const errorMsg = container.querySelector(".error-message");
    const submitBtn = container.querySelector(".submit-btn");
    const scoreElement = container.closest(".game-screen")?.querySelector(".final-score");
    const timeElement = container.closest(".game-screen")?.querySelector(".final-time");

    // Validate required elements
    if (!input || !errorMsg || !submitBtn || !scoreElement || !timeElement) {
        return console.error("Error: Required elements not found in scoreboard.");
    }

    const name = input.value.trim();
    if (!name) {
        errorMsg.textContent = "Enter a valid name!";
        return;
    }

    try {
        const response = await fetch("/api/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                score: parseInt(scoreElement.textContent, 10),
                time: timeElement.textContent
            })
        });
        // Read the error message returned by the server
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }

        // Hide input and show success message
        input.style.display = "none";
        submitBtn.style.display = "none";
        errorMsg.style.color = "green";
        errorMsg.textContent = "Score Submitted!";

        await loadScores();
    } catch (err) {
        errorMsg.style.color = "red";
        errorMsg.textContent = errorMsg.textContent = err.message; ;
    }
}

async function loadScores() {
    try {
        const response = await fetch("/api/scores");
        if (!response.ok) throw new Error("Failed to fetch scores");
        const data = await response.json();
        updateScoreboards(data.scores);
    } catch (err) {
        console.error("Error loading scores:", err);
    }
}

// Pagination variables
let currentPage = 1;
const scoresPerPage = 5;

function updateScoreboards(scores) {
    document.querySelectorAll(".scoreboard-table").forEach(table => {
        const container = table.closest(".scoreboard-container");
        const pagination = container.querySelector(".pagination-container");
        const prevBtn = pagination.querySelector(".prev-btn");
        const nextBtn = pagination.querySelector(".next-btn");
        const pageInfo = pagination.querySelector(".page-info");

        // Calculate pages and slice scores
        const totalPages = Math.ceil(scores.length / scoresPerPage);
        const startIndex = (currentPage - 1) * scoresPerPage;
        const paginatedScores = scores.slice(startIndex, startIndex + scoresPerPage);

        // Rebuild the table rows
        table.innerHTML = `
        <tr>
          <th>Rank</th>
          <th>Name</th>
          <th>Score</th>
          <th>Time</th>
        </tr>
        ${paginatedScores.map((s, i) => `
          <tr>
            <td>#${startIndex + i + 1}</td>
            <td>${s.name}</td>
            <td>${s.score}</td>
            <td>${s.time}</td>
          </tr>
        `).join("")}
      `;

        // Update pagination
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;

        prevBtn.onclick = () => {
            if (currentPage > 1) {
                currentPage--;
                updateScoreboards(scores);
            }
        };
        nextBtn.onclick = () => {
            if (currentPage < totalPages) {
                currentPage++;
                updateScoreboards(scores);
            }
        };
    });
}
