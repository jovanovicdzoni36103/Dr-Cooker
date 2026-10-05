@echo off
rem Dr Cooker - lokalni pregled sajta.
rem Dvoklik otvara sajt u browseru preko malog lokalnog servera.
rem Kroz file:// ne rade apsolutne putanje, forma ni manifest.
setlocal
cd /d "%~dp0"
set PORT=4173
where node >nul 2>nul && goto node
where py >nul 2>nul && goto py
echo Nema Node.js ni Python-a. Otvaram index.html direktno.
start "" "index.html"
goto kraj
:node
echo Sajt radi na http://localhost:%PORT%  - zatvori prozor kada zavrsis.
start "" "http://localhost:%PORT%"
npx --yes http-server . -p %PORT% -c-1 --silent
goto kraj
:py
echo Sajt radi na http://localhost:%PORT%  - zatvori prozor kada zavrsis.
start "" "http://localhost:%PORT%"
py -3 -m http.server %PORT%
:kraj
endlocal
