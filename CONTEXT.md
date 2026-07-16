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
All 6 reliability fixes shipped: verified on device (60s hasFix:false heartbeats, HTTPACTION 200 parsed correctly, dashboard shows NoGps) and deployed to BOTH dev and prod (commit f4e04d9). Remaining: field-test real-fix behavior (anchor + moving reports) outdoors.

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

All 6 reliability fixes implemented 2026-07-16 (diagnosis evidence: serial capture on COM6 + dev DB Positions rows 18–47):

1. DONE `modem.cpp`: `httpActionStatus()` sends AT+HTTPACTION=1 and parses the status from ONE buffer (old code consumed the `+HTTPACTION:` prefix in sendAT then waited for it again → 30s timeout → every 200 counted as failure → 33s retry loop, duplicate rows, stale coords from GPS RX buffer overflow).
2. DONE `gps.cpp` `hasValidFix()`: adds `location.age() < GPS_FIX_MAX_AGE_MS` (isValid latches true forever) + quality gate `sats >= GPS_MIN_SATELLITES(5) && hdop <= GPS_MAX_HDOP(2.5)`.
3. DONE `main.cpp` parked anchor: anchor coords stored on entering PARKED (and on first fix); heartbeats send anchor, not live drift; unpark requires speed > 3km/h AND `distanceBetween(anchor, current) > PARK_EXIT_DISTANCE_M(30)`.
4. DONE no-fix heartbeat: firmware posts `hasFix:false` + last-known coords every 60s when fixless; `trackPost()` keeps cadence on failure (no hammering) and calls `recoverModemNetwork()` after 3 consecutive failures (re-init network, then PWRKEY power-cycle as last resort).
5. DONE backend: `TrackRequestDto.HasFix` (default true for old firmware); no-fix → no Positions row, Redis live updated with last-known coords, `HasFix=false`, server-stamped RecordedAt; `VehicleStatus.NoGps` from `DetermineStatus` when fresh-but-fixless.
6. DONE frontend: `VehicleStatus` union + amber "Online, no GPS" badge/marker; `vehicleStatusFromLive` checks `hasFix === false`.

Deploy order (IMPORTANT): dev backend must deploy BEFORE flashing firmware — old backend would store a hasFix:false heartbeat as a real position (1970 timestamp, lat/lng 0). Push develop → wait for Actions → flash `pio run -d firmware-fleet-platformio -t upload --upload-port COM6` (BOOT hold usually needed) → verify serial 200s + NoGps on dev dashboard → merge to main.

Pending verification: real-fix behavior (anchor + moving reports) needs the device outdoors/in vehicle; indoor verification covers no-fix heartbeat + HTTPACTION parse only.

---

## Decisions Log
- 2026-07-15: Firmware payload keys switched to camelCase — backend's ASP.NET camelCase JSON policy silently dropped snake_case fields (device_id → empty → 401)
- 2026-07-15: Device secrets (API_KEY, BACKEND_HOST) moved to gitignored include/secrets.h; secrets.h.example committed as template
- 2026-07-15: vehicle-001 registered in dev DB (pgcrypto bcrypt hash); dev key lives only in local secrets.h and VPS DB
- 2026-07-16: No-fix heartbeat with hasFix flag — device reports "alive but blind" every 60s; backend stores no position, stamps server time, dashboard shows amber "Online, no GPS" (NoGps status)
- 2026-07-16: Parked positions anchored in firmware — heartbeats send anchor coords; unparking needs speed > 3 km/h AND > 30m from anchor (kills multipath drift jumps + phantom-speed false trips)

## Known Issues
- 2026-07-15: GPS date one day behind (time-of-day correct) — device timestamps show previous UTC date. Consider backend stamping RecordedAt with server receive time instead of trusting device clock.
- 2026-07-15: Board spontaneously reboots occasionally (POWERON_RESET) — suspected USB power brownout from A7670C current bursts. Needs dedicated 5V ≥2A supply or bulk capacitor across modem VCC/GND for vehicle install.
- 2026-07-16: Real-fix behavior of the new firmware (anchor + moving reports) not yet verified in the field — device was indoors during the fix; needs an outdoor/vehicle test drive.
