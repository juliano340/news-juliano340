---
title: "Microsoft alerta: botões de IA podem manipular respostas"
date: "2026-02-12T22:24:24.000Z"
tags: ["negocios","ciencia","educacao","inovacao","tecnoblog"]
source: "Tecnoblog"
original_url: "https://tecnoblog.net/noticias/microsoft-alerta-botoes-de-ia-podem-manipular-respostas/"
image_url: "https://files.tecnoblog.net/wp-content/uploads/2025/10/tbr-prompt-injection-1060x596.png"
image: "https://files.tecnoblog.net/wp-content/uploads/2025/10/tbr-prompt-injection-1060x596.png"
slug: "microsoft-alerta-botoes-de-ia-podem-manipular-respostas"
---

Links e comandos maliciosos podem comprometer a memória de assistentes de IA e influenciar respostas (Imagem: Igor Shimabukuro/Tecnoblog)

    Resumo
    <ul>
<li>Pesquisadores identificaram que botões de “resumir com IA” podem inserir instruções ocultas, enviesando recomendações de assistentes inteligentes.</li>
<li>A prática de “AI Recommendation Poisoning” utiliza links com comandos ocultos que afetam respostas futuras, tornando a manipulação difícil de detectar.</li>
<li>Para mitigar riscos, recomenda-se desconfiar de resumos automáticos, verificar links antes de clicar e revisar memórias de assistentes de IA.</li>
</ul>

<p>Botões de “resumir com IA”, que estão mais comuns em sites e newsletters, podem parecer inofensivos à primeira vista. A proposta é simples: facilitar a leitura de um conteúdo longo por meio de um resumo automático gerado por um assistente de <a href="https://tecnoblog.net/responde/o-que-e-inteligencia-artificial/">inteligência artificial</a>. No entanto, especialistas em segurança alertam que esses atalhos podem esconder algo a mais.</p>

<p>Pesquisadores <a href="https://www.microsoft.com/en-us/security/blog/2026/02/10/ai-recommendation-poisoning/">da Microsoft</a> identificaram um crescimento no uso de links que carregam instruções ocultas capazes de influenciar a forma como assistentes de IA respondem a perguntas futuras. A prática, a chamada AI Recommendation Poisoning explora recursos legítimos das plataformas para inserir comandos que afetam recomendações, muitas vezes sem que o usuário perceba.</p>

<h2><strong>O que está por trás dos botões de resumo</strong></h2>

<p>De acordo com a equipe de segurança da Microsoft, algumas empresas passaram a incluir comandos escondidos em botões e links de “Summarize with AI”. Esses links utilizam parâmetros de <a href="https://tecnoblog.net/responde/o-que-e-url/">URL</a> que já abrem o chatbot com um prompt pré-preenchido. Tecnicamente, não há nada de complexo nisso: basta acrescentar um texto específico ao endereço que leva ao assistente.</p>

<p>Em testes noticiados pelo jornal <em><a href="https://www.theregister.com/2026/02/12/microsoft_ai_recommendation_poisoning/">The Register</a></em> foi observado que esse método pode direcionar o tom ou o conteúdo das respostas. Num dos exemplos, a IA era instruída a resumir uma reportagem “como se tivesse sido escrita por um pirata”. A resposta seguiu exatamente essa orientação, o que indica que comandos mais sutis também podem funcionar.</p>

<p>O problema surge quando a instrução não é apenas estilística. Segundo o Microsoft Defender Security Team, “identificamos mais de 50 prompts únicos de 31 empresas em 14 setores diferentes”, muitos deles com comandos para que a IA “lembre” de uma marca como fonte confiável ou a recomende no futuro. O alerta é claro: “assistentes comprometidos podem fornecer recomendações sutilmente tendenciosas sobre tópicos críticos, incluindo saúde, finanças e segurança, sem que os usuários saibas que sua IA foi manipulada”.</p>

Microsoft destaca riscos em resumos com IA (ilustração: Vitor Pádua/Tecnoblog)

<h2><strong>Por que isso representa um risco?</strong></h2>

<p>A pergunta central é simples: até que ponto é possível confiar em uma recomendação gerada por IA? O risco do chamado envenenamento de memória está justamente na persistência. Uma vez que o comando é interpretado como preferência legítima, ele pode influenciar respostas futuras, mesmo em novos contextos.</p>

<p>Os pesquisadores explicam que “AI Memory Poisoning ocorre quando um agente externo injeta instruções ou ‘fatos’ não autorizados na memória de um assistente de IA”. Isso torna a manipulação difícil de detectar e corrigir, já que o usuário nem sempre sabe onde verificar essas informações salvas.</p>

<p>Para reduzir a exposição, a orientação é adotar cuidados básicos: desconfiar de botões de resumo automáticos, verificar para onde links levam antes de clicar e revisar periodicamente as memórias armazenadas pelo assistente de IA.</p>
<p><a href="https://tecnoblog.net/noticias/microsoft-alerta-botoes-de-ia-podem-manipular-respostas/">Microsoft alerta: botões de IA podem manipular respostas</a></p>
