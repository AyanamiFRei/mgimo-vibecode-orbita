# Vercel Web Design Guidelines

Скилл `web-design-guidelines` установлен только для проекта mgimo-vibecode.
Глобальные настройки не изменены; набор Everything Claude Code остаётся отдельным.

Источник: https://github.com/vercel-labs/agent-skills/tree/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62/skills/web-design-guidelines

Коммит: `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62`.
Дата установки: 2026-11-04. Исходный скилл установлен без изменений.

## Использование

В следующем сообщении можно написать:

`$web-design-guidelines Проверь интерфейс в src/ на доступность и UX.`

Скилл проверяет существующий код интерфейса по Web Interface Guidelines Vercel.
Перед каждой проверкой он загружает свежие рекомендации из официального репозитория:
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md

Это рекомендации и аудит интерфейса; скилл не является генератором макетов.
Если Codex не показывает его в списке, начните новый чат в этом проекте.

## Удаление

Запустить из корня проекта:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\.tools\vercel-web-design\uninstall.ps1 -WhatIf
powershell -NoProfile -ExecutionPolicy Bypass -File .\.tools\vercel-web-design\uninstall.ps1
```

Первый запуск только показывает план удаления. Второй удаляет установленные файлы
этого скилла и служебные файлы из `.tools/vercel-web-design/`.
Файлы проверяются по SHA-256 из manifest.json; при наличии изменений удаление
останавливается до удаления. Посторонние файлы и скиллы ECC сохраняются.
ExecutionPolicy Bypass действует только на указанный процесс PowerShell.
