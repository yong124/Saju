# Set TLS to 1.2 for secure connection
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$targetDir = ".\images"

if (-not (Test-Path -Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir
    Write-Host "Created 'images' directory." -ForegroundColor Green
}

$images = @(
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/9/90/RWS_Tarot_00_Fool.jpg"; OutFile = "00_fool.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/d/de/RWS_Tarot_01_Magician.jpg"; OutFile = "01_magician.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/8/88/RWS_Tarot_02_High_Priestess.jpg"; OutFile = "02_priestess.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/d/d2/RWS_Tarot_03_Empress.jpg"; OutFile = "03_empress.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/c/c3/RWS_Tarot_04_Emperor.jpg"; OutFile = "04_emperor.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/8/8d/RWS_Tarot_05_Hierophant.jpg"; OutFile = "05_hierophant.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/d/db/RWS_Tarot_06_Lovers.jpg"; OutFile = "06_lovers.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/9/9b/RWS_Tarot_07_Chariot.jpg"; OutFile = "07_chariot.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/f/f5/RWS_Tarot_08_Strength.jpg"; OutFile = "08_strength.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/4/4d/RWS_Tarot_09_Hermit.jpg"; OutFile = "09_hermit.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/3/3c/RWS_Tarot_10_Wheel_of_Fortune.jpg"; OutFile = "10_wheel.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/e/e0/RWS_Tarot_11_Justice.jpg"; OutFile = "11_justice.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/2/2b/RWS_Tarot_12_Hanged_Man.jpg"; OutFile = "12_hanged.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/d/d7/RWS_Tarot_13_Death.jpg"; OutFile = "13_death.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/f/f8/RWS_Tarot_14_Temperance.jpg"; OutFile = "14_temperance.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/5/55/RWS_Tarot_15_Devil.jpg"; OutFile = "15_devil.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/5/53/RWS_Tarot_16_Tower.jpg"; OutFile = "16_tower.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/d/db/RWS_Tarot_17_Star.jpg"; OutFile = "17_star.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/7/7f/RWS_Tarot_18_Moon.jpg"; OutFile = "18_moon.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/1/17/RWS_Tarot_19_Sun.jpg"; OutFile = "19_sun.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/d/dd/RWS_Tarot_20_Judgement.jpg"; OutFile = "20_judgement.jpg" },
    @{ Uri = "https://upload.wikimedia.org/wikipedia/commons/f/ff/RWS_Tarot_21_World.jpg"; OutFile = "21_world.jpg" }
)

Write-Host "Starting Tarot card image download..."

foreach ($image in $images) {
    $destination = Join-Path -Path $targetDir -ChildPath $image.OutFile
    if (Test-Path $destination) {
        Write-Host "$($image.OutFile) already exists. Skipping." -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Downloading $($image.OutFile)..."
    try {
        Invoke-WebRequest -Uri $image.Uri -OutFile $destination -ErrorAction Stop
        Write-Host " -> Successfully saved." -ForegroundColor Green
    } catch {
        Write-Host " -> FAILED to download $($image.Uri). Error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Download process complete. Check the 'images' folder." -ForegroundColor Cyan
Read-Host "Press Enter to exit."
