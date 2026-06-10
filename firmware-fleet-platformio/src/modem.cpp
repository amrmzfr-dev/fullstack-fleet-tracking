#include "modem.h"

#include "config.h"

namespace {
HardwareSerial &modemSerial = Serial2;

void drainModem() {
  while (modemSerial.available()) {
    modemSerial.read();
  }
}

bool waitForPrompt(const char *prompt, unsigned long timeoutMs) {
  String buffer;
  const unsigned long start = millis();

  while (millis() - start < timeoutMs) {
    while (modemSerial.available()) {
      const char c = static_cast<char>(modemSerial.read());
      Serial.write(c);
      buffer += c;

      if (buffer.indexOf(prompt) >= 0) {
        return true;
      }
    }
  }

  return false;
}

bool waitForHttpAction(unsigned long timeoutMs) {
  String buffer;
  const unsigned long start = millis();

  while (millis() - start < timeoutMs) {
    while (modemSerial.available()) {
      const char c = static_cast<char>(modemSerial.read());
      Serial.write(c);
      buffer += c;

      if (buffer.indexOf("+HTTPACTION:") >= 0) {
        const int comma1 = buffer.indexOf(',', buffer.indexOf("+HTTPACTION:"));
        if (comma1 < 0) {
          continue;
        }

        const int comma2 = buffer.indexOf(',', comma1 + 1);
        if (comma2 < 0) {
          continue;
        }

        const String statusCode = buffer.substring(comma1 + 1, comma2);
        return statusCode.toInt() == 200;
      }
    }
  }

  return false;
}
}  // namespace

String waitForResponse(const char *expectedResponse, unsigned long timeoutMs) {
  String buffer;
  const unsigned long start = millis();

  while (millis() - start < timeoutMs) {
    while (modemSerial.available()) {
      const char c = static_cast<char>(modemSerial.read());
      Serial.write(c);
      buffer += c;

      if (expectedResponse != nullptr && buffer.indexOf(expectedResponse) >= 0) {
        return buffer;
      }
    }
  }

  return buffer;
}

bool sendAT(const char *cmd, const char *expectedResponse, unsigned long timeoutMs) {
  drainModem();
  modemSerial.println(cmd);
  Serial.print(">> ");
  Serial.println(cmd);

  const String response = waitForResponse(expectedResponse, timeoutMs);
  return response.indexOf(expectedResponse) >= 0;
}

bool powerOnModem() {
  pinMode(MODEM_PWR_PIN, OUTPUT);
  pinMode(MODEM_STS_PIN, INPUT);

  digitalWrite(MODEM_PWR_PIN, HIGH);
  delay(1500);
  digitalWrite(MODEM_PWR_PIN, LOW);

  const unsigned long start = millis();
  while (digitalRead(MODEM_STS_PIN) != HIGH) {
    if (millis() - start > MODEM_BOOT_TIMEOUT_MS) {
      Serial.println("Modem STS timeout");
      return false;
    }
    delay(100);
  }

  for (int attempt = 0; attempt < AT_RETRY_COUNT; ++attempt) {
    if (sendAT("AT", "OK", 1000)) {
      return true;
    }
    delay(AT_RETRY_DELAY_MS);
  }

  Serial.println("Modem AT handshake failed");
  return false;
}

bool initModemNetwork() {
  if (!sendAT("AT+CPIN?", "READY", 5000)) {
    Serial.println("SIM not ready");
    return false;
  }

  const unsigned long regStart = millis();
  bool registered = false;
  while (millis() - regStart < 60000UL) {
    if (sendAT("AT+CREG?", "+CREG:", 3000)) {
      const String response = waitForResponse("OK", 1000);
      if (response.indexOf(",1") >= 0 || response.indexOf(",5") >= 0) {
        registered = true;
        break;
      }
    }
    delay(2000);
  }

  if (!registered) {
    Serial.println("Network registration failed");
    return false;
  }

  String apnCmd = String("AT+CGDCONT=1,\"IP\",\"") + APN + "\"";
  if (!sendAT(apnCmd.c_str(), "OK", 5000)) {
    Serial.println("Failed to set APN");
    return false;
  }

  if (!sendAT("AT+CGACT=1,1", "OK", 30000)) {
    Serial.println("Failed to activate PDP context");
    return false;
  }

  return true;
}

bool httpPost(const String &payload) {
  if (!sendAT("AT+HTTPINIT", "OK", 5000)) {
    return false;
  }

  if (!sendAT("AT+HTTPPARA=\"CID\",1", "OK", 5000)) {
    sendAT("AT+HTTPTERM", "OK", 3000);
    return false;
  }

  String urlCmd = String("AT+HTTPPARA=\"URL\",\"http://") + BACKEND_HOST + "/api/v1/track\"";
  if (!sendAT(urlCmd.c_str(), "OK", 5000)) {
    sendAT("AT+HTTPTERM", "OK", 3000);
    return false;
  }

  if (!sendAT("AT+HTTPPARA=\"CONTENT\",\"application/json\"", "OK", 5000)) {
    sendAT("AT+HTTPTERM", "OK", 3000);
    return false;
  }

  String dataCmd = String("AT+HTTPDATA=") + payload.length() + ",10000";
  modemSerial.println(dataCmd);
  Serial.print(">> ");
  Serial.println(dataCmd);

  if (!waitForPrompt("DOWNLOAD", 10000)) {
    sendAT("AT+HTTPTERM", "OK", 3000);
    return false;
  }

  modemSerial.print(payload);
  Serial.print(">> ");
  Serial.println(payload);

  if (waitForResponse("OK", 10000).indexOf("OK") < 0) {
    sendAT("AT+HTTPTERM", "OK", 3000);
    return false;
  }

  if (!sendAT("AT+HTTPACTION=1", "+HTTPACTION:", 30000)) {
    sendAT("AT+HTTPTERM", "OK", 3000);
    return false;
  }

  const bool success = waitForHttpAction(30000);
  sendAT("AT+HTTPTERM", "OK", 3000);
  return success;
}
