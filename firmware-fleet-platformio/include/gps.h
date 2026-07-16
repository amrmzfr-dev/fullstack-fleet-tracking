#pragma once

#include <TinyGPSPlus.h>

void initGPS();
void feedGPS();
bool hasValidFix();
float getSpeedKmh();
TinyGPSPlus &getGPS();
String buildPayload(float speedKmh);
String buildPayload(float speedKmh, bool hasFix, double lat, double lng);
String buildNoFixPayload();
String getISOTimestamp();
void printGPSDiagnostics();
void printGPSFix();
