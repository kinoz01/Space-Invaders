package server

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
)

// Score represents a single game score entry
type Score struct {
	Name  string `json:"name"`
	Score int    `json:"score"`
	Time  string `json:"time"`
}

// Scoreboard holds multiple scores
type Scoreboard struct {
	Scores []Score `json:"scores"`
}

var (
	scoreboard = Scoreboard{}
	filePath   = "./server/scores.json"
	mu         sync.Mutex // Prevents race conditions
)

// Handles HTTP errors
func ErrorHandler(w http.ResponseWriter, status int, statusText, message string, err error) {
	w.WriteHeader(status)
	fmt.Fprintf(w, "%d %s: %s\n", status, statusText, message)
	if err != nil {
		fmt.Println("Error:", err)
	}
}

// serves static files securely
func FilesHandler(w http.ResponseWriter, r *http.Request) {
	filePath := "." + r.URL.Path

	filesBytes, err := os.ReadFile(filePath)

	// Prevent directory traversal attacks, ex: http://127.0.0.1:8080/css/..%2F..%2Fmain.go
	if err != nil || strings.Contains(filePath, "..") {
		ErrorHandler(w, http.StatusForbidden, http.StatusText(http.StatusForbidden), "You don't have permission to access this link!", err)
		return
	}

	http.ServeContent(w, r, filePath, time.Now(), bytes.NewReader(filesBytes))
}

// Loads scores from the JSON file
func LoadScores() error {
	file, err := os.Open(filePath)
	if err != nil {
		// If file doesn't exist, create an empty one
		if os.IsNotExist(err) {
			scoreboard = Scoreboard{Scores: []Score{}}
			return SaveScores()
		}
		return err
	}
	defer file.Close()

	bytes, err := ioutil.ReadAll(file)
	if err != nil {
		return err
	}

	return json.Unmarshal(bytes, &scoreboard)
}

// Writes the scoreboard to the JSON file
func SaveScores() error {
	mu.Lock()
	defer mu.Unlock()

	bytes, err := json.MarshalIndent(scoreboard, "", "  ")
	if err != nil {
		return err
	}

	return ioutil.WriteFile(filePath, bytes, 0644)
}

// Handle getting and posting scores
func ScoresHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	switch r.Method {
	case "GET":
		// Return sorted scores (highest first)
		mu.Lock()
		defer mu.Unlock()
		sort.Slice(scoreboard.Scores, func(i, j int) bool {
			return scoreboard.Scores[i].Score > scoreboard.Scores[j].Score
		})
		json.NewEncoder(w).Encode(scoreboard)

	case "POST":
		var newScore Score
		err := json.NewDecoder(r.Body).Decode(&newScore)
		if err != nil {
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
			return
		}

		// Add the new score
		mu.Lock()
		scoreboard.Scores = append(scoreboard.Scores, newScore)
		mu.Unlock()

		// Save to file
		err = SaveScores()
		if err != nil {
			http.Error(w, "Failed to save score", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(newScore)
	}
}
