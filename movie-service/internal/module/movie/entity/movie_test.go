package entity

import "testing"

func TestMovieValidationAndTransition(t *testing.T) {
	// Test Case ID: TC-MOV-ENTITY-004
	m := &Movie{Title: "", Duration: 120}
	if m.IsValid() {
		t.Fatal("expected empty title movie to be invalid")
	}

	// Test Case ID: TC-MOV-ENTITY-005
	m = &Movie{Title: "Inception", Duration: 148, Status: MovieStatusUpcoming}
	if !m.IsValid() {
		t.Fatal("expected movie to be valid")
	}
	if !m.CanTransitionTo(MovieStatusShowing) {
		t.Fatal("expected UPCOMING -> SHOWING transition to be valid")
	}
	if m.CanTransitionTo(MovieStatusEnded) {
		t.Fatal("expected UPCOMING -> ENDED transition to be invalid")
	}
}
