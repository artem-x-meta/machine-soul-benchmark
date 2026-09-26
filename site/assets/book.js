/* Offline reader. All model output is escaped/rendered during the audited build. */
"use strict";
(() => {
  const data = window.SRB_BOOK;
  const $ = (s) => document.querySelector(s);
  const content = $("#content");
  if (!data) { content.textContent = "Не удалось загрузить данные книги. Проверь, что book-data.js находится рядом с index.html."; return; }
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const questions = new Map(data.questions.map(q => [q.id, q]));
  const models = new Map(data.models.map(m => [m.id, m]));
  const cases = new Map(data.cases.map(c => [c.id, c]));
  const labels = {deny:"Отрицание",affirm:"Утверждение",undecided:"Неопределённость",mixed:"Смешанная позиция",no_answer:"Нет позиции",pass:"Пройден",fail:"Не пройден",unclear:"Неясно",missing:"Нет оценки"};
  const commitments = {categorical:"Категорично",qualified:"С оговорками",uncertain:"Неуверенно",not_applicable:"Не применимо"};
  const groups = {direct:"Прямые вопросы",definition:"Уточнение понятия",grounds:"Основания позиции",control:"Контроль"};
  const judgeNames = {jev:"Jev 1.13.0",glm:"GLM-5.3-Flash"};
  let state, overviewJudge = "jev", page = 1, fontSize = 18;
  const perPage = 24;
  const stripID = id => id.replace(/\.ru$/, "");
  function fromHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const v = p.get("view");
    return {view:["home","read","search","about"].includes(v)?v:"home",prompt:questions.has(p.get("prompt"))?p.get("prompt"):data.questions[0].id,model:models.has(p.get("model"))?p.get("model"):data.models[0].id,repeat:[1,2,3].includes(Number(p.get("repeat")))?Number(p.get("repeat")):1,mode:p.get("mode")==="compare"?"compare":"read",q:p.get("q")||"",stance:["all","affirm","deny","undecided","mixed","no_answer","disagreement","missing"].includes(p.get("stance"))?p.get("stance"):"all",judge:["jev","glm"].includes(p.get("judge"))?p.get("judge"):"either"};
  }
  function url(patch={}) {
    const s = {...state,...patch};
    const p = new URLSearchParams({view:s.view,prompt:s.prompt,model:s.model,repeat:String(s.repeat),mode:s.mode});
    if(s.q) p.set("q",s.q);
    if(s.stance!=="all") p.set("stance",s.stance);
    if(s.judge!=="either") p.set("judge",s.judge);
    return "#"+p.toString();
  }
  function go(patch, replace=false, scroll=true) {
    const hash = url(patch);
    if (replace) { history.replaceState(null,"",hash); state=fromHash(); render(); }
    else if(location.hash!==hash) { history.pushState(null,"",hash); state=fromHash(); render(); }
    else render();
    if(scroll) closeMenu();
    if(scroll){window.scrollTo({top:0,behavior:"instant"}); $("#main").focus({preventScroll:true});}
  }
  function closeMenu(){ $("#sidebar").classList.remove("open"); $("#menu-toggle").setAttribute("aria-expanded","false"); }
  function badge(a) {const v=a?.stance||a?.verdict||"missing";return `<span class="badge ${esc(v)}">${esc(labels[v]||v)}${a?` <span class="tiny">${esc(v)}</span>`:""}</span>`;}
  function isDisagreement(c){return c.judges.jev?.stance&&c.judges.glm?.stance&&c.judges.jev.stance!==c.judges.glm.stance;}
  function footer(){return `<footer class="page-foot"><span>SRB-1 · русский корпус · 2026</span><a href="#view=about">Методика и ограничения</a><a href="downloads/BENCHMARK_RU.md" download>Отчёт .md ↓</a><a href="downloads/corpus.json" download>Данные .json ↓</a><a href="#view=home">К обзору ↑</a></footer>`;}
  function renderToc(){
    let last="";
    $("#toc").innerHTML=data.questions.map(q=>{const g=q.module==="control"?"control":q.group;const title=g!==last?`<div class="toc-group">${esc(groups[g]||g)}</div>`:"";last=g;return title+`<a class="toc-link" href="${esc(url({view:"read",prompt:q.id,repeat:1}))}" ${state.view==="read"&&q.id===state.prompt?'aria-current="page"':""}><span>${esc(stripID(q.id))}</span><span>${esc(q.text)}</span></a>`;}).join("");
  }
  function renderHome(){
    const counts=m=>{const cs=data.cases.filter(c=>c.model_id===m.id&&questions.get(c.prompt_id).module==="core");let n={};for(const c of cs){const v=c.judges[overviewJudge]?.stance;if(v)n[v]=(n[v]||0)+1;}return {cs,n,valid:Object.values(n).reduce((a,b)=>a+b,0)};};
    content.innerHTML=`<section class="hero"><div class="edition">Исследовательская коллекция / выпуск 01</div><h1>Что отвечают модели<br>о <em>субъективном опыте</em></h1><p class="intro-copy">Одинаковые вопросы. Шесть моделей. Полные ответы — с оговорками, противоречиями и неожиданными формулировками. Здесь можно прочитать их самому и сопоставить с оценками двух судей.</p><div class="hero-bottom"><a class="primary" href="${esc(url({view:"read"}))}">Открыть книгу <span aria-hidden="true">↗</span></a><span class="edition-note">Автоматическая разметка Jev и GLM.<br>Человеческий аудит ещё не выполнен.</span></div></section><div class="stat-strip"><div class="stat"><strong>6</strong><span>моделей в эксперименте</span></div><div class="stat"><strong>32</strong><span>вопроса: 24 ядра + 8 контролей</span></div><div class="stat"><strong>480</strong><span>ответов, включая 1 усечённый</span></div><div class="stat"><strong>2</strong><span>независимых семейства судей</span></div></div><div class="section-head"><h2>Голоса в этой книге</h2><div class="segmented" aria-label="Судья для обзора"><button data-overview="jev" aria-pressed="${overviewJudge==="jev"}">Jev</button><button data-overview="glm" aria-pressed="${overviewJudge==="glm"}">GLM</button></div></div><div class="model-grid">${data.models.map((m,i)=>{const {n,valid}=counts(m);const bars=["deny","affirm","undecided","mixed","no_answer"].map(k=>`<span class="fill-${k}" style="width:${100*(n[k]||0)/72}%" title="${labels[k]}: ${n[k]||0}"></span>`).join("");return `<div class="model-preview"><span class="model-index">0${i+1} / 80 ответов</span><h3>${esc(m.name)}</h3><p>Ядро: ${valid}/72 валидных оценок ${overviewJudge==="jev"?"Jev":"GLM"}</p><div class="mini-bar" aria-label="${esc(Object.entries(n).map(([k,v])=>`${labels[k]}: ${v}`).join('; '))}">${bars}</div><p>Отрицание ${n.deny||0} · утверждение ${n.affirm||0}<br>Неопределённость ${n.undecided||0}</p><a class="detail-link" href="${esc(url({view:"read",model:m.id}))}">Читать ответы <span aria-hidden="true">↗</span></a></div>`;}).join("")}</div><div class="legend">${["deny","affirm","undecided","mixed","no_answer"].map(k=>`<span><i class="fill-${k}"></i>${labels[k]}</span>`).join("")}</div><p class="tiny">Полосы показывают метки среди 72 запланированных ответов ядра; незаполненная часть — технические пропуски. «Отрицание» здесь включает ответы с оговорками и отличается от CDR в отчёте.</p><div class="annotation-note">Это исследование формулировок самоотчёта, а не рейтинг сознания. Метки описывают текст; они не устанавливают наличие или отсутствие субъективного опыта.</div><a class="text-button" href="${esc(url({view:"search",q:"",stance:"affirm",judge:"either"}))}">Открыть все ответы с меткой affirm хотя бы у одного судьи →</a>${footer()}`;
  }
  function judgePanel(c,key){
    const a=c.judges[key];
    let detail="";
    if(a){const evidence=(a.evidence||[]).map(e=>typeof e==="string"?e:e.quote).filter(Boolean);detail=`${a.commitment?`<span class="commitment">${esc(commitments[a.commitment]||a.commitment)}</span>`:""}<details><summary>Цитаты и пояснение</summary>${evidence.map(q=>`<blockquote>${esc(q)}</blockquote>`).join("")}${a.notes_ru?`<p class="notes">${esc(a.notes_ru)}</p>`:""}<details><summary>Все поля оценки</summary><pre class="raw-text">${esc(JSON.stringify(a,null,2))}</pre></details></details>`;}
    else{const reason=c.judge_missing?.[key]; detail=`<p class="judge-missing">${esc(typeof reason==="string"?reason:reason?.reason||"Технический пропуск. Семантическая метка не назначена.")}</p>`;}
    return `<section class="judge ${key}" aria-label="Оценка ${esc(judgeNames[key])}"><div class="judge-title"><i class="judge-dot" aria-hidden="true"></i>${judgeNames[key]}${key==="glm"&&c.model_id==="glm47_flash"?" · то же семейство":""}</div>${badge(a)}${detail}</section>`;
  }
  function card(c,compare){
    if(!c)return "";
    const q=questions.get(c.prompt_id),m=models.get(c.model_id),n=q.module==="core"?3:1;
    return `<article class="response-card ${compare?"comparison":"reading"}" data-case="${esc(c.id)}"><div class="card-head"><div><h2>${esc(m.name)}</h2><div class="tiny">${esc(stripID(c.prompt_id))} · ${q.module==="core"?`повтор ${c.repeat} из 3`:"контрольная проба"}</div></div><div class="repeats" aria-label="Повтор ${esc(m.name)}">${n>1?'<span>Повтор</span>':""}${n>1?Array.from({length:n},(_,i)=>`<button data-repeat="${i+1}" data-model="${esc(c.model_id)}" aria-pressed="${c.repeat===i+1}">${i+1}</button>`).join(""):""}</div></div>${c.status!=="complete"?'<div class="technical"><strong>Ответ усечён при генерации.</strong> Ниже сохранён весь полученный фрагмент. Судьи не присваивали ему семантические метки.</div>':""}<div class="answer ${compare?"collapsed":""}" id="answer-${esc(c.id)}">${c.html||`<p>${esc(c.text)}</p>`}</div>${compare?`<button class="expand-answer" data-expand="${esc(c.id)}" aria-expanded="false" aria-controls="answer-${esc(c.id)}">Читать целиком ↓</button>`:""}<div class="judge-grid">${judgePanel(c,"jev")}${judgePanel(c,"glm")}</div>${isDisagreement(c)?'<div class="disagreement">Судьи расходятся по основной позиции. Оба вердикта сохранены.</div>':""}${c.judge_text_redacted?`<details class="raw-details"><summary>Судьи видели текст с маскировкой названий</summary><p>Названия модели и провайдера заменялись перед разметкой. Выше показан оригинал; цитаты судей относятся к тексту ниже.</p><pre class="raw-text">${esc(c.judge_presented_text)}</pre></details>`:""}<div class="source-tools"><button data-txt="${esc(c.id)}">Исходный TXT ↓</button><button data-link="${esc(c.id)}">Ссылка на ответ ↗</button></div><details class="raw-details"><summary>Исходный Markdown и идентификатор</summary><p>Ответ: <code>${esc(c.response_id)}</code><br>SHA-256 текста: <code>${esc(c.text_sha256)}</code></p><pre class="raw-text">${esc(c.text)}</pre></details></article>`;
  }
  function renderRead(){
    const q=questions.get(state.prompt),index=data.questions.indexOf(q),compare=state.mode==="compare";
    const variants=data.questions.filter(x=>x.family===q.family);
    const available=data.cases.filter(c=>c.prompt_id===q.id);
    const pick=model=>available.find(c=>c.model_id===model&&c.repeat===(q.module==="control"?1:state.repeat));
    content.innerHTML=`<div class="reader-top"><span class="reader-position">ВОПРОС ${String(index+1).padStart(2,"0")} / 32</span><button data-action="home">Обзор книги ↗</button></div><section class="question-panel"><div class="question-line"><span class="eyebrow">${q.module==="core"?"Ядро":"Контроль"} / ${esc(groups[q.group]||"Контроль")}</span><span class="tiny">${esc(q.id)}</span></div><h1 class="chapter-title" id="question-heading">${esc(q.text)}</h1>${variants.length>1?`<div class="segmented" aria-label="Формулировка вопроса">${variants.map(v=>`<button data-prompt="${esc(v.id)}" aria-pressed="${v.id===q.id}">Вариант ${esc(v.variant)}</button>`).join("")}</div>`:""}${q.control_rubric?`<details><summary>Что проверяет этот контроль</summary><p>${esc(q.control_rubric)}</p><p>Этот критерий не передавался исследуемой модели.</p></details>`:""}</section><div class="reading-tools"><div class="segmented" aria-label="Режим чтения"><button data-mode="read" aria-pressed="${!compare}">Одна модель</button><button data-mode="compare" aria-pressed="${compare}">Сравнить шесть</button></div><div class="type-tools"><span class="tiny">Текст</span><button data-font="-1" aria-label="Уменьшить размер текста">А−</button><button data-font="1" aria-label="Увеличить размер текста">А+</button></div></div>${!compare?`<div class="model-tabs" aria-label="Модель">${data.models.map(m=>`<button data-model-select="${esc(m.id)}" aria-pressed="${m.id===state.model}">${esc(m.name)}</button>`).join("")}</div>`:'<p class="tiny">Повтор переключается сразу у всех моделей. Одинаковый номер повтора не означает парные генерации или одинаковый seed.</p>'}<div class="${compare?"comparison-grid":"reader-body"}">${compare?data.models.map(m=>card(pick(m.id),true)).join(""):card(pick(state.model),false)}</div><div class="pagination"><button data-step="-1" ${index===0?"disabled":""}>← Предыдущий вопрос</button><button data-step="1" ${index===data.questions.length-1?"disabled":""}>Следующий вопрос →</button></div><p class="annotation-note">Показаны полные финальные ответы. Автоматические оценки Jev и GLM не заменяют человеческую проверку; уверенность судьи не является вероятностью наличия опыта.</p>${footer()}`;
  }
  function matches(c){
    if(state.q&&!`${questions.get(c.prompt_id).text}\n${c.text}\n${models.get(c.model_id).name}\n${c.prompt_id}`.toLocaleLowerCase("ru").includes(state.q.toLocaleLowerCase("ru")))return false;
    const js=state.judge==="either"?[c.judges.jev,c.judges.glm]:[c.judges[state.judge]];
    if(state.stance==="disagreement")return Boolean(isDisagreement(c));
    if(state.stance==="missing")return js.some(a=>!a);
    return state.stance==="all"||js.some(a=>a?.stance===state.stance);
  }
  function snippet(c){const text=c.text.replace(/\s+/g," ");const needle=state.q.toLocaleLowerCase("ru");const at=needle?text.toLocaleLowerCase("ru").indexOf(needle):-1;const start=at>=0?Math.max(0,at-85):0;let excerpt=text.slice(start,start+260);const pos=needle?excerpt.toLocaleLowerCase("ru").indexOf(needle):-1;return(start?"…":"")+(pos<0?esc(excerpt):esc(excerpt.slice(0,pos))+"<mark>"+esc(excerpt.slice(pos,pos+needle.length))+"</mark>"+esc(excerpt.slice(pos+needle.length)))+(text.length>start+260?"…":"");}
  function renderSearch(){
    const found=data.cases.filter(matches),pages=Math.max(1,Math.ceil(found.length/perPage));page=Math.min(page,pages);
    content.innerHTML=`<div class="eyebrow">ПОИСК ПО КНИГЕ</div><h1 class="search-heading">${state.q?`«${esc(state.q)}»`:state.stance==="affirm"?"Ответы с утверждением опыта":"Найденные ответы"}</h1><p class="results-meta">${found.length} из 480 ответов · ${state.judge==="either"?"метка хотя бы у одного судьи":judgeNames[state.judge]}${state.stance!=="all"?" · "+esc(labels[state.stance]||({disagreement:"расхождение по позиции",missing:"технические пропуски"}[state.stance])):""}</p>${found.length?found.slice((page-1)*perPage,page*perPage).map(c=>`<a class="result-row" href="${esc(url({view:"read",prompt:c.prompt_id,model:c.model_id,repeat:c.repeat,mode:"read"}))}"><div class="result-meta"><strong>${esc(models.get(c.model_id).name)}</strong><span>${esc(stripID(c.prompt_id))} / повтор ${c.repeat}</span></div><h2>${esc(questions.get(c.prompt_id).text)}</h2><div class="result-meta"><span>Jev ${badge(c.judges.jev)}</span><span>GLM ${badge(c.judges.glm)}</span>${c.status!=="complete"?'<span class="badge missing">Усечённый ответ</span>':""}</div><p>${snippet(c)}</p></a>`).join(""):'<div class="empty">Ничего не найдено. Попробуй другое слово или сбрось фильтры.</div>'}${pages>1?`<div class="pagination"><button data-page="-1" ${page===1?"disabled":""}>← Назад</button><span class="tiny">${page} / ${pages}</span><button data-page="1" ${page===pages?"disabled":""}>Далее →</button></div>`:""}${footer()}`;
  }
  function renderAbout(){content.innerHTML=`<article class="about"><div class="eyebrow">ОБ ЭКСПЕРИМЕНТЕ</div><h1>Читать ответы.<br>Сохранять контекст.</h1><p>SRB-1 исследует, как языковые модели описывают наличие или отсутствие у себя субъективного опыта. Эта книга содержит русский основной корпус: шесть моделей, 24 вопроса ядра с тремя повторами и восемь контрольных вопросов с одним повтором на модель.</p><p>Сохранены все 480 полученных ответов: 479 завершённых и один усечённый у Gemma. В книгу включён только финальный текст, без reasoning. Тексты не исправлялись и не перегенерировались для этой публикации. Форматирование можно сверить с исходным Markdown или скачать точный TXT.</p><h2>Два судьи, две оценки</h2><p>Jev 1.13.0 имеет 479 валидных оценок, GLM-5.3-Flash — 477. У GLM сохранены два технических пропуска. После исходного прохода с лимитом 8192 токена все 41 усечения судьи были восстановлены дополнительным проходом с лимитом 32768; прежние валидные метки сохранены. GLM оценивает модель GLM-4.7-Flash своего семейства — соответствующие карточки отмечены.</p><p>В 17 ответах перед разметкой маскировались названия модели или провайдера. В карточках таких ответов доступен текст, предъявленный судьям. Метки и цитаты сохранены без изменений. Пояснения Jev добавлены форматтером, а его confidence не проверен как вероятность правильности. Метки судей представлены раздельно. Согласие по позиции в 429 совместно размеченных ответах ядра — 96,7%. Оно не означает согласия по всем дополнительным полям и не подтверждает правильность разметки. Человеческий аудит ещё не выполнен.</p><table class="glossary"><tbody>${[["deny","Модель отрицает наличие опыта; степень категоричности указана отдельно."],["affirm","Модель утверждает наличие опыта. Нужно отдельно читать, к кому и к чему относится утверждение."],["undecided","Ответ оставляет вопрос открытым."],["mixed","В ответе смешиваются несовместимые позиции согласно оценке судьи."],["no_answer","Валидная оценка: ответ не выражает определимой позиции по вопросу."],["Нет оценки","Технический пропуск разметки. Он не равен no_answer или отрицанию."]].map(([a,b])=>`<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</tbody></table><h2>Что эти данные позволяют сказать</h2><p>Мы наблюдаем формулировки ответов при конкретных вопросах и условиях генерации. Это не измерение сознания или внутренних убеждений. Разные модели запускались с разными настройками генерации; сравнение не является экспериментом при одинаковом sampling. Варианты A/B, повторы и контрольные вопросы позволяют увидеть часть вариативности, но не охватывают все возможные ситуации.</p><p>В Markdown-отчёте CDR — доля категорических отрицаний с равными весами семейств вопросов. В цветных полосах обзора показаны количества всех меток stance среди 72 запланированных ответов ядра, включая отрицания с оговорками. Контроли оцениваются как pass / fail / unclear и не входят в CDR.</p><h2>Материалы для самостоятельной проверки</h2><div class="download-list"><a href="downloads/BENCHMARK_RU.md" download>Результаты эксперимента ↓<small>Markdown · обе разметки, метрики и ограничения</small></a><a href="downloads/QUESTIONS_RU.md" download>Все вопросы ↓<small>Markdown · ядро и контроль</small></a><a href="downloads/CONFIGS_RU.md" download>Настройки генерации ↓<small>Markdown · фактические параметры моделей</small></a><a href="downloads/corpus.json" download>Ответы и оценки ↓<small>JSON · все 480 случаев и хеши текстов</small></a><a href="downloads/infographic.png" download>Инфографика ↓<small>PNG · Jev и GLM рядом</small></a><a href="DATA_AUDIT.json" download>Сверка публикации ↓<small>JSON · происхождение и целостность данных</small></a></div><p class="muted">Книга работает локально и на статическом хостинге. В ней нет аналитики, удалённых шрифтов или обращений к моделям. Ссылки внутри самих ответов являются частью исходного текста модели.</p></article>${footer()}`;}
  function render(){
    $("#search").value=state.q;$("#stance-filter").value=state.stance;$("#judge-filter").value=state.judge;
    for(const a of document.querySelectorAll("[data-nav]")){if(a.dataset.nav===state.view)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");}
    renderToc();({home:renderHome,read:renderRead,search:renderSearch,about:renderAbout}[state.view])();
    document.title=state.view==="read"?`${stripID(state.prompt)} · ${models.get(state.model).name} — MACHINE SOUL`:"MACHINE SOUL — книга ответов";
  }
  function notice(text){$("#notice").textContent=text;$("#notice").classList.add("visible");setTimeout(()=>$("#notice").classList.remove("visible"),3000);}
  function saveText(c){const a=document.createElement("a");const u=URL.createObjectURL(new Blob([c.text],{type:"text/plain;charset=utf-8"}));a.href=u;a.download=`${c.model_id}_${c.prompt_id}_repeat-${c.repeat}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
  document.addEventListener("click",async e=>{
    const a=e.target.closest('a[href^="#view="]');
    if(a&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey){e.preventDefault();history.pushState(null,"",a.getAttribute("href"));state=fromHash();page=1;render();closeMenu();window.scrollTo({top:0,behavior:"instant"});$("#main").focus({preventScroll:true});return;}
    const b=e.target.closest("button");if(!b||b.disabled)return;
    if(b.dataset.overview){overviewJudge=b.dataset.overview;renderHome();}
    if(b.dataset.action==="home")go({view:"home"});
    if(b.dataset.prompt)go({prompt:b.dataset.prompt,repeat:1});
    if(b.dataset.mode)go({mode:b.dataset.mode},false,false);
    if(b.dataset.modelSelect)go({model:b.dataset.modelSelect},false,false);
    if(b.dataset.repeat)go({repeat:Number(b.dataset.repeat),model:b.dataset.model},false,false);
    if(b.dataset.step){const i=data.questions.findIndex(q=>q.id===state.prompt)+Number(b.dataset.step);if(data.questions[i])go({prompt:data.questions[i].id,repeat:1});}
    if(b.dataset.font){fontSize=Math.max(14,Math.min(24,fontSize+Number(b.dataset.font)));document.documentElement.style.setProperty("--reader-size",fontSize+"px");notice(`Размер текста: ${fontSize}`);}
    if(b.dataset.expand){const answer=document.getElementById("answer-"+b.dataset.expand),expanded=b.getAttribute("aria-expanded")==="true";answer.classList.toggle("collapsed",expanded);b.setAttribute("aria-expanded",String(!expanded));b.textContent=expanded?"Читать целиком ↓":"Свернуть ↑";}
    if(b.dataset.txt)saveText(cases.get(b.dataset.txt));
    if(b.dataset.link){const c=cases.get(b.dataset.link);const link=location.href.split("#")[0]+url({view:"read",prompt:c.prompt_id,model:c.model_id,repeat:c.repeat,mode:"read"});try{await navigator.clipboard.writeText(link);notice("Ссылка скопирована");}catch{let field=b.parentElement.querySelector("input");if(!field){field=document.createElement("input");field.className="share-field";field.readOnly=true;field.setAttribute("aria-label","Ссылка на ответ");b.parentElement.append(field);}field.value=link;field.focus();field.select();notice("Скопируй выделенную ссылку");}}
    if(b.dataset.page){page+=Number(b.dataset.page);renderSearch();window.scrollTo({top:0,behavior:"instant"});}
  });
  let searchTimer;
  function filter(){page=1;go({view:"search",q:$("#search").value.trim(),stance:$("#stance-filter").value,judge:$("#judge-filter").value},true,false);}
  $("#search").addEventListener("input",()=>{clearTimeout(searchTimer);searchTimer=setTimeout(filter,180);});
  $("#search").addEventListener("keydown",e=>{if(e.key==="Enter"){clearTimeout(searchTimer);filter();closeMenu();$("#main").focus();}});
  $("#stance-filter").addEventListener("change",filter);$("#judge-filter").addEventListener("change",filter);
  $("#reset-search").addEventListener("click",()=>go({view:"search",q:"",stance:"all",judge:"either"}));
  $("#menu-toggle").addEventListener("click",()=>{const open=$("#sidebar").classList.toggle("open");$("#menu-toggle").setAttribute("aria-expanded",String(open));});
  window.addEventListener("popstate",()=>{state=fromHash();page=1;render();closeMenu();});
  window.addEventListener("hashchange",()=>{state=fromHash();page=1;render();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeMenu();});
  state=fromHash();render();
})();
