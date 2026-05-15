class ScoreCalculator {
  constructor(vehicle) {
    this.vehicle = vehicle;
    this.breakdown = [];
    this.total = 0;
  }

  calcular() {
    this.breakdown = [];
    this.total = 0;

    this.avaliarFotos();
    this.avaliarDocumentacao();
    this.avaliarPreco();
    this.avaliarCondicoes();
    this.avaliarTempoPipeline();
    this.avaliarDados();
    this.avaliarEngajamento();

    const scoreFinal = Math.min(Math.round(this.total), 100);

    return {
      valor: scoreFinal,
      breakdown: this.breakdown,
      label: this.getLabel(scoreFinal),
      ultimoCalculo: new Date(),
    };
  }

  avaliarFotos() {
    const temFotos = (this.vehicle.fotos?.originais?.length || 0) > 0;
    const temFotoMelhorada = (this.vehicle.fotos?.melhoradas?.length || 0) > 0;
    const temFotoPrincipal = !!this.vehicle.fotos?.principal;

    let pontos = 0;
    if (temFotos) pontos += 10;
    if (temFotoMelhorada) pontos += 20;
    if (temFotoPrincipal) pontos += 5;

    this.addCriterio('Fotos Profissionais', pontos, 35, temFotos);
    this.total += pontos;
  }

  avaliarDocumentacao() {
    const docOk = this.vehicle.condicoes?.documentacao === 'ok';
    this.addCriterio('Documentação Regularizada', docOk ? 15 : 0, 15, docOk);
    this.total += docOk ? 15 : 0;
  }

  avaliarPreco() {
    const precoVenda = this.vehicle.precos?.venda || 0;
    const precoFipe = this.vehicle.precos?.fipeReferencia || 0;

    if (!precoFipe) {
      this.addCriterio('Preço Competitivo (vs FIPE)', 0, 10, false, 'FIPE não consultada');
      return;
    }

    const diferenca = ((precoVenda - precoFipe) / precoFipe) * 100;
    let pontos = 0;
    let msg = '';

    if (diferenca <= 0) { pontos = 10; msg = 'Abaixo da FIPE'; }
    else if (diferenca <= 10) { pontos = 10; msg = 'Até 10% acima'; }
    else if (diferenca <= 20) { pontos = 5; msg = '10-20% acima'; }
    else { pontos = 0; msg = 'Acima de 20% (caro)'; }

    this.addCriterio('Preço Competitivo', pontos, 10, pontos === 10, msg);
    this.total += pontos;
  }

  avaliarCondicoes() {
    const aceitaTroca = this.vehicle.condicoes?.aceitaTroca;
    const aceitaFinanciamento = this.vehicle.condicoes?.aceitaFinanciamento;

    this.addCriterio('Aceita Troca', aceitaTroca ? 8 : 0, 8, aceitaTroca);
    this.total += aceitaTroca ? 8 : 0;

    this.addCriterio('Aceita Financiamento', aceitaFinanciamento ? 7 : 0, 7, aceitaFinanciamento);
    this.total += aceitaFinanciamento ? 7 : 0;
  }

  avaliarTempoPipeline() {
    const dias = this.vehicle.pipeline?.diasNoPipeline || 0;
    let pontos = 0;
    let msg = '';

    if (dias <= 10) { pontos = 15; msg = 'Recém anunciado'; }
    else if (dias <= 20) { pontos = 8; msg = '10-20 dias'; }
    else { pontos = 0; msg = '+20 dias (atenção)'; }

    this.addCriterio('Tempo no Pipeline', pontos, 15, pontos === 15, msg);
    this.total += pontos;
  }

  avaliarDados() {
    const temObs = (this.vehicle.anuncio?.observacoes?.length || 0) > 10;
    const temDono = !!this.vehicle.proprietario?.nome;
    const temCidade = !!this.vehicle.proprietario?.cidade;

    let pontos = 0;
    if (temObs) pontos += 5;
    if (temDono) pontos += 3;
    if (temCidade) pontos += 2;

    this.addCriterio('Dados Completos', pontos, 10, pontos >= 8);
    this.total += pontos;
  }

  avaliarEngajamento() {
    const leads = this.vehicle.leads?.length || 0;
    const temLeads = leads > 0;
    const cliques = this.vehicle.anuncio?.cliques || 0;

    // Leads: ate 5 pontos
    let ptsLeads = 0;
    if (leads >= 3) ptsLeads = 5;
    else if (leads >= 1) ptsLeads = 3;

    // Cliques: ate 5 pontos
    let ptsCliques = 0;
    if (cliques >= 100) ptsCliques = 5;
    else if (cliques >= 50) ptsCliques = 3;
    else if (cliques >= 10) ptsCliques = 1;

    this.addCriterio('Interesse de Compradores', ptsLeads, 5, ptsLeads >= 3, `${leads} leads`);
    this.total += ptsLeads;

    this.addCriterio('Cliques no Anuncio', ptsCliques, 5, ptsCliques >= 3, `${cliques} cliques`);
    this.total += ptsCliques;
  }

  addCriterio(nome, pontos, maximo, atingido, observacao = '') {
    this.breakdown.push({ nome, pontos, maximo, atingido, observacao });
  }

  getLabel(score) {
    if (score >= 80) return 'Veículo Excelente';
    if (score >= 60) return 'Bom Potencial';
    if (score >= 40) return 'Atenção Necessária';
    return 'Crítico - Ação Urgente';
  }
}

module.exports = ScoreCalculator;
