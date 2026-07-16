#pragma once

#include "secrets.h"  // API_KEY + BACKEND_HOST — gitignored, see secrets.h.example

#define DEVICE_ID "vehicle-001"
#define APN "xox"

#define SPEED_THRESHOLD_KMH 3.0f
#define REPORT_INTERVAL_MS 5000UL
#define PARK_CONFIRM_MS 10000UL
#define PARKED_HEARTBEAT_MS 60000UL

// Fix quality gates — a fix is only trusted when fresh, with enough
// satellites and low dilution; drift below these limits is GPS noise
#define GPS_FIX_MAX_AGE_MS 5000UL
#define GPS_MIN_SATELLITES 5
#define GPS_MAX_HDOP 2.5f

// While parked, coordinates are anchored; speed alone (GPS noise reads up
// to ~11 km/h stationary) doesn't unpark — device must also leave this radius
#define PARK_EXIT_DISTANCE_M 30.0f

// Consecutive failed posts before re-running network init / modem power cycle
#define MODEM_FAILURES_BEFORE_RECOVERY 3

#define MODEM_PWR_PIN 4
#define MODEM_STS_PIN 5
#define MODEM_RX_PIN 16
#define MODEM_TX_PIN 17
#define GPS_RX_PIN 27
#define GPS_TX_PIN 26

#define MODEM_BOOT_TIMEOUT_MS 30000UL
#define AT_RETRY_COUNT 20
#define AT_RETRY_DELAY_MS 500UL

// GPS debug — set GPS_RAW_ECHO to 0 to silence raw NMEA output
#define GPS_RAW_ECHO 0
#define GPS_DIAG_INTERVAL_MS 2000UL
