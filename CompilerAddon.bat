@echo off
setlocal EnableDelayedExpansion

REM Pega a hora atual formatada (HH:MM:SS)
for /f "tokens=1-3 delims=:." %%a in ("%time%") do (
    set "HH=%%a"
    set "MM=%%b"
    set "SS=%%c"
)

REM Nome da pasta atual (supondo que seja o addon)
for %%I in (.) do set "ADDON_NAME=%%~nxI"

REM Caminhos dos manifests
set "BP_MANIFEST=%CD%\BP\manifest.json"
set "RP_MANIFEST=%CD%\RP\manifest.json"

REM Verifica se os manifests existem
if not exist "%BP_MANIFEST%" (
    echo [%HH%:%MM%:%SS%] [ERRO] %BP_MANIFEST% não encontrado.
    exit /b 1
)

if not exist "%RP_MANIFEST%" (
    echo [%HH%:%MM%:%SS%] [ERRO] %RP_MANIFEST% não encontrado.
    exit /b 1
)

REM Destinos base
set "DEST_BASE=%USERPROFILE%\AppData\Local\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang"
set "DEST_BP=%DEST_BASE%\development_behavior_packs\%ADDON_NAME%"
set "DEST_RP=%DEST_BASE%\development_resource_packs\%ADDON_NAME%"

echo [%HH%:%MM%:%SS%] Removendo versões antigas...
rmdir /S /Q "%DEST_BP%" >nul 2>&1
rmdir /S /Q "%DEST_RP%" >nul 2>&1

echo [%HH%:%MM%:%SS%] Copiando Behavior Pack...
xcopy /E /I /Y "BP" "%DEST_BP%" >nul

echo [%HH%:%MM%:%SS%] Copiando Resource Pack...
xcopy /E /I /Y "RP" "%DEST_RP%" >nul

echo.
echo [%HH%:%MM%:%SS%] ✅ Addon "%ADDON_NAME%" atualizado com sucesso!
pause
exit
