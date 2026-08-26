#!/bin/bash

RESULT="crud-result.txt"

run_test() {
    VUS=$1
    DURATION=$2

    echo "" >> "$RESULT"
    echo "========================================" >> "$RESULT"
    echo "CRUD TEST - $VUS VUs - $DURATION" >> "$RESULT"
    echo "Date: $(date)" >> "$RESULT"
    echo "========================================" >> "$RESULT"

    k6 run \
        --vus "$VUS" \
        --duration "$DURATION" \
        crud-test.js 2>&1 | tee -a "$RESULT"
}

run_test 1 10s
run_test 10 30s
run_test 50 30s
run_test 100 30s
run_test 500 30s
run_test 1000 30s
