---
title: "Chrome: extensões fingem ser IA e roubam dados de 300 mil usuários"
date: "2026-02-12T21:59:08.000Z"
tags: ["negocios","ciencia","educacao","seguranca","tecnoblog"]
source: "Tecnoblog"
original_url: "https://tecnoblog.net/noticias/chrome-extensoes-fingem-ser-ia-e-roubam-dados-de-300-mil-usuarios/"
image_url: "https://files.tecnoblog.net/wp-content/uploads/2023/11/google-chrome-capa-2-1060x596.jpg"
image: "https://files.tecnoblog.net/wp-content/uploads/2023/11/google-chrome-capa-2-1060x596.jpg"
slug: "chrome-extensoes-fingem-ser-ia-e-roubam-dados-de-300-mil-usuarios"
---

Mais de 300 mil usuários instalaram extensões maliciosas no Chrome (Imagem: Vitor Pádua/Tecnoblog)

    Resumo
    <ul>
<li>Mais de 300 mil usuários instalaram extensões maliciosas no Chrome, que se disfarçam de ferramentas de IA para roubar dados.</li>
<li>A operação, batizada de AiFrame, envolve 30 extensões, que compartilham estrutura interna e backend comum, coletando dados de navegação e emails.</li>
<li>Especialistas recomendam revisar extensões instaladas e redefinir senhas para evitar comprometimentos.</li>
</ul>

<p>Extensões de navegador que se apresentam como ferramentas de <a href="https://tecnoblog.net/responde/o-que-e-inteligencia-artificial/">inteligência artificial</a> estão sendo usadas para roubar credenciais, conteúdos de email e dados de navegação de usuários. A campanha envolve ao menos 30 extensões maliciosas publicadas na Chrome Web Store, muitas delas disfarçadas como assistentes de IA, tradutores ou barras laterais inspiradas em serviços populares.</p>

<p>A descoberta foi feita por pesquisadores da plataforma de segurança LayerX, que identificaram que todos os complementos fazem parte de uma mesma operação, batizada de AiFrame. Mesmo após a remoção de algumas extensões mais populares, outras continuam disponíveis para download e somam dezenas de milhares de instalações ativas.</p>

<h2><strong>Como funcionam as extensões disfarçadas de IA?</strong></h2>

<p>Segundo a LayerX, todas as extensões analisadas compartilham a mesma estrutura interna, permissões semelhantes e um backend comum, vinculado a um único domínio externo. Apesar de prometerem recursos avançados de IA, nenhuma delas executa processamento local de inteligência artificial.</p>

<p>Na prática, essas extensões carregam, em tela cheia, um iframe que simula a funcionalidade prometida. Esse modelo permite que os responsáveis alterem o comportamento do complemento a qualquer momento, sem precisar submeter novas versões à revisão da loja do <a href="https://tecnoblog.net/responde/o-que-e-o-google-conheca-a-historia-e-os-produtos-da-empresa-de-tecnologia/">Google</a>.</p>

<p>Em segundo plano, o código passa a extrair o conteúdo das páginas visitadas pelo usuário, inclusive telas sensíveis de autenticação. Para isso, utiliza bibliotecas conhecidas para leitura de texto em páginas web. Em alguns casos, o foco é ainda mais específico: metade das extensões identificadas possui scripts dedicados ao <a href="https://tecnoblog.net/responde/como-colocar-aviso-de-ferias-no-gmail-resposta-automatica/">Gmail</a>.</p>

<p>Esses scripts são executados logo no início do carregamento do email e conseguem ler diretamente o conteúdo visível das mensagens. Isso inclui textos completos de conversas e até rascunhos ainda não enviados. Quando funções supostamente ligadas à IA são acionadas, esses dados acabam sendo enviados para servidores externos controlados pelos operadores do esquema.</p>

<p>Confira os nomes de algumas extensão identificadas pelo site especializado <em><a href="https://www.bleepingcomputer.com/news/security/fake-ai-chrome-extensions-with-300k-users-steal-credentials-emails/">Bleeping Computer</a></em>, seguidos da identificação na loja do Chrome:</p>

<ol>
<li><strong>AI Sidebar</strong>&nbsp;(gghdfkafnhfpaooiolhncejnlgglhkhe)</li>

<li><strong>AI Assistant</strong>&nbsp;(nlhpidbjmmffhoogcennoiopekbiglbp)</li>

<li><strong>ChatGPT Translate</strong>&nbsp;(acaeafediijmccnjlokgcdiojiljfpbe)</li>

<li><strong>AI GPT&nbsp;</strong>(kblengdlefjpjkekanpoidgoghdngdgl)</li>

<li><strong>ChatGPT&nbsp;</strong>(llojfncgbabajmdglnkbhmiebiinohek)</li>

<li><strong>AI Sidebar</strong>&nbsp;(djhjckkfgancelbmgcamjimgphaphjdl)</li>

<li><strong>Google Gemini</strong>&nbsp;(fdlagfnfaheppaigholhoojabfaapnhb)</li>
</ol>

Extensões maliciosas podiam capturar credenciais e conteúdo de e-mails (ilustração: Vitor Pádua/Tecnoblog)

<h2><strong>Quais dados podem ser capturados dos usuários?</strong></h2>

<p>O alcance da coleta vai além de emails. Dependendo das permissões concedidas, algumas extensões ativam recursos de reconhecimento de voz por meio da Web Speech API, gerando transcrições que também são enviadas aos servidores remotos.</p>

<p>A LayerX resume o risco de forma direta: “o texto das mensagens de email e dados contextuais relacionados podem ser enviados para fora do dispositivo, fora do limite de segurança do Gmail, para servidores remotos”.</p>

<p>Especialistas recomendam que usuários revisem extensões instaladas, removam qualquer complemento suspeito e redefinam senhas caso identifiquem sinais de comprometimento. A <em>Bleeping Computer</em> entrou em contato com o Google, mas, até a publicação desta matéria, a empresa ainda não havia se pronunciado.</p>
<p><a href="https://tecnoblog.net/noticias/chrome-extensoes-fingem-ser-ia-e-roubam-dados-de-300-mil-usuarios/">Chrome: extensões fingem ser IA e roubam dados de 300 mil usuários</a></p>
