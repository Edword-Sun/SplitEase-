package repository

import (
	"fmt"
	"testing"
	"time"
)

func logRepoCall(t *testing.T, method string, start time.Time, err error) {
	duration := time.Since(start)

	// Format: [REPO] 2026/03/28 - 18:26:54 | 8.7437ms | Create
	t.Logf("[REPO] %s | %10s | %s",
		time.Now().Format("2006/01/02 - 15:04:05"),
		fmt.Sprintf("%v", duration),
		method)
}
