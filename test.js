function ANDGate(input1, input2) {
    return input1 && input2;
}

// Test
console.log(ANDGate(24, true));  // Output: true
console.log(ANDGate(1, "0")); // Output: false
console.log(ANDGate(false, false)); // Output: false
