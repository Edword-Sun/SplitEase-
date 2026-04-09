package main

import (
	"fmt"
	"log"
	"split_ease/config"
	"split_ease/model"
)

func main() {
	config.InitDB()
	db := config.DB

	var trip model.Trip
	err := db.Where("name LIKE ?", "%苏州之旅%").First(&trip).Error
	if err != nil {
		log.Fatalf("Trip not found: %v", err)
	}

	fmt.Printf("Trip Found: ID=%s, Name=%s, Members=%v\n", trip.ID, trip.Name, trip.Members)

	members := trip.Members

	var bills []model.Bill
	err = db.Where("trip_id = ?", trip.ID).Find(&bills).Error
	if err != nil {
		log.Fatalf("Failed to fetch bills: %v", err)
	}

	fmt.Printf("Number of bills: %d\n", len(bills))

	// Map to track balances for each member
	balances := make(map[string]float64)
	for _, m := range members {
		balances[m] = 0
	}

	for _, b := range bills {
		fmt.Printf("Bill: %s, Cost: %d cent, Payer: %s\n", b.Name, b.CostCent, b.PayerID)

		involved := b.InvolvedMembers

		if len(involved) == 0 {
			involved = members
		}

		costPerPerson := float64(b.CostCent) / float64(len(involved))

		// The payer gets back what others owe
		balances[b.PayerID] += float64(b.CostCent)

		// Each involved person owes their share
		for _, person := range involved {
			balances[person] -= costPerPerson
		}
	}

	fmt.Println("\nSplit Results (in cents):")
	for person, balance := range balances {
		fmt.Printf("Member %s: %.2f\n", person, balance)
	}
}
