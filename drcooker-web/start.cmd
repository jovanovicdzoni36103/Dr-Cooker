@echo off
REM ===========================================================================
REM  Dr COOKER — pokretanje sajta lokalno
REM ===========================================================================
REM  Dvoklik na ovaj fajl. Otvara sajt u browseru. To je sve.
REM
REM  Sajt je obican HTML/CSS/JS i nema build sistem. Ovaj fajl samo podigne
REM  mali lokalni server, jer browseri iz bezbednosnih razloga drugacije
REM  tretiraju fajlove otvorene direktno sa diska (file://) — najcesce ne
REM  ucitaju custom fontove.
REM
REM  Mozes otvoriti i index.html dvoklikom; sve radi osim sto ce fontovi
REM  mozda pasti na sistemske.
REM
REM  Za zaustavljanje: zatvori ovaj prozor ili pritisni Ctrl+C.
REM ===========================================================================

setlocal
cd /d "%~dp0"

set PORT=4173

echo.
echo   Dr COOKER — lokalni pregled
echo   ---------------------------
echo   Adresa:  http://localhost:%PORT%
echo   Prekid:  Ctrl+C ili zatvori prozor
echo.

REM Python je na Windowsu najcesce dostupan. Ako nije, probamo Node.
where python >nul 2>nul
if %errorlevel%==0 (
    start "" "http://localhost:%PORT%"
    python -m http.server %PORT% --bind 127.0.0.1
    goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
    start "" "http://localhost:%PORT%"
    py -m http.server %PORT% --bind 127.0.0.1
    goto :eof
)

where npx >nul 2>nul
if %errorlevel%==0 (
    start "" "http://localhost:%PORT%"
    npx --yes serve -l %PORT% .
    goto :eof
)

echo   Nije pronadjen ni Python ni Node.
echo.
echo   Otvori index.html dvoklikom — sajt radi i tako.
echo   Ako zelis i custom fontove, instaliraj Python sa python.org
echo   pa ponovo pokreni ovaj fajl.
echo.
pause
