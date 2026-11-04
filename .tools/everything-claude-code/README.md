# Everything Claude Code для этого проекта

Установлено из https://github.com/worldflowai/everything-claude-code,
коммит `432485ba6b92c14fb357276a98957f348bcff9ee`.
Глобальные настройки Codex и Claude не изменены. Установка переносится вместе с каталогом проекта.

## Использование в Codex

- 11 скиллов: `.agents/skills/ecc-*/SKILL.md`. Например: `$ecc-frontend-patterns`,
  `$ecc-tdd-workflow`, `$ecc-security-review`, `$ecc-verification-loop`.
- 9 агентов: `.codex/agents/ecc-*.toml`. Например:
  «Используй агента ecc-planner для планирования задачи» или
  «Поручи ecc-code-reviewer проверить изменения».
- Скиллы доступны со следующего сообщения. Для загрузки новых агентов начните новый чат
  в этом проекте; если список не обновился, перезапустите Codex.
- Модель, reasoning и разрешения агенты наследуют от родительской сессии.
  Ограничение на редактирование у planner, architect и code-reviewer задано инструкцией,
  а не отдельной песочницей.

## Что адаптировано

- Префикс `ecc-` у имён скиллов и агентов предотвращает конфликты с личным набором.
- Для eval-harness, verification-loop и project-guidelines-example добавлены отсутствовавшие метаданные.
- Агенты преобразованы из Markdown с настройками Claude в самостоятельные TOML-файлы Codex.
  Claude-параметры `model: opus` и `tools` не перенесены; тексты ролей сохранены.
- continuous-learning работает вручную по доступному контексту чата; новые знания
  сохраняются только в `.agents/skills/ecc-learned-<тема>/SKILL.md` этого проекта.
- strategic-compact работает вручную: готовит контекст для продолжения.
- continuous-learning, strategic-compact и project-guidelines-example имеют
  `allow_implicit_invocation: false`. Последний — пример чужого проекта,
  а не описание стека mgimo-vibecode.
- Остальные скиллы сохраняют исходные рекомендации. Команды и зависимости из примеров
  следует проверять по фактическому стеку и выполнять с учётом PowerShell/Windows.
- Хуки, slash-команды Claude, глобальные rules, MCP-серверы и дополнительные плагины
  не подключены. Их оригиналы доступны в `upstream/` как справочные материалы.
  Названия `/tdd`, `/eval` и т. п. в исходных текстах описывают процессы,
  а не зарегистрированные команды Codex.

## Удаление

Из корня проекта, сначала необязательный просмотр:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\.tools\everything-claude-code\uninstall.ps1 -WhatIf
```

Полное удаление установленного набора:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\.tools\everything-claude-code\uninstall.ps1
```

Удаление сверяет SHA-256 и удаляет только перечисленные в manifest.json файлы.
При изменении любого из них оно остановится до начала удаления: сохраните изменения
и восстановите установленную версию. Посторонние файлы и созданные позже скиллы
`ecc-learned-*` сохраняются. `-ExecutionPolicy Bypass` относится только к этому запуску
PowerShell и не меняет системную политику.

## Происхождение и проверка

`upstream/` — точная копия отслеживаемых файлов указанного коммита без `.git`.
`manifest.json` фиксирует источник, состав, изменения и контрольные суммы.
README исходного проекта указывает MIT; отдельного LICENSE в этом коммите нет.

Форматы Codex проверены по официальной документации:
- https://learn.chatgpt.com/docs/build-skills
- https://learn.chatgpt.com/docs/agent-configuration/subagents
