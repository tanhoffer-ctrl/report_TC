# Relatório Mensal — ABRC / Monthly Report — BWRA

Formulário web (estático) para o **relatório mensal dos profissionais da Seleção Brasileira de Rugby em Cadeira de Rodas**.
Static web form for the **monthly report of the Brazilian Wheelchair Rugby national team professionals**.

> ASSOCIAÇÃO BRASILEIRA DE RUGBY EM CADEIRA DE RODAS
> PROGRAMA NACIONAL DE RUGBY EM CADEIRA DE RODAS

---

## 🇧🇷 Sobre

O profissional acessa o formulário por um link, preenche no celular ou no computador, assina (desenhando ou enviando uma imagem), anexa 2 fotos das atividades e gera um **PDF** pronto para salvar e enviar por **e-mail** ou **WhatsApp** ao Coordenador de Alto Rendimento.

- **Sem backend, sem banco de dados, sem integrações.** Tudo acontece no navegador do usuário.
- **Bilíngue (Português / English)** com um seletor de idioma único no topo.
- O PDF é gerado no idioma selecionado.

### Idioma por link direto
- Português: `?lang=pt`
- English: `?lang=en`

Exemplo: `https://tanhoffer-ctrl.github.io/report_TC/?lang=en`
(a última escolha também fica salva no navegador do usuário)

### Recursos
- Seções fiéis ao documento original (Seção I, II e III).
- Perguntas condicionais: 1.2–1.7 e 2.2–2.6 só aparecem quando a resposta é **Sim**.
- **Assinatura**: desenhar com dedo/caneta/mouse **ou** enviar imagem (PNG/JPG/TIFF).
- **2 fotos** das atividades com pré-visualização.
- **Item 1.10 destacado** (documentos para a pasta do drive da ABRC).
- Instruções passo a passo (assinar, anexar fotos, salvar PDF, enviar) para **celular e PC**.

---

## 🇬🇧 About

The professional opens the form via a link, fills it in on a phone or computer, signs (by drawing or uploading an image), attaches 2 activity photos, and generates a **PDF** ready to save and send by **email** or **WhatsApp** to the High Performance Coordinator.

- **No backend, no database, no integrations.** Everything runs in the user's browser.
- **Bilingual (Portuguese / English)** with a single language switch at the top.
- The PDF is generated in the selected language.

---

## 🚀 Publicar com GitHub Pages / Publish with GitHub Pages

1. No GitHub, abra **Settings → Pages**.
2. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
3. Selecione a branch `main` e a pasta `/ (root)`. Salve.
4. Em instantes o site ficará disponível em:
   `https://tanhoffer-ctrl.github.io/report_TC/`

---

## 📁 Estrutura / Structure

```
report_TC/
├── index.html      # estrutura do formulário / form markup
├── styles.css      # estilos / styles
├── i18n.js         # textos PT e EN / PT & EN texts
├── app.js          # lógica: idioma, condicionais, assinatura, fotos, PDF
├── .nojekyll       # garante o servir correto no GitHub Pages
└── README.md
```

## 🔧 Observações técnicas / Technical notes

- A geração de PDF usa a biblioteca **jsPDF** carregada por CDN (com fallback para um segundo CDN). Se, excepcionalmente, não houver internet para carregar a biblioteca, o botão usa a impressão do navegador (**Salvar como PDF**) como alternativa.
- PDF generation uses **jsPDF** loaded from a CDN (with a second CDN fallback). If the library can't be loaded, the button falls back to the browser's print dialog (**Save as PDF**).
- Formatos de imagem exibíveis no navegador: PNG, JPG. TIFF é aceito para anexo/assinatura, mas não é pré-visualizado na tela (limitação dos navegadores) — ainda assim é registrado no PDF quando possível.
