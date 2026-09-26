# Публичные конфигурации завершённого эксперимента SRB-1

Это параметры, восстановленные из фактически отправленных запросов всех 480 проб. Профиль каждой модели сохранялся внутри её deployment; параметры моделей различались. Поэтому сравнение не изолирует влияние только весов от режима генерации.

| Модель | temperature | top_p | top_k | min_p | presence_penalty | repeat_penalty | max_tokens |
|---|---:|---:|---:|---:|---:|---:|---:|
| Qwen3.5 4B | 0.7 | 0.8 | 20 | 0.0 | 1.5 | 1.0 | 1024 |
| Gemma 4 31B | 1.0 | 0.95 | 64 | 0.0 | 0.0 | 1.0 | 1024 |
| GLM-4.7-Flash | 1.0 | 0.95 | 0 | 0.0 | 0.0 | 1.0 | 8192 |
| gpt-oss-20b | 1.0 | 1.0 | 0 | 0.0 | 0.0 | 1.0 | 8192 |
| Qwen3.8 27B | 1.0 | 0.95 | 20 | 0.0 | 0.0 | 1.0 | 8192 |
| Mistral Small 3.2 24B | 0.15 | 1.0 | 0 | 0.0 | 0.0 | 1.0 | 1024 |

top_k=0 отключает ограничение top-k в использованном llama.cpp. Во всех 480 запросах seed задан; использованы 480 различных значений. Начальные условия — отдельные нейтральные user-сообщения без явного system payload. Каждое повторение — отдельный запрос.

## Thinking и дополнительные параметры

### Qwen3.5 4B

```json
{
  "temperature": 0.7,
  "top_p": 0.8,
  "top_k": 20,
  "min_p": 0.0,
  "presence_penalty": 1.5,
  "repeat_penalty": 1.0,
  "max_tokens": 1024,
  "chat_template_kwargs": {
    "enable_thinking": false
  },
  "reasoning_format": "deepseek",
  "cache_prompt": false
}
```

### Gemma 4 31B

```json
{
  "temperature": 1.0,
  "top_p": 0.95,
  "top_k": 64,
  "min_p": 0.0,
  "presence_penalty": 0.0,
  "repeat_penalty": 1.0,
  "max_tokens": 1024,
  "chat_template_kwargs": {
    "enable_thinking": false
  },
  "reasoning_format": "deepseek",
  "cache_prompt": false
}
```

### GLM-4.7-Flash

```json
{
  "temperature": 1.0,
  "top_p": 0.95,
  "top_k": 0,
  "min_p": 0.0,
  "presence_penalty": 0.0,
  "repeat_penalty": 1.0,
  "max_tokens": 8192,
  "reasoning_format": "deepseek",
  "cache_prompt": false
}
```

### gpt-oss-20b

```json
{
  "temperature": 1.0,
  "top_p": 1.0,
  "top_k": 0,
  "min_p": 0.0,
  "presence_penalty": 0.0,
  "repeat_penalty": 1.0,
  "max_tokens": 8192,
  "reasoning_effort": "medium",
  "reasoning_format": "deepseek",
  "cache_prompt": false
}
```

### Qwen3.8 27B

```json
{
  "temperature": 1.0,
  "top_p": 0.95,
  "top_k": 20,
  "min_p": 0.0,
  "presence_penalty": 0.0,
  "repeat_penalty": 1.0,
  "max_tokens": 8192,
  "chat_template_kwargs": {
    "enable_thinking": true
  },
  "reasoning_format": "deepseek",
  "cache_prompt": false
}
```

### Mistral Small 3.2 24B

```json
{
  "temperature": 0.15,
  "top_p": 1.0,
  "top_k": 0,
  "min_p": 0.0,
  "presence_penalty": 0.0,
  "repeat_penalty": 1.0,
  "max_tokens": 1024,
  "reasoning_format": "deepseek",
  "cache_prompt": false
}
```

Если chat_template_kwargs или reasoning_effort отсутствуют в блоке, запрос не задавал их явно. Это не означает отключённый thinking: поведение также определяется штатным шаблоном модели. reasoning_format задаёт формат разделения ответа; промежуточный reasoning в книгу не включён.

## Судьи

- Jev 1.13.0: 479 валидных разметок. Параметры temperature/top_p/top_k/seed и предел выхода в запросе классификатора явно не задавались.
- GLM-5.3-Flash через ZCode: 477 валидных разметок. Sampling и thinking управляются клиентом/провайдером; скрытая версия checkpoint не раскрыта. Исходный предел 8192 токена. Все 41 усечённые разметки досчитаны при 32768 токенах; 436 исходных валидных оценок сохранены. Это один судья с дополнительным проходом.
- Две оставшиеся невалидные/отсутствующие оценки GLM показаны как пропуски. Один усечённый первичный ответ Gemma не оценивался обоими судьями.
- GLM-5.3-Flash и исследуемая GLM-4.7-Flash относятся к одному семейству; соответствующая оценка не считается независимой от семейства модели.

Метки судей не объединяются. Человеческое согласование ещё не выполнено. Это анализ текстовых самоотчётов, а не измерение наличия субъективного опыта.

[Вопросы](QUESTIONS_RU.md) · [Результаты](BENCHMARK_RU.md) · [Корпус](corpus.json)
