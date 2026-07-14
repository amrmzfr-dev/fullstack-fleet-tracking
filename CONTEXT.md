# Fleet Tracking System — CONTEXT.md

## Stack
- Firmware: Arduino C++ via PlatformIO (Arduino framework, ESP32)
- Backend: .NET 8 (ASP.NET Core, Controllers) + PostgreSQL + EF Core
- Frontend: React + TypeScript + Tailwind + shadcn/ui + Leaflet
- Cache: Redis (live position cache)
- Deploy: Existing VPS (Docker Compose)

## Structure
```
fullstack-fleet-tracking/
├── firmware-fleet-platformio/   # PlatformIO project (Arduino framework)
│   ├── src/
│   ├── include/
│   ├── lib/
│   └── platformio.ini
├── backend-fleet-dotnet/        # ASP.NET Core 8 Web API
│   ├── Controllers/
│   ├── Models/
│   ├── DTOs/
│   ├── Services/
│   ├── Repositories/
│   ├── Data/
│   ├── Middleware/
│   ├── Migrations/
│   ├── Program.cs
│   ├── appsettings.json
│   ├── appsettings.Development.json
│   ├── backend-fleet-dotnet.csproj
│   └── Dockerfile
├── frontend-fleet-react/        # React + TypeScript dashboard
│   └── src/
│       ├── api/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── pages/
│       ├── router/
│       ├── store/
│       └── types/
├── docker-compose.dev.yml
├── docker-compose.local.yml
├── docker-compose.prod.yml
├── CLAUDE.md
├── CONTEXT.md
└── README.md
```

---

## Current Task
End-to-end tracking LIVE: device posts positions to dev backend over 4G (HTTPACTION 200), visible on fleet-dev dashboard.

## Active Branch / PR
develop

---

## Hardware Pinout (reference for firmware)

### ESP32 WROOM 30-pin → A7670C
| ESP32 | A7670C |
|-------|--------|
| VIN (5V) | VCC |
| GND | GND (pins 1 and 7) |
| GPIO17 (TX2) | RX |
| GPIO16 (RX2) | TX |
| GPIO4 | PWR |
| GPIO5 | STS |

Serial2 init: `Serial2.begin(115200, SERIAL_8N1, 16, 17)` — RX=16, TX=17

### ESP32 WROOM 30-pin → NEO-6M
| ESP32 | NEO-6M |
|-------|--------|
| 3V3 | VCC |
| GND | GND |
| GPIO26 | RX (ESP32 TX → NEO-6M RX) |
| GPIO27 | TX (NEO-6M TX → ESP32 RX) |

Serial1 init: `Serial1.begin(9600, SERIAL_8N1, 27, 26)` — RX=27, TX=26

---

## Plan

Firmware → dev backend wiring (done this session, pending final flash):
- `include/secrets.h` (gitignored) holds `API_KEY` + `BACKEND_HOST`; `secrets.h.example` is the committed template; `config.h` includes it.
- `buildPayload()` in `src/gps.cpp` sends camelCase keys (`deviceId`, `apiKey`, `speedKmh`, …) — backend uses ASP.NET Core camelCase JSON policy and silently drops snake_case fields.
- Dev DB `Vehicles` row Id=1: `DeviceId='vehicle-001'`, `ApiKeyHash` = bcrypt of key in local secrets.h (set via pgcrypto `crypt(..., gen_salt('bf', 11))`).
- GPS logging: status every 2s (`printGPSFix()` with fix / `printGPSDiagnostics()` without, incl. zero-bytes wiring warning). `GPS_RAW_ECHO=0` now.
- DONE: device confirmed posting `+HTTPACTION: 1,200` to dev backend; positions in dev DB.
- A7670C quirks fixed in modem.cpp: no `AT+HTTPSSL` (TLS implied by https:// URL), no HTTPPARA `"CID"`, SNI must be enabled via `AT+CSSLCFG="enableSNI",0,1` (Apache vhosts answer 421 without it), `AT+HTTPINIT` errors if stale session open → HTTPTERM+retry, PWRKEY pulse toggles running modem OFF → probe with AT before pulsing.
- Flash: `pio run -d firmware-fleet-platformio -t upload --upload-port COM6`; auto-reset into bootloader unreliable — usually needs BOOT held during "Connecting...". Monitor 115200 on COM6.

---

## Decisions Log
- 2026-06-11: Parked heartbeat every 60s in firmware — keeps dashboard status as Parked instead of NoSignal
- 2026-06-11: Frontend auth guard bypassed for dev — dashboard loads without login; backend auth unchanged
- 2026-07-15: Firmware payload keys switched to camelCase — backend's ASP.NET camelCase JSON policy silently dropped snake_case fields (device_id → empty → 401)
- 2026-07-15: Device secrets (API_KEY, BACKEND_HOST) moved to gitignored include/secrets.h; secrets.h.example committed as template
- 2026-07-15: vehicle-001 registered in dev DB (pgcrypto bcrypt hash); dev key lives only in local secrets.h and VPS DB

## Known Issues
- 2026-07-15: GPS date one day behind (time-of-day correct) — device timestamps show previous UTC date. Consider backend stamping RecordedAt with server receive time instead of trusting device clock.
- 2026-07-15: Board spontaneously reboots occasionally (POWERON_RESET) — suspected USB power brownout from A7670C current bursts. Needs dedicated 5V ≥2A supply or bulk capacitor across modem VCC/GND for vehicle install.
