# DataAves 🐔📊

**Plataforma de Verificação Preliminar e Análise Exploratória de Dados Experimentais em Avicultura.**

Desenvolvido para o **GEAVES** (Grupo de Estudos em Avicultura) da **Universidade Federal Rural de Pernambuco (UFRPE)**.

---

## 👨‍🔬 Autoria e Propriedade Intelectual

**Desenvolvedor/Autor:** Dr. Marcos Santos
**Instituição:** UFRPE / GEAVES
**Ano:** 2026

**Termos de Licença e Propriedade:**
1. **Uso Acadêmico:** Este software foi desenvolvido exclusivamente para fins acadêmicos, de pesquisa e extensão pelos membros, alunos e colaboradores do GEAVES/UFRPE.
2. **Distribuição e Modificação:** A propriedade intelectual pertence ao seu desenvolvedor. É estritamente proibida a reprodução, distribuição com fins comerciais, venda ou modificação estrutural do código-fonte sem a autorização expressa do Dr. Marcos Santos.
3. **Citação Obrigatória:** A utilização desta plataforma para o processamento de dados que resultem em publicações científicas (artigos, dissertações, teses, resumos em congressos) deve obrigatoriamente referenciar a ferramenta.
4. **Privacidade e Segurança dos Dados:** O DataAves é uma aplicação 100% *client-side* (executada inteiramente no navegador do usuário). Nenhum dado experimental carregado na plataforma é enviado para servidores externos ou armazenado em nuvem. A confidencialidade dos dados de pesquisa é integralmente garantida.

---

## 🚀 Funcionalidades Principais

* **Validação de Integridade:** Verificação automática de colunas obrigatórias, identificação de erros de formatação e padronização de siglas.
* **Estatística Descritiva:** Cálculo instantâneo de amostra (n), Média, Mediana, Desvio-Padrão (DP), Erro Padrão (EP), CV%, Mínimo e Máximo por Tratamento e Período.
* **Visualização Gráfica:** Geração de gráficos interativos (Barras, Linhas, Boxplot, Violino) com ajuste dinâmico de eixos automáticos e manuais.
* **Mapa de Calor (Pearson):** Matriz de correlação automática entre todas as variáveis presentes na planilha.
* **Geração de Relatórios:** Exportação de tabelas estatísticas em formato Excel (`.xlsx`) e geração de Relatórios Técnicos completos em formato PDF, prontos para arquivamento ou anexação.

---

## 📋 Regras de Uso e Padronização (GEAVES)

Para garantir o funcionamento preciso dos algoritmos do DataAves, as planilhas (`.xlsx`) submetidas devem seguir rigorosamente o padrão estabelecido:

### 1. Estrutura Obrigatória de Colunas
* **TR:** Coluna indicando o Tratamento (numérico ou categórico). Deve ser a primeira coluna.
* **REP:** Coluna indicando a Repetição/Unidade Experimental (numérico).
* **PER:** Coluna indicando o Período/Fase (opcional, porém obrigatória caso o ensaio possua múltiplas fases temporais).
* **Variáveis:** As demais colunas devem conter as respostas mensuradas na unidade experimental.

### 2. Diretrizes de Preenchimento
1.  **Médias por Fase:** Insira apenas a média consolidada das repetições por fase experimental. Dados brutos diários individuais devem ser mantidos em planilhas separadas de controle.
2.  **Siglas Oficiais em Inglês:** Utilize estritamente o dicionário de siglas científicas do GEAVES (ex: `BWG` para Body Weight Gain, `FI` para Feed Intake, `HU` para Haugh Unit).
3.  **Caracteres Especiais:** É terminantemente proibido o uso de símbolos (%, $, *, °), espaços, barras ou acentuações nos cabeçalhos das colunas. Use *underline* (`_`) se necessário.
4.  **Parcelas Perdidas (Missing Data):** Em caso de mortalidade ou falha de leitura, a célula correspondente deve ser preenchida com o termo **`NA`**. Nunca deixe células em branco.
5.  **Ambiente Limpo:** A aba analisada deve conter estritamente a tabela de dados. Gráficos, anotações flutuantes, caixas de texto ou imagens inseridas na mesma aba causarão falha de leitura.
6.  **Categorização por Abas:** Separe variáveis de categorias distintas (Ex: Desempenho, Qualidade Óssea, Perfil Sanguíneo) em abas (sheets) diferentes dentro do mesmo arquivo Excel.

---

## 💻 Como Executar e Instalar

O DataAves não requer instalação de servidores ou banco de dados.
1. Extraia os arquivos da plataforma para uma pasta local no seu dispositivo.
2. Dê um duplo clique no arquivo `index.html` para executá-lo em seu navegador de preferência (Google Chrome, Mozilla Firefox ou Microsoft Edge).
3. Opcionalmente, pode ser configurado como PWA (Progressive Web App) para uso offline direto na granja ou laboratório.

---
*DataAves - Inovação e precisão estatística para a pesquisa avícola brasileira.*
