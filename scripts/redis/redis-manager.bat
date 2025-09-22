@echo off
echo 🔧 Redis 管理工具
echo.

if "%1"=="" (
    echo 用法: redis-manager.bat [check^|flush^|info^|keys^|delete] [参数]
    echo.
    echo 示例:
    echo   redis-manager.bat check                    - 检查 Redis 连接状态
    echo   redis-manager.bat flush                    - 清空当前数据库
    echo   redis-manager.bat flush --all              - 清空所有数据库
    echo   redis-manager.bat info                     - 获取 Redis 信息
    echo   redis-manager.bat keys                     - 列出所有键
    echo   redis-manager.bat keys "user:*"            - 列出用户相关键
    echo   redis-manager.bat delete "temp:*"          - 删除临时键
    echo.
    echo ⚠️  警告: flush 和 delete 操作不可逆，请谨慎使用！
    echo.
    pause
    exit /b 1
)

cd /d "%~dp0"

if "%1"=="flush" (
    echo ⚠️  警告: 即将清空 Redis 数据！
    set /p confirm=确定要继续吗？ (y/N): 
    if /i not "%confirm%"=="y" (
        echo 操作已取消
        pause
        exit /b 0
    )
)

if "%1"=="delete" (
    echo ⚠️  警告: 即将删除匹配的 Redis 键！
    set /p confirm=确定要继续吗？ (y/N): 
    if /i not "%confirm%"=="y" (
        echo 操作已取消
        pause
        exit /b 0
    )
)

node redis-manager.js %*

if errorlevel 1 (
    echo.
    echo ❌ 执行失败，请检查错误信息
    pause
)