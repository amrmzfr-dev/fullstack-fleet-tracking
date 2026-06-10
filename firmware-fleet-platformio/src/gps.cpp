#include "gps.h"

#include "config.h"

namespace {
HardwareSerial &gpsSerial = Serial1;
TinyGPSPlus gpsParser;
}  // namespace

void initGPS() {
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
}

void feedGPS() {
  while (gpsSerial.available()) {
    gpsParser.encode(gpsSerial.read());
  }
}

bool hasValidFix() {
  return gpsParser.location.isValid();
}

float getSpeedKmh() {
  return gpsParser.speed.isValid() ? gpsParser.speed.kmph() : 0.0f;
}

TinyGPSPlus &getGPS() {
  return gpsParser;
}

String getISOTimestamp() {
  if (!gpsParser.date.isValid() || !gpsParser.time.isValid()) {
    return "1970-01-01T00:00:00Z";
  }

  char buffer[32];
  snprintf(
      buffer,
      sizeof(buffer),
      "%04d-%02d-%02dT%02d:%02d:%02dZ",
      gpsParser.date.year(),
      gpsParser.date.month(),
      gpsParser.date.day(),
      gpsParser.time.hour(),
      gpsParser.time.minute(),
      gpsParser.time.second());
  return String(buffer);
}

String buildPayload(float speedKmh) {
  char buffer[384];
  snprintf(
      buffer,
      sizeof(buffer),
      "{\"device_id\":\"%s\",\"api_key\":\"%s\",\"lat\":%.6f,\"lng\":%.6f,"
      "\"speed_kmh\":%.1f,\"heading\":%.1f,\"satellites\":%d,\"hdop\":%.2f,"
      "\"timestamp\":\"%s\"}",
      DEVICE_ID,
      API_KEY,
      gpsParser.location.lat(),
      gpsParser.location.lng(),
      speedKmh,
      gpsParser.course.isValid() ? gpsParser.course.deg() : 0.0,
      gpsParser.satellites.isValid() ? static_cast<int>(gpsParser.satellites.value()) : 0,
      gpsParser.hdop.isValid() ? gpsParser.hdop.hdop() : 0.0,
      getISOTimestamp().c_str());
  return String(buffer);
}
