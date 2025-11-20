package main

import (
	"fmt"
	"net/http"
	"os"
	"spaceinvaders/server"
)

func main() {
	// Load existing scores before starting the server
	if err := server.LoadScores(); err != nil {
		fmt.Println("Error loading scores:", err)
	}
	
	// Serve the index.html file for the root path
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "index.html")
	})
	// serve static files:
	http.HandleFunc("/scripts/", server.FilesHandler)
	http.HandleFunc("/assets/", server.FilesHandler)
	http.HandleFunc("/style.css", server.FilesHandler)

	// Scoreboard API
	http.HandleFunc("/api/scores", server.ScoresHandler)

	// Start the server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := ":" + port
	fmt.Println("Server running at http://localhost:" + port)
	if err := http.ListenAndServe(addr, nil); err != nil {
		fmt.Println("Error starting server:", err)
	}
}
