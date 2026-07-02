#!/bin/bash

# ===== CẤU HÌNH =====
API_URL="http://localhost:8000"
CONCURRENT_USERS=10
SHOWTIME_ID=""
SEAT_IDS=""
PRICE=

USERS=(
    "alice@email.com:password"
    "bob@email.com:password"
)

# ===== COLORS =====
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

# ===== TEMP =====
TEMP_DIR="/tmp/booking-test-$$"
mkdir -p "$TEMP_DIR"

# ===== GLOBAL ARRAYS (BASH 3.2 SAFE) =====
USER_EMAILS=()
USER_TOKENS=()

# ===== GLOBAL TIME =====
SCRIPT_START=0
SCRIPT_END=0

# ================= FUNCTIONS =================

show_banner() {
    echo -e "\n${BOLD}${CYAN}╔═══════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║   Booking API Concurrent Test        ║${NC}"
    echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════╝${NC}\n"
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -n|--users) CONCURRENT_USERS="$2"; shift 2 ;;
            -s|--showtime) SHOWTIME_ID="$2"; shift 2 ;;
            -e|--seats) SEAT_IDS="$2"; shift 2 ;;
            -h|--help) exit 0 ;;
            *) echo "Unknown option $1"; exit 1 ;;
        esac
    done
}

# ===== LOGIN =====
get_tokens() {
    echo -e "${YELLOW}[1/4] Đăng nhập users để lấy tokens...${NC}"

    for user_cred in "${USERS[@]}"; do
        IFS=':' read -r email password <<< "$user_cred"

        response=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$email\",\"password\":\"$password\"}")

        token=$(echo "$response" | jq -r '.token // .data.token // empty')

        if [ -n "$token" ] && [ "$token" != "null" ]; then
            USER_EMAILS+=("$email")
            USER_TOKENS+=("$token")
        else
            echo -e "${RED}✗ Login failed: $email${NC}"
        fi
    done

    if [ ${#USER_EMAILS[@]} -eq 0 ]; then
        echo -e "${RED}✗ Không có user login thành công${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ Logged in ${#USER_EMAILS[@]} users${NC}"
}

get_showtime_id() {
    echo -e "${GREEN}✓ Sử dụng showtime: $SHOWTIME_ID${NC}"
}

get_available_seats() {
    echo -e "${GREEN}✓ Sử dụng seats: $SEAT_IDS${NC}"
}

# ===== BOOKING =====
do_booking() {
    local user_id=$1
    local output_file="$TEMP_DIR/result_${user_id}.json"

    local total_users=${#USER_EMAILS[@]}
    local idx=$(( (user_id - 1) % total_users ))

    local user_email="${USER_EMAILS[$idx]}"
    local user_token="${USER_TOKENS[$idx]}"

    IFS=',' read -ra SEATS <<< "$SEAT_IDS"
    seat_json=$(printf '%s\n' "${SEATS[@]}" | jq -R . | jq -s .)
    total_amount=$((${#SEATS[@]} * PRICE))

    start=$(date +%s.%N)
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/bookings" \
        -H "Authorization: Bearer $user_token" \
        -H "Content-Type: application/json" \
        -d "{
            \"showtime_id\": \"$SHOWTIME_ID\",
            \"seat_ids\": $seat_json,
            \"total_amount\": $total_amount
        }")
    end=$(date +%s.%N)

    duration=$(echo "$end - $start" | bc)
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | sed '$d')

    jq -n \
        --arg user "$user_id" \
        --arg email "$user_email" \
        --arg code "$http_code" \
        --arg dur "$duration" \
        --argjson resp "${body:-null}" \
        '{
            user_id: ($user | tonumber),
            user_email: $email,
            http_code: ($code | tonumber),
            duration: ($dur | tonumber),
            response: $resp
        }' > "$output_file" 2>/dev/null
}

# ===== CONCURRENT =====
run_concurrent_test() {
    echo -e "\n${BOLD}${YELLOW}[4/4] Bắt đầu test concurrent...${NC}"

    for i in $(seq 1 $CONCURRENT_USERS); do
        do_booking "$i" &
        sleep 0.1
    done
    wait
}

# ===== ANALYZE (GIỮ NGUYÊN TABLE) =====
analyze_results() {
    echo -e "\n${BOLD}${CYAN}╔═══════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║           KẾT QUẢ BENCHMARK           ║${NC}"
    echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════╝${NC}\n"

    local success=0 conflict=0 error=0 total=0

    echo -e "${BLUE}┌──────┬──────────┬──────────┬──────────────────────────────┐${NC}"
    echo -e "${BLUE}│ User │  Status  │ Duration │            Message           │${NC}"
    echo -e "${BLUE}├──────┼──────────┼──────────┼──────────────────────────────┤${NC}"

    for result in "$TEMP_DIR"/result_*.json; do
        [ -f "$result" ] || continue

        user_id=$(jq -r '.user_id' "$result")
        http_code=$(jq -r '.http_code' "$result")
        duration=$(jq -r '.duration' "$result")
        message=$(jq -r '.response.message // .response.error // "N/A"' "$result" | cut -c1-30)

        total=$((total + 1))

        if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
            success=$((success + 1))
            status="${GREEN}SUCCESS${NC}"
        elif [ "$http_code" = "409" ] || [ "$http_code" = "400" ]; then
            conflict=$((conflict + 1))
            status="${YELLOW}CONFLICT${NC}"
        else
            error=$((error + 1))
            status="${RED}ERROR${NC}"
        fi

        printf "${BLUE}│${NC} %4s ${BLUE}│${NC} %b ${BLUE}│${NC} %6.3fs ${BLUE}│${NC} %-28s ${BLUE}│${NC}\n" \
            "$user_id" "$status" "$duration" "$message"
    done

    echo -e "${BLUE}└──────┴──────────┴──────────┴──────────────────────────────┘${NC}\n"

    echo "Total: $total | Success: $success | Conflict: $conflict | Error: $error"
}

# ===== MAIN =====
main() {
    SCRIPT_START=$(date +%s.%N)

    parse_args "$@"
    show_banner
    get_tokens
    get_showtime_id
    get_available_seats
    run_concurrent_test
    analyze_results

    SCRIPT_END=$(date +%s.%N)

    TOTAL_TIME=$(echo "$SCRIPT_END - $SCRIPT_START" | bc)

    echo -e "\n${BOLD}${CYAN}⏱  TOTAL EXECUTION TIME${NC}"
    printf "${BOLD}→ %.3f seconds${NC}\n\n" "$TOTAL_TIME"
}

trap "echo 'Cleanup...'" EXIT
main "$@"
