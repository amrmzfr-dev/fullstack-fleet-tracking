#pragma once

#define DEVICE_ID "vehicle-001"
#define API_KEY "change-me-api-key"
#define APN "xox"
#define BACKEND_HOST "your-backend.example.com"

#define SPEED_THRESHOLD_KMH 3.0f
#define REPORT_INTERVAL_MS 5000UL
#define PARK_CONFIRM_MS 10000UL
#define PARKED_HEARTBEAT_MS 60000UL

#define MODEM_PWR_PIN 4
#define MODEM_STS_PIN 5
#define MODEM_RX_PIN 16
#define MODEM_TX_PIN 17
#define GPS_RX_PIN 27
#define GPS_TX_PIN 26

#define MODEM_BOOT_TIMEOUT_MS 30000UL
#define AT_RETRY_COUNT 20
#define AT_RETRY_DELAY_MS 500UL
