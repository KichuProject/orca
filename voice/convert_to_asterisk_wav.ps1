# Run this script in PowerShell to convert all orca-*.mp3 files to Asterisk-compatible WAV
Get-ChildItem orca-*.mp3 | ForEach-Object {
    ffmpeg -y -i $_.FullName -acodec pcm_s16le -ac 1 -ar 8000 "$($_.BaseName).wav"
}
Write-Host "All Asterisk WAV files converted successfully!" -ForegroundColor Green
