# --- Вход в аккаунт без скриптов: каждый вошедший в мир сначала вводит пароль ---
# Каждый тик, первой строкой system/system. Теги входа (auth:login — пароль, auth:register — регистрация) ставят и
# скрипты (scripts/registration/system.js, событие playerJoin), но если скрипты не загрузились (ошибка в коде),
# игрок без этой функции ходил бы по карте без пароля, а после починки скриптов так и оставался бы вошедшим.
# Вход видно по табло session: у игроков в сети счёт 1, у вышедших он сбрасывается каждый тик — зашедший
# получает 0 только в свой первый тик. Форму входа покажут скрипты, когда заработают; до тех пор — слепота и
# замедление (timers/ticks_20), запасное меню на NPC таким игрокам закрыто (fallback/open).
# Не ловит только тех, кто был в сети в момент сохранения мира (хост): их при загрузке мира проверяют скрипты.
scoreboard players add @a session 0
tag @a[scores={session=0},tag=!role:bot,tag=!sys:bot,tag=auth:done,tag=!auth:register] add auth:login
tag @a[scores={session=0},tag=!role:bot,tag=!sys:bot,tag=!auth:done] add auth:register
scoreboard players reset * session
scoreboard players set @a session 1
