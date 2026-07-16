#include <Arduino.h>

#include "config.h"
#include "gps.h"
#include "modem.h"

enum MotionState { STATE_PARKED, STATE_MOVING };

MotionState motionState = STATE_PARKED;
unsigned long lastSendMs = 0;
unsigned long belowThresholdSinceMs = 0;
unsigned long lastDiagMs = 0;
bool anchorSet = false;
double anchorLat = 0.0;
double anchorLng = 0.0;
int consecutiveFailures = 0;

// Keeps the send cadence even when a post fails so a dead network doesn't
// turn into a tight retry loop; recovers the modem after repeated failures.
void trackPost(const String &payload) {
  lastSendMs = millis();

  if (httpPost(payload)) {
    consecutiveFailures = 0;
    return;
  }

  if (++consecutiveFailures >= MODEM_FAILURES_BEFORE_RECOVERY) {
    if (recoverModemNetwork()) {
      consecutiveFailures = 0;
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  initGPS();
  Serial2.begin(115200, SERIAL_8N1, MODEM_RX_PIN, MODEM_TX_PIN);

  if (!powerOnModem() || !initModemNetwork()) {
    Serial.println("Modem initialization failed");
  } else {
    Serial.println("Modem ready");
  }
}

void loop() {
  feedGPS();

  const unsigned long now = millis();

  if (now - lastDiagMs >= GPS_DIAG_INTERVAL_MS) {
    if (hasValidFix()) {
      printGPSFix();
    } else {
      printGPSDiagnostics();
    }
    lastDiagMs = now;
  }

  if (!hasValidFix()) {
    // Heartbeat anyway so the dashboard shows "online, no GPS"
    // instead of the device silently vanishing
    if (now - lastSendMs >= PARKED_HEARTBEAT_MS) {
      trackPost(buildNoFixPayload());
    }
    delay(50);
    return;
  }

  const float speedKmh = getSpeedKmh();
  TinyGPSPlus &gps = getGPS();
  const double lat = gps.location.lat();
  const double lng = gps.location.lng();

  if (!anchorSet) {
    // First trusted fix — anchor here and report immediately
    anchorLat = lat;
    anchorLng = lng;
    anchorSet = true;
    trackPost(buildPayload(0.0f, true, anchorLat, anchorLng));
    delay(100);
    return;
  }

  // While parked, GPS noise reads several km/h standing still; require
  // actually leaving the anchor radius before trusting the speed
  const bool moving = speedKmh > SPEED_THRESHOLD_KMH
      && (motionState == STATE_MOVING
          || TinyGPSPlus::distanceBetween(anchorLat, anchorLng, lat, lng) > PARK_EXIT_DISTANCE_M);

  if (moving) {
    belowThresholdSinceMs = 0;

    if (motionState == STATE_PARKED) {
      motionState = STATE_MOVING;
      trackPost(buildPayload(speedKmh));
    } else if (now - lastSendMs >= REPORT_INTERVAL_MS) {
      trackPost(buildPayload(speedKmh));
    }
  } else {
    if (belowThresholdSinceMs == 0) {
      belowThresholdSinceMs = now;
    }

    if (motionState == STATE_MOVING && now - belowThresholdSinceMs >= PARK_CONFIRM_MS) {
      motionState = STATE_PARKED;
      anchorLat = lat;
      anchorLng = lng;
      trackPost(buildPayload(0.0f, true, anchorLat, anchorLng));
    } else if (motionState == STATE_PARKED && now - lastSendMs >= PARKED_HEARTBEAT_MS) {
      // Heartbeats send the anchor, not live coords — parked markers
      // were wandering 20-70m from raw multipath drift
      trackPost(buildPayload(0.0f, true, anchorLat, anchorLng));
    }
  }

  delay(100);
}
