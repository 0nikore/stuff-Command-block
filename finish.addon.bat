@echo off
setlocal EnableDelayedExpansion

REM Verifica se os arquivos manifest existem
if not exist "BP\manifest.json" (
    echo [ERRO] BP\manifest.json não encontrado.
    pause
    exit /b
)
if not exist "RP\manifest.json" (
    echo [ERRO] RP\manifest.json não encontrado.
    pause
    exit /b
)

REM Função para extrair nome do manifest
call :GetNameFromManifest "BP\manifest.json" BP_NAME
call :GetNameFromManifest "RP\manifest.json" RP_NAME

set "ADDON_NAME=!RP_NAME!"

REM Compactando BP.mcpack
echo Compactando addon_BP.mcpack...
7z a -tzip addon_BP.mcpack ./BP\* >nul

REM Compactando RP.mcpack
echo Compactando addon_RP.mcpack...
7z a -tzip addon_RP.mcpack ./RP\* >nul

REM Junta os dois em um .mcaddon
mkdir temp_packager >nul
move /Y addon_BP.mcpack temp_packager\ >nul
move /Y addon_RP.mcpack temp_packager\ >nul

echo Compactando %ADDON_NAME%.mcaddon...
7z a -tzip "%ADDON_NAME%.mcaddon" .\temp_packager\* >nul

REM Limpa tudo
rmdir /S /Q temp_packager
echo.
echo ✅ Compactação finalizada com sucesso e compatível com Minecraft!
pause
exit /b

:GetNameFromManifest
set "FILE=%~1"
set "RESULT="
for /f "tokens=2 delims=:" %%A in ('findstr /i /c:"\"name\"" "%FILE%"') do (
    set "LINE=%%A"
    set "LINE=!LINE:~1!"
    set "LINE=!LINE:,=!"
    set "LINE=!LINE:"=!"
    set "LINE=!LINE: =!"
    set "%2=!LINE!"
    goto :eof
)
exit /b
