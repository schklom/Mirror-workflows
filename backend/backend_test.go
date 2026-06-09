package backend

import (
	"testing"
)

func TestInteger(t *testing.T) {
	actual := portToListenAddr("8080")
	expected := ":8080"

	if actual != expected {
		t.Errorf(`actual=%s != expected=%s`, actual, expected)
	}
}

func TestIntegerMinus1(t *testing.T) {
	actual := portToListenAddr("-1")
	expected := ""

	if actual != expected {
		t.Errorf(`actual=%s != expected=%s`, actual, expected)
	}
}

func TestWithColon(t *testing.T) {
	actual := portToListenAddr(":8080")
	expected := ":8080"

	if actual != expected {
		t.Errorf(`actual=%s != expected=%s`, actual, expected)
	}
}

func TestWithAddr(t *testing.T) {
	actual := portToListenAddr("[::1]:8080")
	expected := "[::1]:8080"

	if actual != expected {
		t.Errorf(`actual=%s != expected=%s`, actual, expected)
	}
}
