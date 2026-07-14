#pragma once

#include <TinyGPSPlus.h>

void initGPS();
void feedGPS();
bool hasValidFix();
float getSpeedKmh();
TinyGPSPlus &getGPS();
String buildPayload(float speedKmh);
String getISOTimestamp();
void printGPSDiagnostics();
void printGPSFix();
