# Support Ticket Agent — demo runner for screen recording
# Usage: Open Loom → Start recording → run this script in PowerShell

$ErrorActionPreference = "Stop"
$Api = "http://127.0.0.1:3000"
$Ngrok = "https://charred-pork-cricket.ngrok-free.dev"

function Pause-Step([string]$Message, [int]$Seconds = 4) {
  Write-Host ""
  Write-Host ">>> $Message" -ForegroundColor Cyan
  Start-Sleep -Seconds $Seconds
}

Write-Host "Support Ticket Agent — Demo Runner" -ForegroundColor Green
Write-Host "Record your screen in Loom, then press Enter to start..."
Read-Host

Pause-Step "Step 1: Health check (local API)" 2
try {
  $health = Invoke-RestMethod -Uri "$Api/health"
  Write-Host "  OK: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
  Write-Host "  API not running. Start: docker compose up -d" -ForegroundColor Red
  exit 1
}

Pause-Step "Step 2: Create urgent test ticket" 3
$body = @{
  subject        = "Production database is down"
  body           = "Our production database stopped responding since 10 AM. All users are affected. Need immediate help."
  customer_email = "demo@example.com"
  customer_tier  = "premium"
} | ConvertTo-Json

$created = Invoke-RestMethod -Method Post -Uri "$Api/api/tickets" -ContentType "application/json" -Body $body
$ticketId = $created.ticketId
Write-Host "  Ticket ID: $ticketId" -ForegroundColor Yellow
Write-Host "  Dashboard: http://localhost:5173" -ForegroundColor Yellow

Pause-Step "Step 3: AI processing (show dashboard refreshing)" 5
$final = $null
for ($i = 1; $i -le 15; $i++) {
  $ticket = Invoke-RestMethod -Uri "$Api/api/tickets/$ticketId"
  Write-Host "  Poll $i — status: $($ticket.status), class: $($ticket.classification), urgency: $($ticket.urgency)"
  if ($ticket.status -in @("awaiting_approval", "auto_approved", "sent", "manual_required", "failed", "escalated")) {
    $final = $ticket
    break
  }
  Start-Sleep -Seconds 3
}

if ($final) {
  Write-Host ""
  Write-Host "  Classification: $($final.classification)" -ForegroundColor Green
  Write-Host "  Urgency: $($final.urgency)" -ForegroundColor Green
  Write-Host "  Status: $($final.status)" -ForegroundColor Green
  if ($final.draft_reply) {
    $preview = $final.draft_reply.Substring(0, [Math]::Min(120, $final.draft_reply.Length))
    Write-Host "  Draft: $preview..." -ForegroundColor Gray
  }
} else {
  Write-Host "  Still processing — refresh dashboard manually." -ForegroundColor Yellow
}

Pause-Step "Step 4: Voice TwiML (what Twilio reads on phone call)" 3
Write-Host "  URL: $Ngrok/api/voice/twiml?ticketId=$ticketId" -ForegroundColor Yellow
try {
  $twiml = Invoke-WebRequest -Uri "$Ngrok/api/voice/twiml?ticketId=$ticketId" -Headers @{ "ngrok-skip-browser-warning" = "true" }
  $preview = $twiml.Content.Substring(0, [Math]::Min(300, $twiml.Content.Length))
  Write-Host "  TwiML preview: $preview..." -ForegroundColor Gray
} catch {
  Write-Host "  Ngrok not reachable — show Postman URL instead." -ForegroundColor Yellow
}

Pause-Step "Step 5: Ngrok inspector (show incoming webhooks)" 3
Write-Host "  Open: http://127.0.0.1:4040" -ForegroundColor Yellow

Write-Host ""
Write-Host "Demo complete. Stop Loom recording." -ForegroundColor Green
Write-Host "Optional: Approve ticket in dashboard → http://localhost:5173" -ForegroundColor Gray
