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
_No active task._

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

_No plan._

---

## Decisions Log
- 2026-06-10: Arduino C++ chosen for firmware (library ecosystem for A7670C/NEO-6M, lower barrier vs esp-hal Rust)
- 2026-06-10: Raw AT commands for HTTP (no bloated GSM library; A7670C AT+HTTP commands are well documented)
- 2026-06-10: Polling not websockets for live positions (REST-only constraint; 5s poll is acceptable for fleet tracking)
- 2026-06-10: Redis for live position cache (avoid hammering DB on every dashboard poll cycle)
- 2026-06-10: Backend switched from Go+Gin to .NET 8 ASP.NET Core (Controllers) — Go dropped from stack in favour of .NET
- 2026-06-10: Backend targets net10.0 on dev machine (.NET 10 SDK); API surface matches .NET 8 plan
- 2026-06-11: Parked heartbeat every 60s in firmware — keeps dashboard status as Parked instead of NoSignal
- 2026-06-11: Frontend auth guard bypassed for dev — dashboard loads without login; backend auth unchanged

## Known Issues
—
