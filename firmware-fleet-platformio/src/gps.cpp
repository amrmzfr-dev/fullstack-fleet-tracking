#include "gps.h"

#include "config.h"

namespace {
HardwareSerial &gpsSerial = Serial1;
TinyGPSPlus gpsParser;
}  // namespace

void initGPS() {
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.print(F("GPS: UART started at 9600 baud (RX="));
  Serial.print(GPS_RX_PIN);
  Serial.print(F(", TX="));
  Serial.print(GPS_TX_PIN);
  Serial.println(F(")"));
}

void feedGPS() {
  while (gpsSerial.available()) {
    const char c = static_cast<char>(gpsSerial.read());
    gpsParser.encode(c);
#if GPS_RAW_ECHO
    Serial.write(c);
#endif
  }
}

void printGPSDiagnostics() {
  Serial.println(F("--- GPS DIAG ---"));
  if (gpsParser.charsProcessed() == 0) {
    Serial.println(F("WARNING: no data from GPS module - check wiring/power"));
  }
  Serial.print(F("Chars processed : ")); Serial.println(gpsParser.charsProcessed());
  Serial.print(F("Passed checksum : ")); Serial.println(gpsParser.passedChecksum());
  Serial.print(F("Failed checksum : ")); Serial.println(gpsParser.failedChecksum());
  Serial.print(F("Sentences w/fix : ")); Serial.println(gpsParser.sentencesWithFix());
  Serial.print(F("Fix valid       : ")); Serial.println(gpsParser.location.isValid() ? "YES" : "NO");
  Serial.print(F("Satellites      : "));
  Serial.println(gpsParser.satellites.isValid() ? String(gpsParser.satellites.value()) : F("unknown"));
  Serial.print(F("HDOP            : "));
  Serial.println(gpsParser.hdop.isValid() ? String(gpsParser.hdop.hdop(), 2) : F("unknown"));
  Serial.println(F("----------------"));
}

void printGPSFix() {
  Serial.print(F("GPS: fix lat="));
  Serial.print(gpsParser.location.lat(), 6);
  Serial.print(F(" lng="));
  Serial.print(gpsParser.location.lng(), 6);
  Serial.print(F(" sats="));
  Serial.print(gpsParser.satellites.isValid() ? static_cast<int>(gpsParser.satellites.value()) : 0);
  Serial.print(F(" speed="));
  Serial.print(getSpeedKmh(), 1);
  Serial.println(F("km/h"));
}

bool hasValidFix() {
  // location.isValid() latches true forever after the first fix, so age
  // must be checked or a lost fix keeps reporting frozen coordinates
  return gpsParser.location.isValid()
      && gpsParser.location.age() < GPS_FIX_MAX_AGE_MS
      && gpsParser.satellites.isValid()
      && gpsParser.satellites.value() >= GPS_MIN_SATELLITES
      && gpsParser.hdop.isValid()
      && gpsParser.hdop.hdop() <= GPS_MAX_HDOP;
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

String buildPayload(float speedKmh, bool hasFix, double lat, double lng) {
  char buffer[384];
  snprintf(
      buffer,
      sizeof(buffer),
      "{\"deviceId\":\"%s\",\"apiKey\":\"%s\",\"lat\":%.6f,\"lng\":%.6f,"
      "\"speedKmh\":%.1f,\"heading\":%.1f,\"satellites\":%d,\"hdop\":%.2f,"
      "\"hasFix\":%s,\"timestamp\":\"%s\"}",
      DEVICE_ID,
      API_KEY,
      lat,
      lng,
      speedKmh,
      gpsParser.course.isValid() ? gpsParser.course.deg() : 0.0,
      gpsParser.satellites.isValid() ? static_cast<int>(gpsParser.satellites.value()) : 0,
      gpsParser.hdop.isValid() ? gpsParser.hdop.hdop() : 0.0,
      hasFix ? "true" : "false",
      getISOTimestamp().c_str());
  return String(buffer);
}

String buildPayload(float speedKmh) {
  return buildPayload(speedKmh, true, gpsParser.location.lat(), gpsParser.location.lng());
}

// Heartbeat sent while the GPS has no usable fix: last-known (possibly
// stale) coordinates plus hasFix=false so the backend keeps "last seen"
// fresh without recording a position
String buildNoFixPayload() {
  return buildPayload(0.0f, false, gpsParser.location.lat(), gpsParser.location.lng());
}
