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

// Sends AT+HTTPACTION=1 and waits for the complete URC line
// "+HTTPACTION: <method>,<status>,<len>" in a single buffer. The previous
// implementation waited for the "+HTTPACTION:" prefix in one read loop and
// parsed the status in a second one — the prefix was already consumed, so
// the parser always timed out and every successful POST counted as failed.
int httpActionStatus(unsigned long timeoutMs) {
  drainModem();
  modemSerial.println("AT+HTTPACTION=1");
  Serial.println(">> AT+HTTPACTION=1");

  String buffer;
  const unsigned long start = millis();

  while (millis() - start < timeoutMs) {
    while (modemSerial.available()) {
      const char c = static_cast<char>(modemSerial.read());
      Serial.write(c);
      buffer += c;

      const int tag = buffer.indexOf("+HTTPACTION:");
      if (tag < 0 || buffer.indexOf('\n', tag) < 0) {
        continue;
      }

      const int comma1 = buffer.indexOf(',', tag);
      const int comma2 = comma1 >= 0 ? buffer.indexOf(',', comma1 + 1) : -1;
      if (comma1 < 0 || comma2 < 0) {
        return -1;
      }

      return buffer.substring(comma1 + 1, comma2).toInt();
    }
  }

  return -1;
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
  digitalWrite(MODEM_PWR_PIN, LOW);

  // PWRKEY toggles power state, so a pulse would turn an already-running
  // modem OFF (e.g. after an ESP32-only reset). Probe with AT first.
  for (int attempt = 0; attempt < 3; ++attempt) {
    if (sendAT("AT", "OK", 1000)) {
      Serial.println("Modem already on, skipping PWRKEY pulse");
      return true;
    }
  }

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
    // HTTPINIT errors if a stale session is already open (e.g. previous
    // run died mid-post while the modem stayed powered) — clear and retry
    sendAT("AT+HTTPTERM", "OK", 3000);
    if (!sendAT("AT+HTTPINIT", "OK", 5000)) {
      return false;
    }
  }

  // A7670C has no AT+HTTPSSL or HTTPPARA "CID" — TLS is implied by the
  // https:// URL scheme and the PDP context is managed by the modem.
  // SNI must be enabled or Apache (multiple HTTPS vhosts) answers 421.
  sendAT("AT+CSSLCFG=\"enableSNI\",0,1", "OK", 5000);

  String urlCmd = String("AT+HTTPPARA=\"URL\",\"https://") + BACKEND_HOST + "/api/v1/track\"";
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

  const int status = httpActionStatus(30000);
  sendAT("AT+HTTPTERM", "OK", 3000);

  if (status != 200) {
    Serial.print("HTTP POST failed, status=");
    Serial.println(status);
  }
  return status == 200;
}

bool recoverModemNetwork() {
  Serial.println("Modem recovery: re-running network init");
  if (initModemNetwork()) {
    return true;
  }

  // Registration/PDP unrecoverable over AT — power-cycle the modem.
  // PWRKEY pulse toggles power state, so one pulse turns it off.
  Serial.println("Modem recovery: power-cycling modem");
  digitalWrite(MODEM_PWR_PIN, HIGH);
  delay(1500);
  digitalWrite(MODEM_PWR_PIN, LOW);
  delay(5000);

  return powerOnModem() && initModemNetwork();
}
