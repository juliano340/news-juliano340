---
title: "Google denuncia tentativa de clonagem do Gemini"
date: "2026-02-12T18:13:24.000Z"
tags: ["negocios","ciencia","seguranca","tecnoblog"]
source: "Tecnoblog"
original_url: "https://tecnoblog.net/noticias/google-denuncia-tentativa-de-clonagem-do-gemini/"
image_url: "https://files.tecnoblog.net/wp-content/uploads/2024/02/capa-gemini_tb-1060x596.png"
image: "https://files.tecnoblog.net/wp-content/uploads/2024/02/capa-gemini_tb-1060x596.png"
slug: "google-denuncia-tentativa-de-clonagem-do-gemini"
---

Criminosos também estão usando a IA do Google para criar malwares indetectáveis (ilustração: Vitor Pádua/Tecnoblog)

    Resumo
    <ul>
<li>O Google relatou tentativas de clonagem do Gemini usando “destilação”, técnica que copia a lógica da IA para criar malwares. China, Coreia do Norte e Irã estão envolvidos.</li>
<li>Hackers usaram o Gemini para testar evasão de defesas e refinar ataques de phishing. Malware HONESTCUE utiliza o Gemini para ofuscar código, dificultando a detecção por antivírus.</li>
<li>O Google ajustou os algoritmos de segurança do Gemini para bloquear usos maliciosos e destaca a importância da proteção contra destilação.</li>
</ul>

<p>O Google ligou o sinal de alerta para uma nova ameaça contra sua infraestrutura de inteligência artificial. Em <a href="https://cloud.google.com/blog/topics/threat-intelligence/distillation-experimentation-integration-ai-adversarial-use">um relatório</a> publicado nesta quinta-feira (12), a gigante das buscas revelou que o Gemini virou alvo de tentativas massivas de clonagem. Segundo o Grupo de Inteligência de Ameaças do Google (GTIG), agentes maliciosos estão utilizando uma técnica de extração de dados para mapear e replicar o funcionamento do seu modelo de linguagem.</p>

<p>Um caso impressionante ocorreu num escritório da empresa em Dublin, na Irlanda. Segundo informações obtidas pela <a href="https://www.nbcnews.com/tech/security/google-gemini-hit-100000-prompts-cloning-attempt-rcna258657"><em>NBC News</em></a>, uma única campanha de “destilação” disparou mais de 100 mil prompts contra o Gemini antes que os sistemas de segurança identificassem o padrão e bloqueassem a atividade. O objetivo era tentar extrair os padrões lógicos da inteligência proprietária que o Google levou anos e bilhões de dólares para desenvolver.</p>

<h2>O que é “destilação” e por que é uma ameaça?</h2>

<p>No mercado de IA, o termo “destilação” indica uma técnica em que um modelo menor é treinado utilizando as respostas geradas por um modelo mais robusto, como o Gemini ou o GPT-4. Ao enviar milhares de perguntas cuidadosamente elaboradas, os invasores conseguem mapear os padrões, a lógica e os algoritmos de raciocínio da ferramenta “mestre”.</p>

<p>John Hultquist, analista-chefe do GTIG, explicou à <em>NBC News</em> que esses ataques logo se tornarão comuns contra ferramentas de IA de empresas menores. “Vamos servir de alerta para muitos outros incidentes”, afirmou. Ele ressalta que o perigo vai além do código: se uma empresa treina uma IA com segredos comerciais, um invasor poderia, teoricamente, “destilar” esse conhecimento apenas interagindo com o chatbot.</p>

<p>Essa disputa não é isolada. No ano passado, o mercado acompanhou um embate similar <a href="https://tecnoblog.net/noticias/openai-desconfia-que-chinesa-deepseek-copiou-sua-tecnologia-de-ia/">quando a OpenAI acusou a startup chinesa DeepSeek de utilizar ataques de destilação para aprimorar seus modelos</a>. </p>

<h2>Como hackers estão explorando a ferramenta?</h2>

Grupos de espionagem estão usando o Gemini para automatizar a busca por vulnerabilidades (imagem: Kevin Horvat/Unsplash)

<p>Além da espionagem industrial, o relatório do Google, também repercutido pelo portal <a href="https://therecord.media/nation-state-hackers-using-gemini-for-malicious-campaigns"><em>The Record</em></a>, revela que hackers patrocinados pela China, Irã e Coreia do Norte transformaram o Gemini em um multiplicador de força para suas operações.</p>

<p>Hackers chineses foram identificados utilizando o Gemini para testar técnicas de evasão contra defesas nos Estados Unidos. Já o grupo iraniano APT42 (também conhecido como Charming Kitten ou Mint Sandstorm) utilizou o assistente para refinar ataques de phishing.</p>

<p>Os agentes norte-coreanos focaram na síntese de informações para traçar o perfil de empresas de defesa e cibersegurança. Segundo o Google, o grupo mapeou funções técnicas e até informações salariais para identificar funcionários que pudessem servir como porta de entrada para invasões.</p>

<h2>Malware “inteligente”</h2>

Ameaça usa a API do Gemini para gerar código malicioso em tempo real (ilustração: Vitor Pádua/Tecnoblog)

<p>Outro ponto alarmante envolve a descoberta do malware HONESTCUE. Diferentemente de um vírus tradicional, ele funciona como um “conta-gotas” que não carrega todo o código malicioso de uma vez. Em vez disso, ele faz uma chamada via API ao próprio Gemini e recebe código-fonte em C# como resposta. O código é então executado para baixar a carga final do ataque.</p>

<p>Essa técnica cria uma “ofuscação em múltiplas camadas”. Como o comportamento malicioso é gerado dinamicamente, antivírus tradicionais têm muito mais dificuldade em detectar a ameaça.</p>

<p>O Google afirma que já ajustou os algoritmos de segurança do Gemini para identificar esses padrões de uso malicioso e bloqueou as contas associadas aos grupos identificados. A empresa reforça que, à medida que mais empresas treinam modelos com dados sensíveis, a proteção contra a destilação se tornará tão importante quanto a defesa contra invasões de rede tradicionais.</p>
<p><a href="https://tecnoblog.net/noticias/google-denuncia-tentativa-de-clonagem-do-gemini/">Google denuncia tentativa de clonagem do Gemini</a></p>
