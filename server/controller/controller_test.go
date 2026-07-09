package controller

import (
	"reflect"
	"testing"
)

func TestSplitKeywords(t *testing.T) {
	tests := []struct {
		input    string
		expected []string
	}{
		{"hello world", []string{"hello", "world"}},
		{"\"hello world\" foo", []string{"hello world", "foo"}},
		{"   multiple   spaces   ", []string{"multiple", "spaces"}},
		{"", nil},
		{"\"unclosed quote", []string{"unclosed", "quote"}}, // Current behavior
	}

	for _, test := range tests {
		result := splitKeywords(test.input)
		if !reflect.DeepEqual(result, test.expected) {
			t.Errorf("splitKeywords(%q) = %v, expected %v", test.input, result, test.expected)
		}
	}
}
