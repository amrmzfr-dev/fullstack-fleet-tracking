#include <Arduino.h>

#include "config.h"
#include "gps.h"
#include "modem.h"

enum MotionState { STATE_PARKED, STATE_MOVING };

MotionState motionState = STATE_PARKED;
unsigned long lastSendMs = 0;
unsigned long belowThresholdSinceMs = 0;
unsigned long lastDiagMs = 0;

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
    delay(50);
    return;
  }

  const float speedKmh = getSpeedKmh();

  if (speedKmh > SPEED_THRESHOLD_KMH) {
    belowThresholdSinceMs = 0;

    if (motionState == STATE_PARKED) {
      motionState = STATE_MOVING;
      if (httpPost(buildPayload(speedKmh))) {
        lastSendMs = now;
      }
    } else if (now - lastSendMs >= REPORT_INTERVAL_MS) {
      if (httpPost(buildPayload(speedKmh))) {
        lastSendMs = now;
      }
    }
  } else {
    if (belowThresholdSinceMs == 0) {
      belowThresholdSinceMs = now;
    }

    if (motionState == STATE_MOVING && now - belowThresholdSinceMs >= PARK_CONFIRM_MS) {
      motionState = STATE_PARKED;
      httpPost(buildPayload(0.0f));
      lastSendMs = now;
    } else if (motionState == STATE_PARKED && now - lastSendMs >= PARKED_HEARTBEAT_MS) {
      if (httpPost(buildPayload(0.0f))) {
        lastSendMs = now;
      }
    }
  }

  delay(100);
}
