param([string]$Dir, [string]$VoiceName = "Mark", [double]$Rate = 1.0)
# Synthesizes each line of lines.json to vo_N.wav with the Windows (WinRT/OneCore) speech engine. Offline.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]

$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]
function Await($op, [Type]$type) {
    $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op))
    $t.Wait() | Out-Null
    $t.Result
}

$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like "*$VoiceName*" } | Select-Object -First 1
if (-not $voice) { throw "voice $VoiceName not found" }
$synth.Voice = $voice
$synth.Options.SpeakingRate = $Rate
Write-Output ("voice: " + $voice.DisplayName)

$lines = Get-Content -Raw -Encoding UTF8 (Join-Path $Dir "lines.json") | ConvertFrom-Json
$i = 0
foreach ($line in $lines) {
    $stream = Await ($synth.SynthesizeTextToStreamAsync($line)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
    $size = [uint32]$stream.Size
    $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
    $null = Await ($reader.LoadAsync($size)) ([uint32])
    $bytes = New-Object byte[] $size
    $reader.ReadBytes($bytes)
    [System.IO.File]::WriteAllBytes((Join-Path $Dir "vo_$i.wav"), $bytes)
    $i++
}
Write-Output "wrote $i files"
