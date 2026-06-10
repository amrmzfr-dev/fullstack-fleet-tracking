#pragma once

#include <Arduino.h>

bool powerOnModem();
bool initModemNetwork();
bool sendAT(const char *cmd, const char *expectedResponse, unsigned long timeoutMs);
String waitForResponse(const char *expectedResponse, unsigned long timeoutMs);
bool httpPost(const String &payload);
