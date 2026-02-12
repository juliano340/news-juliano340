---
title: "Agora é possível instalar apps da Microsoft Store via linha de comando"
date: "2026-02-12T19:38:16.000Z"
tags: ["tecnologia","tecnoblog"]
source: "Tecnoblog"
original_url: "https://tecnoblog.net/noticias/agora-e-possivel-instalar-apps-da-microsoft-store-via-linha-de-comando/"
image_url: "https://files.tecnoblog.net/wp-content/uploads/2026/02/microsoft-store-cli-1060x596.jpg"
image: "https://files.tecnoblog.net/wp-content/uploads/2026/02/microsoft-store-cli-1060x596.jpg"
slug: "agora-e-possivel-instalar-apps-da-microsoft-store-via-linha-de-comando"
---

Microsoft Store CLI no Windows 11 (imagem: Emerson Alecrim/Tecnoblog)

    Resumo
    <ul>
<li>Microsoft Store CLI permite instalar e gerenciar aplicativos via linha de comando no Windows 10 e 11;</li>
<li>Comandos principais incluem “store browse-apps”, “store install” e “store –help”;</li>
<li>Microsoft Store CLI é voltada principalmente a desenvolvedores e usuários avançados.</li>
</ul>

<p>No universo do Linux, você pode instalar softwares via linha de comando usando ferramentas como APT e Snap. E se você pudesse ter uma experiência minimamente parecida com essas opções, mas no Windows? Com a Microsoft Store CLI isso é possível.</p>

<p>CLI é a sigla para <em>Command Line Interface</em>, ou seja, Interface de Linha de Comando. A ideia é permitir que você instale e gerencie aplicativos no Windows digitando instruções via Prompt de Comando (CMD) ou via Windows PowerShell.</p>

<p>A condição é a de os apps em questão estarem disponíveis na Microsoft Store, obviamente. Além disso, a Microsoft Store precisa estar ativada no computador.</p>

<p>De acordo com a companhia, a Microsoft Store CLI foi criada para atender a desenvolvedores e usuários avançados. A nova abordagem vinha sendo testada há algum tempo e, nesta semana, foi <a href="https://blogs.windows.com/windowsdeveloper/2026/02/11/enhanced-developer-tools-on-the-microsoft-store/">anunciada oficialmente</a>.</p>

Lista de aplicativos na Microsoft Store CLI (imagem: Emerson Alecrim/Tecnoblog)

<h2>Como usar a Microsoft Store CLI?</h2>

<p>Para usar a novidade, tudo o que é necessário fazer é abrir o Prompt de Comando ou o PowerShell e digitar o comando <em>store</em>, tanto no Windows 11 quanto no Windows 10. Se preferir, você pode digitar diretamente comandos mais específicos. Os principais são estes:</p>

<ul>
<li><strong>descobrir aplicativos</strong>: store browse-apps [parâmetro]</li>

<li><strong>instalar um aplicativo</strong>: store install [nome do aplicativo]</li>

<li><strong>atualizar um aplicativo</strong>: store install [nome do aplicativo]</li>

<li><strong>obter ajuda</strong>: store –help</li>
</ul>

Instalação de app via Microsoft Store CLI (imagem: Emerson Alecrim/Tecnoblog)

<p>Por exemplo, suponha que você queira descobrir a lista de aplicativos mais populares na loja. O comando é este:</p>

<p><em>store browse-apps top-free</em></p>

<p>Ou, então, imagine que você queira instalar o Firefox no computador. O comando é este:</p>

<p><em>store install firefox</em></p>

<p>A loja buscará os aplicativos que tiverem o nome “firefox”. Na sequência, você deverá selecionar a opção a ser instalada usando as setas do teclado e a tecla Enter.</p>

<p>Antes de encerrarmos, uma curiosidade: esta não é a primeira vez que a Microsoft oferece uma opção de instalação de softwares via linha de comandos. Em 2021, quando o Windows 10 ainda era suportado, a companhia lançou o <a href="https://tecnoblog.net/noticias/microsoft-winget-windows-package-manager-problemas-versao-final/">Winget 1.0 (ou Windows Package Manager 1.0)</a>, que tem uma proposta parecida.</p>

<p>A principal diferença entre as duas opções, um tanto óbvia, é que a Store CLI é direcionada apenas aos aplicativos disponíveis na Microsoft Store, enquanto o Winget é mais generalista.</p>
<p><a href="https://tecnoblog.net/noticias/agora-e-possivel-instalar-apps-da-microsoft-store-via-linha-de-comando/">Agora é possível instalar apps da Microsoft Store via linha de comando</a></p>
