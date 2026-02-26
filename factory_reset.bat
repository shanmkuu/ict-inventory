@echo off
echo ========================================================
echo ICT INVENTORY - FACTORY RESET
echo ========================================================
echo.
echo WARNING: This will permanently delete ALL devices, records, 
echo and assignment history from the database!
echo.
echo If you are moving this system to a new organization, this
echo is the correct action to take.
echo.
set /p confirm="Are you SURE you want to clear everything? (Y/N): "
if /I "%confirm%" neq "Y" (
    echo.
    echo Reset cancelled. No data was deleted.
    pause
    exit /b
)

echo.
echo Stopping backend server if it's running...
taskkill /F /FI "WINDOWTITLE eq ICT Inventory Backend*" /T >nul 2>&1

echo.
echo Deleting database file...
if exist "backend\inventory.db" (
    del /f /q "backend\inventory.db"
    echo Database deleted successfully.
) else (
    echo Database file not found. It may be already deleted.
)

echo.
echo --------------------------------------------------------
echo SYSTEM RESET COMPLETE!
echo --------------------------------------------------------
echo The database has been wiped clean.
echo When you start the server again, a fresh database will be created.
echo.
pause
